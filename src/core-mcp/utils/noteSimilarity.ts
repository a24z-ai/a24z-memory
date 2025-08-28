import { StoredNote } from '../store/notesStore';

export interface NoteSimilarity {
  note1: StoredNote;
  note2: StoredNote;
  score: number; // 0-1, higher = more similar
  reasons: string[];
}

export interface SimilarityThresholds {
  high: number; // 0.8+ - very similar
  medium: number; // 0.6-0.8 - somewhat similar
  low: number; // 0.4-0.6 - vaguely similar
}

/**
 * Calculate similarity between two notes based on multiple factors
 */
export function calculateNoteSimilarity(note1: StoredNote, note2: StoredNote): NoteSimilarity {
  const reasons: string[] = [];
  let score = 0;

  // 1. Content similarity (40% weight)
  const contentSimilarity = calculateContentSimilarity(note1.note, note2.note);
  if (contentSimilarity > 0.7) {
    score += 0.4 * contentSimilarity;
    reasons.push(`Content similarity: ${(contentSimilarity * 100).toFixed(0)}%`);
  }

  // 2. Anchor overlap (30% weight)
  const anchorSimilarity = calculateAnchorSimilarity(note1.anchors, note2.anchors);
  if (anchorSimilarity > 0) {
    score += 0.3 * anchorSimilarity;
    reasons.push(`Anchor overlap: ${(anchorSimilarity * 100).toFixed(0)}%`);
  }

  // 3. Tag overlap (20% weight)
  const tagSimilarity = calculateTagSimilarity(note1.tags, note2.tags);
  if (tagSimilarity > 0) {
    score += 0.2 * tagSimilarity;
    reasons.push(`Tag overlap: ${(tagSimilarity * 100).toFixed(0)}%`);
  }

  // 4. Type match (5% weight)
  if (note1.type === note2.type) {
    score += 0.05;
    reasons.push('Same type');
  }

  return {
    note1,
    note2,
    score: Math.min(score, 1), // Cap at 1.0
    reasons,
  };
}

/**
 * Simple content similarity using text comparison
 * In a real implementation, you'd want to use embeddings or more sophisticated NLP
 */
function calculateContentSimilarity(text1: string, text2: string): number {
  // Normalize text for comparison
  const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();

  const t1 = normalize(text1);
  const t2 = normalize(text2);

  if (t1 === t2) return 1.0;

  // Simple Jaccard similarity on words
  const words1 = new Set(t1.split(' '));
  const words2 = new Set(t2.split(' '));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Calculate anchor (file path) similarity
 */
function calculateAnchorSimilarity(anchors1: string[], anchors2: string[]): number {
  if (anchors1.length === 0 || anchors2.length === 0) return 0;

  const set1 = new Set(anchors1);
  const set2 = new Set(anchors2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Calculate tag similarity
 */
function calculateTagSimilarity(tags1: string[], tags2: string[]): number {
  if (tags1.length === 0 || tags2.length === 0) return 0;

  const set1 = new Set(tags1);
  const set2 = new Set(tags2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Find all similar note pairs in a collection
 */
export function findSimilarNotePairs(
  notes: StoredNote[],
  threshold: number = 0.6
): NoteSimilarity[] {
  const similarities: NoteSimilarity[] = [];

  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const similarity = calculateNoteSimilarity(notes[i], notes[j]);
      if (similarity.score >= threshold) {
        similarities.push(similarity);
      }
    }
  }

  // Sort by similarity score (highest first)
  return similarities.sort((a, b) => b.score - a.score);
}

/**
 * Group notes by similarity clusters
 */
export function clusterSimilarNotes(notes: StoredNote[], threshold: number = 0.6): StoredNote[][] {
  const similarities = findSimilarNotePairs(notes, threshold);
  const clusters: StoredNote[][] = [];

  // Simple clustering: put directly similar notes together
  const processed = new Set<string>();

  for (const similarity of similarities) {
    const note1Id = similarity.note1.id;
    const note2Id = similarity.note2.id;

    if (processed.has(note1Id) || processed.has(note2Id)) {
      continue;
    }

    // Find existing cluster for note1
    let cluster1 = clusters.find((c) => c.some((n) => n.id === note1Id));
    let cluster2 = clusters.find((c) => c.some((n) => n.id === note2Id));

    if (cluster1 && cluster2) {
      // Merge clusters
      if (cluster1 !== cluster2) {
        cluster1.push(...cluster2);
        clusters.splice(clusters.indexOf(cluster2), 1);
      }
    } else if (cluster1) {
      cluster1.push(similarity.note2);
    } else if (cluster2) {
      cluster2.push(similarity.note1);
    } else {
      // Create new cluster
      clusters.push([similarity.note1, similarity.note2]);
    }

    processed.add(note1Id);
    processed.add(note2Id);
  }

  // Add remaining unclustered notes as singletons
  for (const note of notes) {
    if (!processed.has(note.id)) {
      const existingCluster = clusters.find((c) => c.some((n) => n.id === note.id));
      if (!existingCluster) {
        clusters.push([note]);
      }
    }
  }

  return clusters.sort((a, b) => b.length - a.length); // Sort by cluster size
}

/**
 * Default similarity thresholds
 */
export const DEFAULT_THRESHOLDS: SimilarityThresholds = {
  high: 0.8,
  medium: 0.6,
  low: 0.4,
};

/**
 * Check if a note is stale based on age
 */
export function isNoteStale(note: StoredNote, maxAgeDays: number = 365): boolean {
  const ageDays = (Date.now() - note.timestamp) / (1000 * 60 * 60 * 24);
  return ageDays > maxAgeDays;
}
