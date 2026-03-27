import { describe, it, expect } from "vitest";
import {
  buildTaskPositionUpdates,
  formatDurationMinutes,
  formatRemainingMs,
  getTimerRemainingMs,
  isTimerExpired,
  sanitizeCompletionNote,
  validateTaskTimer,
  normalizeTimerStatus,
  normalizeTimerOutcome,
  normalizeDurationMinutes,
  formatTaskTimerLabel,
} from "./tasks";

describe("validateTaskTimer", () => {
  it("allows an idle task with duration only", () => {
    expect(validateTaskTimer({ durationMinutes: 60, timerStatus: "idle" })).toBeNull();
  });

  it("rejects invalid running timer dates", () => {
    expect(
      validateTaskTimer({
        durationMinutes: 30,
        timerStatus: "running",
        timerStartedAt: "2026-03-26T10:00:00.000Z",
        timerEndsAt: "2026-03-26T09:59:00.000Z",
      })
    ).toBe("Timer end must be after timer start");
  });

  it("rejects running timer without start/end", () => {
    expect(
      validateTaskTimer({ timerStatus: "running" })
    ).toBe("Running timers need a start and end time");
  });

  it("rejects zero or negative duration", () => {
    expect(validateTaskTimer({ durationMinutes: 0 })).toBe("Duration must be greater than 0");
    expect(validateTaskTimer({ durationMinutes: -5 })).toBe("Duration must be greater than 0");
  });

  it("allows valid running timer", () => {
    expect(
      validateTaskTimer({
        durationMinutes: 30,
        timerStatus: "running",
        timerStartedAt: "2026-03-26T10:00:00.000Z",
        timerEndsAt: "2026-03-26T10:30:00.000Z",
      })
    ).toBeNull();
  });
});

describe("formatDurationMinutes", () => {
  it("returns compact labels", () => {
    expect(formatDurationMinutes(45)).toBe("45m");
    expect(formatDurationMinutes(90)).toBe("1h 30m");
  });

  it("handles exact hours", () => {
    expect(formatDurationMinutes(60)).toBe("1h");
    expect(formatDurationMinutes(120)).toBe("2h");
  });

  it("returns null for invalid values", () => {
    expect(formatDurationMinutes(null)).toBeNull();
    expect(formatDurationMinutes(undefined)).toBeNull();
    expect(formatDurationMinutes(0)).toBeNull();
  });
});

describe("timer helpers", () => {
  const now = new Date("2026-03-26T10:00:00.000Z");

  it("computes remaining time", () => {
    const activeTimer = {
      timerStatus: "running",
      timerEndsAt: "2026-03-26T10:05:00.000Z",
    };
    expect(getTimerRemainingMs(activeTimer, now)).toBe(5 * 60 * 1000);
  });

  it("detects non-expired timer", () => {
    expect(
      isTimerExpired({ timerStatus: "running", timerEndsAt: "2026-03-26T10:05:00.000Z" }, now)
    ).toBe(false);
  });

  it("detects expired timer", () => {
    expect(
      isTimerExpired({ timerStatus: "running", timerEndsAt: "2026-03-26T09:59:59.000Z" }, now)
    ).toBe(true);
  });

  it("returns 0 remaining when no end time", () => {
    expect(getTimerRemainingMs({ timerStatus: "idle" })).toBe(0);
  });
});

describe("formatRemainingMs", () => {
  it("renders clock output for minutes", () => {
    expect(formatRemainingMs(90 * 1000)).toBe("1:30");
  });

  it("renders clock output with hours", () => {
    expect(formatRemainingMs((60 * 60 + 5 * 60 + 9) * 1000)).toBe("1:05:09");
  });

  it("handles zero", () => {
    expect(formatRemainingMs(0)).toBe("0:00");
  });
});

describe("sanitizeCompletionNote", () => {
  it("trims whitespace", () => {
    expect(sanitizeCompletionNote("  solved 2 medium problems  ")).toBe("solved 2 medium problems");
  });

  it("collapses empty values to null", () => {
    expect(sanitizeCompletionNote("   ")).toBeNull();
    expect(sanitizeCompletionNote(null)).toBeNull();
    expect(sanitizeCompletionNote(undefined)).toBeNull();
  });
});

describe("buildTaskPositionUpdates", () => {
  it("returns sequential positions", () => {
    expect(
      buildTaskPositionUpdates(
        ["b", "a"],
        [
          { id: "a", position: 0 },
          { id: "b", position: 1 },
        ]
      )
    ).toEqual([
      { id: "b", position: 0 },
      { id: "a", position: 1 },
    ]);
  });

  it("returns null for mismatched task IDs", () => {
    expect(
      buildTaskPositionUpdates(
        ["b"],
        [
          { id: "a", position: 0 },
          { id: "b", position: 1 },
        ]
      )
    ).toBeNull();
  });

  it("deduplicates task IDs", () => {
    expect(
      buildTaskPositionUpdates(
        ["a", "a", "b"],
        [
          { id: "a", position: 0 },
          { id: "b", position: 1 },
        ]
      )
    ).toEqual([
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ]);
  });
});

describe("normalizeTimerStatus", () => {
  it("returns valid statuses as-is", () => {
    expect(normalizeTimerStatus("running")).toBe("running");
    expect(normalizeTimerStatus("paused")).toBe("paused");
  });

  it("defaults to idle for invalid values", () => {
    expect(normalizeTimerStatus(null)).toBe("idle");
    expect(normalizeTimerStatus("invalid")).toBe("idle");
  });
});

describe("normalizeTimerOutcome", () => {
  it("returns valid outcomes as-is", () => {
    expect(normalizeTimerOutcome("completed")).toBe("completed");
    expect(normalizeTimerOutcome("extended")).toBe("extended");
    expect(normalizeTimerOutcome("not_done")).toBe("not_done");
  });

  it("defaults to null for invalid values", () => {
    expect(normalizeTimerOutcome(null)).toBeNull();
    expect(normalizeTimerOutcome("wrong")).toBeNull();
  });
});

describe("normalizeDurationMinutes", () => {
  it("truncates decimal values", () => {
    expect(normalizeDurationMinutes(30.7)).toBe(30);
  });

  it("returns null for non-numbers", () => {
    expect(normalizeDurationMinutes(null)).toBeNull();
    expect(normalizeDurationMinutes(undefined)).toBeNull();
  });
});

describe("formatTaskTimerLabel", () => {
  const now = new Date("2026-03-26T10:00:00.000Z");

  it("shows remaining time for running timer", () => {
    expect(
      formatTaskTimerLabel(
        { durationMinutes: 30, timerStatus: "running", timerEndsAt: "2026-03-26T10:05:00.000Z" },
        now
      )
    ).toBe("5:00");
  });

  it("shows duration label for idle timer", () => {
    expect(formatTaskTimerLabel({ durationMinutes: 45, timerStatus: "idle" }, now)).toBe("45m");
  });
});
