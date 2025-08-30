import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizeRepositoryPath } from './pathNormalization';

export interface DocumentationQuestInstructions {
  [questType: string]: string[];
}

export interface QuestConfigurationStatus {
  hasConfiguration: boolean;
  configPath: string;
  availableQuests: string[];
  hasRequestedQuest: boolean;
  requestedQuest?: string;
}

/**
 * Check if documentation quest instructions exist and what's configured
 */
export function checkQuestConfiguration(
  repositoryPath: string,
  requestedQuest?: string
): QuestConfigurationStatus {
  const repoPath = normalizeRepositoryPath(repositoryPath);
  const configPath = path.join(repoPath, '.a24z', 'documentation-quests.json');

  const status: QuestConfigurationStatus = {
    hasConfiguration: false,
    configPath,
    availableQuests: [],
    hasRequestedQuest: false,
    requestedQuest,
  };

  if (!fs.existsSync(configPath)) {
    return status;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const instructions = JSON.parse(content) as DocumentationQuestInstructions;

    // Get all configured quest types that have valid instructions
    for (const [questType, questInstructions] of Object.entries(instructions)) {
      // Skip metadata fields
      if (questType.startsWith('_')) continue;

      if (Array.isArray(questInstructions) && questInstructions.length > 0) {
        status.availableQuests.push(questType);
      }
    }

    status.hasConfiguration = status.availableQuests.length > 0;

    if (requestedQuest) {
      status.hasRequestedQuest = status.availableQuests.includes(requestedQuest);
    }
  } catch (error) {
    console.error('Error loading quest configuration:', error);
  }

  return status;
}

/**
 * Load documentation quest instructions from repository
 */
export function loadQuestInstructions(
  repositoryPath: string
): DocumentationQuestInstructions | null {
  const repoPath = normalizeRepositoryPath(repositoryPath);
  const instructionsPath = path.join(repoPath, '.a24z', 'documentation-quests.json');

  try {
    if (fs.existsSync(instructionsPath)) {
      const content = fs.readFileSync(instructionsPath, 'utf8');
      const instructions = JSON.parse(content) as DocumentationQuestInstructions;

      // Filter out metadata fields and return only valid quest instructions
      const validInstructions: DocumentationQuestInstructions = {};

      for (const [questType, questInstructions] of Object.entries(instructions)) {
        if (
          !questType.startsWith('_') &&
          Array.isArray(questInstructions) &&
          questInstructions.length > 0
        ) {
          validInstructions[questType] = questInstructions;
        }
      }

      return Object.keys(validInstructions).length > 0 ? validInstructions : null;
    }
  } catch (error) {
    console.error('Error loading quest instructions:', error);
  }

  return null;
}

/**
 * Get a random instruction for a quest type
 */
export function getRandomQuestInstruction(
  instructions: DocumentationQuestInstructions,
  questType: string
): string | null {
  const options = instructions[questType];
  if (!options || options.length === 0) {
    return null;
  }
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Create example documentation quest instructions file
 */
export function createExampleQuestFile(repositoryPath: string): void {
  const repoPath = normalizeRepositoryPath(repositoryPath);
  const a24zDir = path.join(repoPath, '.a24z');
  const instructionsPath = path.join(a24zDir, 'documentation-quests.json');

  // Ensure .a24z directory exists
  if (!fs.existsSync(a24zDir)) {
    fs.mkdirSync(a24zDir, { recursive: true });
  }

  const exampleQuests = {
    _comment: 'Configure documentation quest instructions for your repository.',
    _description: 'Each quest type should have an array of possible documentation tasks.',
    _note: 'Remove these comment fields and configure the quests for your team.',

    architecture: [
      'Document the key architectural decisions made in this file',
      'Explain why this design approach was chosen over alternatives',
      'Describe how this component fits into the overall system architecture',
    ],

    gotcha: [
      'Document any non-obvious behavior or edge cases',
      'Add notes about common mistakes when using this code',
      'Explain any surprising or counterintuitive aspects',
    ],

    api: [
      'Document the public API and its expected usage',
      'Add examples of how to use the main functions or classes',
      'Document parameter types, return values, and error conditions',
    ],

    onboarding: [
      'Explain what this file does in simple terms for new team members',
      'Document the main responsibilities and use cases',
      'Add context about when and why someone would modify this file',
    ],

    performance: [
      'Document any performance considerations or optimizations',
      'Note bottlenecks, scaling concerns, or resource usage',
      'Explain trade-offs made for performance reasons',
    ],

    refactor: [
      'Document technical debt or areas needing improvement',
      'Note deprecated patterns or code that should be updated',
      'Explain why certain approaches were used and what could be better',
    ],
  };

  fs.writeFileSync(instructionsPath, JSON.stringify(exampleQuests, null, 2), 'utf8');
}
