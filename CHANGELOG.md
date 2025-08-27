# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.4] - 2025-01-26

### Added

- **Note Review System**: New functionality for human review of AI-generated notes
  - Added `reviewed` field to track human review status (defaults to `false`)
  - Added `guidanceToken` field for token-based validation
  - New functions: `getUnreviewedNotes()`, `markNoteReviewed()`, `markAllNotesReviewed()`
  - Review history tracked through git commits

- **Guidance Token Validation**: Secure token system to ensure agents read guidance before creating notes
  - HMAC-based token generation with 24-hour expiration
  - Validates guidance content hasn't changed since token generation
  - Enable with environment variable: `A24Z_REQUIRE_GUIDANCE_TOKEN=true`
  - Stateless validation - no database required

- **Enhanced MCP Tools**
  - `GetRepositoryGuidanceTool` now returns guidance tokens for validation
  - `RepositoryNoteTool` validates tokens when required
  - Token included in structured response for programmatic access

### Changed

- OpenRouter integration no longer uses automatic provider selection
  - Explicit provider configuration now required via `defaultProvider` field
  - Removed provider priority system for clearer configuration

### Fixed

- Notes now properly default to `reviewed: false` when created
- Fixed TypeScript type exports for better library usage

## [0.5.3] - 2025-01-25

### Added

- Token-based limiting for `getNotesForPath` function
- Improved validation messages with typed data and persistence

## [0.5.2] - 2025-01-24

### Added

- Enhanced note synthesis capabilities

## [0.5.1] - 2025-01-23

### Fixed

- Bug fixes and performance improvements

## [0.5.0] - 2025-01-22

### Added

- Major feature release with OpenRouter integration
- Support for multiple LLM providers
- API key management system

## Earlier Versions

For changes prior to v0.5.0, please see the git commit history.
