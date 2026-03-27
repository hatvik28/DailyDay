import assert from "node:assert/strict";
import { buildHeatmapCells, buildHealthSummaries, buildMockInbox } from "./dashboard";
import {
  buildTaskPositionUpdates,
  formatDurationMinutes,
  formatRemainingMs,
  getTimerRemainingMs,
  isTimerExpired,
  sanitizeCompletionNote,
  validateTaskTimer,
} from "./tasks";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run("validateTaskTimer allows an idle task with duration only", () => {
  assert.equal(validateTaskTimer({ durationMinutes: 60, timerStatus: "idle" }), null);
});

run("validateTaskTimer rejects invalid running timer dates", () => {
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

run("formatDurationMinutes returns compact labels", () => {
  assert.equal(formatDurationMinutes(45), "45m");
  assert.equal(formatDurationMinutes(90), "1h 30m");
});

run("timer helpers compute remaining time and expiration", () => {
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

run("formatRemainingMs renders clock output", () => {
  assert.equal(formatRemainingMs(90 * 1000), "1:30");
  assert.equal(formatRemainingMs((60 * 60 + 5 * 60 + 9) * 1000), "1:05:09");
});

run("sanitizeCompletionNote trims and collapses empty values", () => {
  assert.equal(sanitizeCompletionNote("  solved 2 medium problems  "), "solved 2 medium problems");
  assert.equal(sanitizeCompletionNote("   "), null);
});

run("buildTaskPositionUpdates returns sequential positions", () => {
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

run("buildHeatmapCells fills missing dates and computes intensity", () => {
  const cells = buildHeatmapCells(
    [{ date: "2026-03-25", totalTasks: 4, completedTasks: 2 }],
    2,
    new Date("2026-03-26T12:00:00Z")
  );

  assert.deepEqual(cells, [
    {
      date: "2026-03-25",
      totalTasks: 4,
      completedTasks: 2,
      completionRate: 50,
      intensity: 3,
    },
    {
      date: "2026-03-26",
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      intensity: 0,
    },
  ]);
});

run("buildHealthSummaries returns actionable summaries from recent trends", () => {
  const summaries = buildHealthSummaries([
    { date: "2026-03-20", steps: 5000, stepGoal: 10000, sleepMinutes: 360, activeMinutes: 15, restingHeartRate: 60 },
    { date: "2026-03-21", steps: 5500, stepGoal: 10000, sleepMinutes: 390, activeMinutes: 20, restingHeartRate: 61 },
    { date: "2026-03-22", steps: 6000, stepGoal: 10000, sleepMinutes: 400, activeMinutes: 22, restingHeartRate: 62 },
    { date: "2026-03-23", steps: 5800, stepGoal: 10000, sleepMinutes: 395, activeMinutes: 18, restingHeartRate: 66 },
    { date: "2026-03-24", steps: 6200, stepGoal: 10000, sleepMinutes: 405, activeMinutes: 25, restingHeartRate: 66 },
    { date: "2026-03-25", steps: 6500, stepGoal: 10000, sleepMinutes: 410, activeMinutes: 24, restingHeartRate: 67 },
    { date: "2026-03-26", steps: 7000, stepGoal: 10000, sleepMinutes: 420, activeMinutes: 26, restingHeartRate: 67 },
  ]);

  assert.equal(summaries.length, 3);
  assert.equal(summaries[0]?.title, "Walk a little more");
  assert.equal(summaries[1]?.title, "Sleep needs attention");
  assert.equal(summaries[2]?.title, "Add more active minutes");
});

run("buildMockInbox returns a stable dashboard inbox MVP", () => {
  const items = buildMockInbox("2026-03-26");

  assert.equal(items.length, 4);
  assert.equal(items[0]?.tag, "Job App");
  assert.match(items[2]?.subject ?? "", /technical interview/i);
});

console.log("All tests passed.");
