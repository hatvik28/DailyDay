import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTaskPositionUpdates,
  formatDurationMinutes,
  formatRemainingMs,
  getTimerRemainingMs,
  isTimerExpired,
  sanitizeCompletionNote,
  validateTaskTimer,
} from "./tasks";

test("validateTaskTimer allows an idle task with duration only", () => {
  assert.equal(validateTaskTimer({ durationMinutes: 60, timerStatus: "idle" }), null);
});

test("validateTaskTimer rejects invalid running timer dates", () => {
  assert.equal(
    validateTaskTimer({
      durationMinutes: 30,
      timerStatus: "running",
      timerStartedAt: "2026-03-26T10:00:00.000Z",
      timerEndsAt: "2026-03-26T09:59:00.000Z",
    }),
    "Timer end must be after timer start"
  );
});

test("formatDurationMinutes returns compact labels", () => {
  assert.equal(formatDurationMinutes(45), "45m");
  assert.equal(formatDurationMinutes(90), "1h 30m");
});

test("timer helpers compute remaining time and expiration", () => {
  const now = new Date("2026-03-26T10:00:00.000Z");
  const activeTimer = {
    timerStatus: "running",
    timerEndsAt: "2026-03-26T10:05:00.000Z",
  };

  assert.equal(getTimerRemainingMs(activeTimer, now), 5 * 60 * 1000);
  assert.equal(isTimerExpired(activeTimer, now), false);
  assert.equal(
    isTimerExpired(
      { timerStatus: "running", timerEndsAt: "2026-03-26T09:59:59.000Z" },
      now
    ),
    true
  );
});

test("formatRemainingMs renders clock output", () => {
  assert.equal(formatRemainingMs(90 * 1000), "1:30");
  assert.equal(formatRemainingMs((60 * 60 + 5 * 60 + 9) * 1000), "1:05:09");
});

test("sanitizeCompletionNote trims and collapses empty values", () => {
  assert.equal(sanitizeCompletionNote("  solved 2 medium problems  "), "solved 2 medium problems");
  assert.equal(sanitizeCompletionNote("   "), null);
});

test("buildTaskPositionUpdates returns sequential positions", () => {
  assert.deepEqual(
    buildTaskPositionUpdates(
      ["b", "a"],
      [
        { id: "a", position: 0 },
        { id: "b", position: 1 },
      ]
    ),
    [
      { id: "b", position: 0 },
      { id: "a", position: 1 },
    ]
  );
});
