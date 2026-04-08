import { describe, it, expect } from "vitest";
import {
  DIFFICULTIES,
  TOPICS,
  LIST_TAGS,
  REVIEW_QUALITIES,
  isValidDifficulty,
  isValidTopic,
  isValidListTag,
  isValidReviewQuality,
  validateNeetcodeProblem,
  validateReviewInput,
  computeNextInterval,
  computeNextReviewDate,
  computeNeetcodeStats,
} from "./neetcode";

// ── Type guards ──

describe("isValidDifficulty", () => {
  it("accepts all valid difficulties", () => {
    for (const d of DIFFICULTIES) {
      expect(isValidDifficulty(d)).toBe(true);
    }
  });

  it("rejects invalid values", () => {
    expect(isValidDifficulty("extreme")).toBe(false);
    expect(isValidDifficulty("")).toBe(false);
    expect(isValidDifficulty(null)).toBe(false);
    expect(isValidDifficulty(42)).toBe(false);
  });
});

describe("isValidTopic", () => {
  it("accepts all valid topics", () => {
    for (const t of TOPICS) {
      expect(isValidTopic(t)).toBe(true);
    }
  });

  it("rejects invalid values", () => {
    expect(isValidTopic("sorting")).toBe(false);
    expect(isValidTopic(null)).toBe(false);
  });
});

describe("isValidListTag", () => {
  it("accepts all valid list tags", () => {
    for (const l of LIST_TAGS) {
      expect(isValidListTag(l)).toBe(true);
    }
  });

  it("rejects invalid values", () => {
    expect(isValidListTag("leetcode_75")).toBe(false);
  });
});

describe("isValidReviewQuality", () => {
  it("accepts all valid qualities", () => {
    for (const q of REVIEW_QUALITIES) {
      expect(isValidReviewQuality(q)).toBe(true);
    }
  });

  it("rejects invalid values", () => {
    expect(isValidReviewQuality("perfect")).toBe(false);
    expect(isValidReviewQuality(1)).toBe(false);
  });
});

// ── Validation ──

describe("validateNeetcodeProblem", () => {
  it("passes with valid title", () => {
    expect(validateNeetcodeProblem({ title: "Two Sum" })).toBeNull();
  });

  it("requires title", () => {
    expect(validateNeetcodeProblem({ title: "" })).toBe("Title is required");
    expect(validateNeetcodeProblem({ title: "  " })).toBe("Title is required");
  });

  it("rejects non-string title", () => {
    expect(validateNeetcodeProblem({ title: 123 as unknown as string })).toBe(
      "Title must be a string",
    );
  });

  it("requires title when undefined", () => {
    expect(validateNeetcodeProblem({})).toBe("Title is required");
  });

  it("rejects invalid difficulty", () => {
    const result = validateNeetcodeProblem({ title: "Two Sum", difficulty: "extreme" });
    expect(result).toContain("Invalid difficulty");
  });

  it("accepts valid difficulty", () => {
    expect(validateNeetcodeProblem({ title: "Two Sum", difficulty: "hard" })).toBeNull();
  });

  it("rejects invalid topic", () => {
    const result = validateNeetcodeProblem({ title: "Two Sum", topic: "sorting" });
    expect(result).toContain("Invalid topic");
  });

  it("rejects invalid list tag", () => {
    const result = validateNeetcodeProblem({ title: "Two Sum", listTag: "lc_300" });
    expect(result).toContain("Invalid list tag");
  });

  it("rejects negative time", () => {
    expect(validateNeetcodeProblem({ title: "Two Sum", timeMinutes: -5 })).toBe("Time cannot be negative");
  });

  it("rejects non-finite time", () => {
    expect(validateNeetcodeProblem({ title: "Two Sum", timeMinutes: Infinity })).toBe("Time must be a finite number");
  });

  it("rejects non-string url", () => {
    expect(validateNeetcodeProblem({ title: "Two Sum", url: 123 as unknown as string })).toBe("URL must be a string");
  });

  it("rejects non-string notes", () => {
    expect(validateNeetcodeProblem({ title: "Two Sum", notes: 123 as unknown as string })).toBe("Notes must be a string");
  });

  it("rejects non-boolean interviewReady", () => {
    expect(validateNeetcodeProblem({ title: "Two Sum", interviewReady: "yes" as unknown as boolean })).toBe("Interview ready must be a boolean");
  });

  it("accepts valid interviewReady", () => {
    expect(validateNeetcodeProblem({ title: "Two Sum", interviewReady: true })).toBeNull();
  });
});

describe("validateReviewInput", () => {
  it("passes with valid quality", () => {
    expect(validateReviewInput({ quality: "good" })).toBeNull();
  });

  it("requires quality", () => {
    expect(validateReviewInput({})).toBe("Quality rating is required");
    expect(validateReviewInput({ quality: "" })).toBe("Quality rating is required");
  });

  it("rejects invalid quality", () => {
    const result = validateReviewInput({ quality: "perfect" });
    expect(result).toContain("Invalid quality");
  });

  it("rejects negative time", () => {
    expect(validateReviewInput({ quality: "good", timeMinutes: -1 })).toBe("Time cannot be negative");
  });

  it("rejects non-finite time", () => {
    expect(validateReviewInput({ quality: "good", timeMinutes: NaN })).toBe("Time must be a finite number");
  });

  it("rejects non-string notes", () => {
    expect(validateReviewInput({ quality: "good", notes: 42 as unknown as string })).toBe("Notes must be a string");
  });
});

// ── Spaced repetition algorithm ──

describe("computeNextInterval", () => {
  it("returns base intervals for 'good' quality", () => {
    expect(computeNextInterval(1, "good")).toBe(1);
    expect(computeNextInterval(2, "good")).toBe(3);
    expect(computeNextInterval(3, "good")).toBe(7);
    expect(computeNextInterval(4, "good")).toBe(14);
    expect(computeNextInterval(5, "good")).toBe(30);
    expect(computeNextInterval(6, "good")).toBe(60);
  });

  it("halves intervals for 'hard' quality", () => {
    expect(computeNextInterval(1, "hard")).toBe(1); // max(1, round(1*0.5)) = 1
    expect(computeNextInterval(2, "hard")).toBe(2); // round(3*0.5) = 2
    expect(computeNextInterval(3, "hard")).toBe(4); // round(7*0.5) = 4
    expect(computeNextInterval(4, "hard")).toBe(7); // round(14*0.5) = 7
  });

  it("multiplies by 1.5 for 'easy' quality", () => {
    expect(computeNextInterval(1, "easy")).toBe(2);  // round(1*1.5) = 2
    expect(computeNextInterval(2, "easy")).toBe(5);  // round(3*1.5) = 5
    expect(computeNextInterval(3, "easy")).toBe(11); // round(7*1.5) = 11
  });

  it("caps at max interval for high review numbers", () => {
    expect(computeNextInterval(7, "good")).toBe(60);
    expect(computeNextInterval(10, "good")).toBe(60);
    expect(computeNextInterval(100, "good")).toBe(60);
  });

  it("never returns less than 1 day", () => {
    expect(computeNextInterval(1, "hard")).toBeGreaterThanOrEqual(1);
  });
});

describe("computeNextReviewDate", () => {
  it("adds interval days to the review date", () => {
    const reviewedAt = new Date("2026-01-01T00:00:00Z");
    const result = computeNextReviewDate(reviewedAt, 7);
    expect(result.toISOString().slice(0, 10)).toBe("2026-01-08");
  });

  it("does not mutate the input date", () => {
    const reviewedAt = new Date("2026-01-01T00:00:00Z");
    computeNextReviewDate(reviewedAt, 7);
    expect(reviewedAt.toISOString().slice(0, 10)).toBe("2026-01-01");
  });
});

// ── Stats ──

describe("computeNeetcodeStats", () => {
  it("returns zero stats for empty array", () => {
    const stats = computeNeetcodeStats([]);
    expect(stats.total).toBe(0);
    expect(stats.dueForReview).toBe(0);
    expect(stats.masteredCount).toBe(0);
    expect(stats.interviewReadyCount).toBe(0);
  });

  it("counts by difficulty", () => {
    const problems = [
      { difficulty: "easy", topic: "arrays_hashing", interviewReady: false, reviews: [] },
      { difficulty: "easy", topic: "trees", interviewReady: false, reviews: [] },
      { difficulty: "hard", topic: "graphs", interviewReady: false, reviews: [] },
    ];
    const stats = computeNeetcodeStats(problems);
    expect(stats.byDifficulty.easy).toBe(2);
    expect(stats.byDifficulty.hard).toBe(1);
    expect(stats.byDifficulty.medium).toBe(0);
  });

  it("counts by topic", () => {
    const problems = [
      { difficulty: "medium", topic: "trees", interviewReady: false, reviews: [] },
      { difficulty: "medium", topic: "trees", interviewReady: false, reviews: [] },
    ];
    const stats = computeNeetcodeStats(problems);
    expect(stats.byTopic.trees).toBe(2);
    expect(stats.byTopic.graphs).toBe(0);
  });

  it("marks problems without reviews as due", () => {
    const problems = [
      { difficulty: "easy", topic: "stack", interviewReady: false, reviews: [] },
    ];
    const stats = computeNeetcodeStats(problems);
    expect(stats.dueForReview).toBe(1);
  });

  it("marks problems with past nextReviewAt as due", () => {
    const problems = [
      {
        difficulty: "easy",
        topic: "stack",
        interviewReady: false,
        reviews: [{ nextReviewAt: "2020-01-01T00:00:00Z" }],
      },
    ];
    const stats = computeNeetcodeStats(problems);
    expect(stats.dueForReview).toBe(1);
  });

  it("does not count future reviews as due", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const problems = [
      {
        difficulty: "easy",
        topic: "stack",
        interviewReady: false,
        reviews: [{ nextReviewAt: future.toISOString() }],
      },
    ];
    const stats = computeNeetcodeStats(problems);
    expect(stats.dueForReview).toBe(0);
  });

  it("counts mastered problems (6+ reviews)", () => {
    const reviews = Array.from({ length: 6 }, () => ({
      nextReviewAt: new Date(Date.now() + 86400000 * 90).toISOString(),
    }));
    const problems = [
      { difficulty: "medium", topic: "two_pointers", interviewReady: false, reviews },
    ];
    const stats = computeNeetcodeStats(problems);
    expect(stats.masteredCount).toBe(1);
  });

  it("counts interview-ready and excludes from review queue", () => {
    const problems = [
      { difficulty: "easy", topic: "arrays_hashing", interviewReady: true, reviews: [] },
      { difficulty: "medium", topic: "trees", interviewReady: false, reviews: [] },
    ];
    const stats = computeNeetcodeStats(problems);
    expect(stats.interviewReadyCount).toBe(1);
    expect(stats.dueForReview).toBe(1); // only the non-ready one
  });
});
