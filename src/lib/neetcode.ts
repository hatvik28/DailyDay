/**
 * NeetCode spaced repetition types, constants, and algorithm.
 * Business logic layer — no Prisma or API concerns.
 */

// ── Difficulties ──

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  hard: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function isValidDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && DIFFICULTIES.includes(value as Difficulty);
}

// ── Topics (NeetCode 150 categories) ──

export const TOPICS = [
  "arrays_hashing",
  "two_pointers",
  "sliding_window",
  "stack",
  "binary_search",
  "linked_list",
  "trees",
  "tries",
  "heap_priority_queue",
  "backtracking",
  "graphs",
  "advanced_graphs",
  "one_d_dp",
  "two_d_dp",
  "greedy",
  "intervals",
  "math_geometry",
  "bit_manipulation",
] as const;

export type Topic = (typeof TOPICS)[number];

export const TOPIC_LABELS: Record<Topic, string> = {
  arrays_hashing: "Arrays & Hashing",
  two_pointers: "Two Pointers",
  sliding_window: "Sliding Window",
  stack: "Stack",
  binary_search: "Binary Search",
  linked_list: "Linked List",
  trees: "Trees",
  tries: "Tries",
  heap_priority_queue: "Heap / Priority Queue",
  backtracking: "Backtracking",
  graphs: "Graphs",
  advanced_graphs: "Advanced Graphs",
  one_d_dp: "1-D Dynamic Programming",
  two_d_dp: "2-D Dynamic Programming",
  greedy: "Greedy",
  intervals: "Intervals",
  math_geometry: "Math & Geometry",
  bit_manipulation: "Bit Manipulation",
};

export function isValidTopic(value: unknown): value is Topic {
  return typeof value === "string" && TOPICS.includes(value as Topic);
}

// ── List Tags ──

export const LIST_TAGS = ["neetcode_150", "blind_75", "custom"] as const;

export type ListTag = (typeof LIST_TAGS)[number];

export const LIST_TAG_LABELS: Record<ListTag, string> = {
  neetcode_150: "NeetCode 150",
  blind_75: "Blind 75",
  custom: "Custom",
};

export function isValidListTag(value: unknown): value is ListTag {
  return typeof value === "string" && LIST_TAGS.includes(value as ListTag);
}

// ── Review Quality ──

export const REVIEW_QUALITIES = ["hard", "good", "easy"] as const;

export type ReviewQuality = (typeof REVIEW_QUALITIES)[number];

export const REVIEW_QUALITY_LABELS: Record<ReviewQuality, string> = {
  hard: "Hard — Struggled",
  good: "Good — Got it",
  easy: "Easy — Nailed it",
};

export function isValidReviewQuality(value: unknown): value is ReviewQuality {
  return typeof value === "string" && REVIEW_QUALITIES.includes(value as ReviewQuality);
}

// ── Spaced Repetition Algorithm ──

/**
 * Base intervals in days for each review number (1-indexed).
 * Review 1 → 1 day, Review 2 → 3 days, Review 3 → 7 days, etc.
 * After review 6, intervals stay at 60 days.
 */
const BASE_INTERVALS = [1, 3, 7, 14, 30, 60];

/**
 * Multipliers applied to the base interval depending on how
 * well you did:
 *   hard  → 0.5x (review sooner)
 *   good  → 1.0x (normal schedule)
 *   easy  → 1.5x (push it out further)
 */
const QUALITY_MULTIPLIERS: Record<ReviewQuality, number> = {
  hard: 0.5,
  good: 1.0,
  easy: 1.5,
};

/**
 * Calculate the next review interval in days based on the review
 * number and how well the review went.
 *
 * @param reviewNumber - Which review this is (1 = first review)
 * @param quality      - How well the review went
 * @returns Number of days until the next review
 */
export function computeNextInterval(reviewNumber: number, quality: ReviewQuality): number {
  if (reviewNumber < 1) return 1;
  const index = Math.min(reviewNumber - 1, BASE_INTERVALS.length - 1);
  const baseInterval = BASE_INTERVALS[index];
  const multiplier = QUALITY_MULTIPLIERS[quality];
  return Math.max(1, Math.round(baseInterval * multiplier));
}

/**
 * Calculate the next review date by adding intervalDays to the
 * review date.
 */
export function computeNextReviewDate(reviewedAt: Date, intervalDays: number): Date {
  const next = new Date(reviewedAt);
  next.setDate(next.getDate() + intervalDays);
  return next;
}

// ── Validation ──

export interface NeetcodeProblemInput {
  title?: string;
  url?: string;
  difficulty?: string;
  topic?: string;
  listTag?: string;
  timeMinutes?: number | null;
  notes?: string;
  interviewReady?: boolean;
  solvedAt?: string;
}

export function validateNeetcodeProblem(input: NeetcodeProblemInput): string | null {
  if (!input || typeof input !== "object") return "Invalid input";
  if (input.title !== undefined && typeof input.title !== "string") return "Title must be a string";
  if (!input.title || !input.title.trim()) return "Title is required";
  if (input.url !== undefined && typeof input.url !== "string") return "URL must be a string";
  if (input.difficulty !== undefined && !isValidDifficulty(input.difficulty)) {
    return `Invalid difficulty. Must be one of: ${DIFFICULTIES.join(", ")}`;
  }
  if (input.topic !== undefined && !isValidTopic(input.topic)) {
    return `Invalid topic. Must be one of: ${TOPICS.join(", ")}`;
  }
  if (input.listTag !== undefined && !isValidListTag(input.listTag)) {
    return `Invalid list tag. Must be one of: ${LIST_TAGS.join(", ")}`;
  }
  if (input.timeMinutes != null) {
    if (typeof input.timeMinutes !== "number" || !Number.isFinite(input.timeMinutes)) {
      return "Time must be a finite number";
    }
    if (input.timeMinutes < 0) return "Time cannot be negative";
  }
  if (input.notes !== undefined && typeof input.notes !== "string") return "Notes must be a string";
  if (input.interviewReady !== undefined && typeof input.interviewReady !== "boolean") {
    return "Interview ready must be a boolean";
  }
  if (input.solvedAt !== undefined) {
    if (typeof input.solvedAt !== "string" || isNaN(Date.parse(input.solvedAt))) {
      return "solvedAt must be a valid date string";
    }
  }
  return null;
}

export interface ReviewInput {
  quality?: string;
  timeMinutes?: number | null;
  notes?: string;
}

export function validateReviewInput(input: ReviewInput): string | null {
  if (!input || typeof input !== "object") return "Invalid input";
  if (!input.quality) return "Quality rating is required";
  if (!isValidReviewQuality(input.quality)) {
    return `Invalid quality. Must be one of: ${REVIEW_QUALITIES.join(", ")}`;
  }
  if (input.timeMinutes != null) {
    if (typeof input.timeMinutes !== "number" || !Number.isFinite(input.timeMinutes)) {
      return "Time must be a finite number";
    }
    if (input.timeMinutes < 0) return "Time cannot be negative";
  }
  if (input.notes !== undefined && typeof input.notes !== "string") return "Notes must be a string";
  return null;
}

// ── Stats ──

export interface NeetcodeStats {
  total: number;
  byDifficulty: Record<Difficulty, number>;
  byTopic: Record<Topic, number>;
  dueForReview: number;
  masteredCount: number;
  interviewReadyCount: number;
}

export function computeNeetcodeStats(
  problems: { difficulty: string; topic: string; interviewReady: boolean; reviews: { nextReviewAt: Date | string }[] }[],
): NeetcodeStats {
  const byDifficulty = Object.fromEntries(DIFFICULTIES.map((d) => [d, 0])) as Record<Difficulty, number>;
  const byTopic = Object.fromEntries(TOPICS.map((t) => [t, 0])) as Record<Topic, number>;
  let dueForReview = 0;
  let masteredCount = 0;
  let interviewReadyCount = 0;
  const now = new Date();

  for (const problem of problems) {
    if (isValidDifficulty(problem.difficulty)) {
      byDifficulty[problem.difficulty]++;
    }
    if (isValidTopic(problem.topic)) {
      byTopic[problem.topic]++;
    }

    if (problem.interviewReady) {
      interviewReadyCount++;
      // Interview-ready problems are done — skip review logic
      continue;
    }

    if (problem.reviews.length === 0) {
      // Never reviewed yet — due for first review
      dueForReview++;
    } else {
      const latestReview = problem.reviews[problem.reviews.length - 1];
      const nextReview = new Date(latestReview.nextReviewAt);
      if (nextReview <= now) {
        dueForReview++;
      }
      // "Mastered" = completed 6+ reviews (reached max interval)
      if (problem.reviews.length >= 6) {
        masteredCount++;
      }
    }
  }

  return { total: problems.length, byDifficulty, byTopic, dueForReview, masteredCount, interviewReadyCount };
}
