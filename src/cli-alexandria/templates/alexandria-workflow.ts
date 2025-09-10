/**
 * Alexandria GitHub workflow template
 */

export function getAlexandriaWorkflowTemplate(): string {
  return `# Alexandria Registry GitHub Action
# 
# This workflow automatically registers and updates your Alexandria documentation
# when codebase views are added or modified.
#

name: Update Alexandria Documentation 

on:
  # Trigger on pull requests that modify views
  pull_request:
    paths:
      - '.alexandria/views/**'
    types: [opened, synchronize, reopened]
  
  # Trigger on pushes to the default branch
  push:
    branches:
      - main
    paths:
      - '.alexandria/views/**'

jobs:
  register-alexandria:
    runs-on: ubuntu-latest
    name: Update Alexandria Documentation
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          # Fetch the branch being worked on
          ref: \${{ github.event.pull_request.head.ref || github.ref }}

      - name: Determine branch context
        id: branch-context
        run: |
          # Get the default branch name
          DEFAULT_BRANCH="\${{ github.event.repository.default_branch }}"
          
          # Determine current branch
          if [ "\${{ github.event_name }}" = "pull_request" ]; then
            CURRENT_BRANCH="\${{ github.event.pull_request.head.ref }}"
            UPDATE_CONTEXT="pull_request"
          else
            CURRENT_BRANCH="\${{ github.ref_name }}"
            UPDATE_CONTEXT="push"
          fi
          
          # Check if we're on the default branch
          if [ "$CURRENT_BRANCH" = "$DEFAULT_BRANCH" ]; then
            IS_DEFAULT="true"
          else
            IS_DEFAULT="false"
          fi
          
          echo "current_branch=$CURRENT_BRANCH" >> $GITHUB_OUTPUT
          echo "is_default=$IS_DEFAULT" >> $GITHUB_OUTPUT
          echo "update_context=$UPDATE_CONTEXT" >> $GITHUB_OUTPUT
          echo "default_branch=$DEFAULT_BRANCH" >> $GITHUB_OUTPUT
          
          # Debug output
          echo "📊 Branch Context:"
          echo "  - Event: \${{ github.event_name }}"
          echo "  - Current Branch: $CURRENT_BRANCH"
          echo "  - Default Branch: $DEFAULT_BRANCH"
          echo "  - Is Default: $IS_DEFAULT"
          echo "  - Update Context: $UPDATE_CONTEXT"

      - name: Check for .alexandria/views directory
        id: check-views
        run: |
          if [ -d ".alexandria/views" ]; then
            echo "has_views=true" >> $GITHUB_OUTPUT
            VIEW_COUNT=$(find .alexandria/views -name "*.json" -type f | wc -l)
            echo "view_count=$VIEW_COUNT" >> $GITHUB_OUTPUT
            echo "✅ Found .alexandria/views/ directory with $VIEW_COUNT view(s)"
          else
            echo "has_views=false" >> $GITHUB_OUTPUT
            echo "view_count=0" >> $GITHUB_OUTPUT
            echo "ℹ️ No .alexandria/views/ directory found"
          fi

      - name: Register with Alexandria
        id: register
        env:
          ALEXANDRIA_API_URL: https://git-gallery.com/api/alexandria
        run: |
          echo "🚀 Registering with Alexandria..."
          
          # Prepare request body
          REQUEST_BODY=$(cat <<EOF
          {
            "owner": "\${{ github.repository_owner }}",
            "name": "\${{ github.event.repository.name }}",
            "branch": "\${{ steps.branch-context.outputs.current_branch }}",
            "isDefaultBranch": \${{ steps.branch-context.outputs.is_default }},
            "updateContext": "\${{ steps.branch-context.outputs.update_context }}"
          }
          EOF
          )
          
          echo "📝 Request body:"
          echo "$REQUEST_BODY" | jq .
          
          # Make the API call
          RESPONSE=$(curl -s -w "\\n%{http_code}" -X POST \\
            -H "Content-Type: application/json" \\
            -d "$REQUEST_BODY" \\
            "$ALEXANDRIA_API_URL/repos")
          
          # Extract status code and body
          HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
          BODY=$(echo "$RESPONSE" | head -n -1)
          
          echo "📨 Response (HTTP $HTTP_CODE):"
          echo "$BODY" | jq . || echo "$BODY"
          
          # Check if successful
          if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
            echo "✅ Successfully registered with Alexandria!"
            
            # Extract status from response
            STATUS=$(echo "$BODY" | jq -r '.repository.status // "unknown"')
            VIEW_COUNT=$(echo "$BODY" | jq -r '.repository.viewCount // 0')
            
            if [ "$STATUS" = "registered" ]; then
              echo "🎉 Repository newly registered with $VIEW_COUNT view(s)"
            elif [ "$STATUS" = "updated" ]; then
              echo "🔄 Repository updated with $VIEW_COUNT view(s)"
            elif [ "$STATUS" = "skipped" ]; then
              echo "⏭️ Update skipped (not from default branch or original PR)"
            fi
            
            # Set outputs for use in other steps
            echo "status=$STATUS" >> $GITHUB_OUTPUT
            echo "view_count=$VIEW_COUNT" >> $GITHUB_OUTPUT
          else
            echo "❌ Failed to register with Alexandria (HTTP $HTTP_CODE)"
            echo "Error details:"
            echo "$BODY" | jq '.error' || echo "$BODY"
            exit 1
          fi

      - name: Comment on PR (if applicable)
        if: github.event_name == 'pull_request' && steps.register.outputs.status != 'skipped'
        uses: actions/github-script@v7
        with:
          script: |
            const status = '\${{ steps.register.outputs.status }}';
            const viewCount = '\${{ steps.register.outputs.view_count }}';
            const branch = '\${{ steps.branch-context.outputs.current_branch }}';
            
            let message = '### 📚 Alexandria Registry Update\\n\\n';
            
            if (status === 'registered') {
              message += \`✅ Repository successfully registered with Alexandria!\\n\\n\`;
              message += \`- **Branch**: \\\`\${branch}\\\`\\n\`;
              message += \`- **Codebase Views**: \${viewCount}\\n\\n\`;
              message += \`Your codebase views will be available at [Alexandria](https://a24z-ai.github.io/alexandria) once this PR is merged.\`;
            } else if (status === 'updated') {
              message += \`🔄 Repository updated in Alexandria\\n\\n\`;
              message += \`- **Branch**: \\\`\${branch}\\\`\\n\`;
              message += \`- **Codebase Views**: \${viewCount}\\n\\n\`;
              message += \`View your codebase at [Alexandria](https://a24z-ai.github.io/alexandria).\`;
            }
            
            // Check if we already commented
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            
            const botComment = comments.find(comment => 
              comment.user.type === 'Bot' && 
              comment.body.includes('Alexandria Registry Update')
            );
            
            if (botComment) {
              // Update existing comment
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body: message
              });
            } else {
              // Create new comment
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: message
              });
            }

      - name: Summary
        if: always()
        run: |
          echo "## 📊 Alexandria Registration Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Property | Value |" >> $GITHUB_STEP_SUMMARY
          echo "|----------|-------|" >> $GITHUB_STEP_SUMMARY
          echo "| Repository | \${{ github.repository }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Branch | \${{ steps.branch-context.outputs.current_branch }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Is Default Branch | \${{ steps.branch-context.outputs.is_default }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Event Type | \${{ github.event_name }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Has Views | \${{ steps.check-views.outputs.has_views }} |" >> $GITHUB_STEP_SUMMARY
          echo "| View Count | \${{ steps.check-views.outputs.view_count }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Registration Status | \${{ steps.register.outputs.status || 'Failed' }} |" >> $GITHUB_STEP_SUMMARY`;
}
