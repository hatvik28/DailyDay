import test from "node:test";
import assert from "node:assert/strict";
import { buildHeatmapCells, buildHealthSummaries, buildMockInbox } from "./dashboard";

test("buildHeatmapCells fills missing dates and computes intensity", () => {
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

test("buildHealthSummaries returns actionable summaries from recent trends", () => {
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

test("buildMockInbox returns a stable dashboard inbox MVP", () => {
  const items = buildMockInbox("2026-03-26");

  assert.equal(items.length, 4);
  assert.equal(items[0]?.tag, "Job App");
  assert.match(items[2]?.subject ?? "", /technical interview/i);
});
