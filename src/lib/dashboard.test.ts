import { describe, it, expect } from "vitest";
import { buildHeatmapCells, buildHealthSummaries, buildMockInbox } from "./dashboard";

describe("buildHeatmapCells", () => {
  it("fills missing dates and computes intensity", () => {
    const cells = buildHeatmapCells(
      [{ date: "2026-03-25", totalTasks: 4, completedTasks: 2 }],
      2,
      new Date("2026-03-26T12:00:00Z")
    );

    expect(cells).toEqual([
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

  it("returns empty cells when no data exists", () => {
    const cells = buildHeatmapCells([], 3, new Date("2026-03-26T12:00:00Z"));
    expect(cells).toHaveLength(3);
    expect(cells.every((c) => c.intensity === 0)).toBe(true);
  });

  it("assigns correct intensity levels", () => {
    const cells = buildHeatmapCells(
      [
        { date: "2026-03-24", totalTasks: 10, completedTasks: 1 },  // 10% → intensity 1
        { date: "2026-03-25", totalTasks: 10, completedTasks: 4 },  // 40% → intensity 2
        { date: "2026-03-26", totalTasks: 10, completedTasks: 9 },  // 90% → intensity 4
      ],
      3,
      new Date("2026-03-26T12:00:00Z")
    );

    expect(cells[0].intensity).toBe(1);
    expect(cells[1].intensity).toBe(2);
    expect(cells[2].intensity).toBe(4);
  });
});

describe("buildHealthSummaries", () => {
  it("returns actionable summaries from recent trends", () => {
    const summaries = buildHealthSummaries([
      { date: "2026-03-20", steps: 5000, stepGoal: 10000, sleepMinutes: 360, activeMinutes: 15, restingHeartRate: 60 },
      { date: "2026-03-21", steps: 5500, stepGoal: 10000, sleepMinutes: 390, activeMinutes: 20, restingHeartRate: 61 },
      { date: "2026-03-22", steps: 6000, stepGoal: 10000, sleepMinutes: 400, activeMinutes: 22, restingHeartRate: 62 },
      { date: "2026-03-23", steps: 5800, stepGoal: 10000, sleepMinutes: 395, activeMinutes: 18, restingHeartRate: 66 },
      { date: "2026-03-24", steps: 6200, stepGoal: 10000, sleepMinutes: 405, activeMinutes: 25, restingHeartRate: 66 },
      { date: "2026-03-25", steps: 6500, stepGoal: 10000, sleepMinutes: 410, activeMinutes: 24, restingHeartRate: 67 },
      { date: "2026-03-26", steps: 7000, stepGoal: 10000, sleepMinutes: 420, activeMinutes: 26, restingHeartRate: 67 },
    ]);

    expect(summaries).toHaveLength(3);
    expect(summaries[0]?.title).toBe("Walk a little more");
    expect(summaries[1]?.title).toBe("Sleep needs attention");
    expect(summaries[2]?.title).toBe("Add more active minutes");
  });

  it("returns positive summaries when health is good", () => {
    const summaries = buildHealthSummaries([
      { date: "2026-03-20", steps: 12000, stepGoal: 10000, sleepMinutes: 480, activeMinutes: 45, restingHeartRate: 55 },
      { date: "2026-03-21", steps: 11000, stepGoal: 10000, sleepMinutes: 450, activeMinutes: 40, restingHeartRate: 55 },
      { date: "2026-03-22", steps: 13000, stepGoal: 10000, sleepMinutes: 470, activeMinutes: 50, restingHeartRate: 56 },
      { date: "2026-03-23", steps: 10500, stepGoal: 10000, sleepMinutes: 460, activeMinutes: 35, restingHeartRate: 55 },
    ]);

    expect(summaries[0]?.title).toBe("Movement is consistent");
    expect(summaries[1]?.title).toBe("Sleep is in a healthy range");
    expect(summaries[2]?.title).toBe("Active time looks solid");
  });

  it("returns empty array when no data provided", () => {
    expect(buildHealthSummaries([])).toEqual([]);
  });
});

describe("buildMockInbox", () => {
  it("returns a stable dashboard inbox MVP", () => {
    const items = buildMockInbox("2026-03-26");

    expect(items).toHaveLength(4);
    expect(items[0]?.tag).toBe("Job App");
    expect(items[2]?.subject).toMatch(/technical interview/i);
  });

  it("uses date in item IDs", () => {
    const items = buildMockInbox("2026-04-01");
    expect(items[0].id).toContain("2026-04-01");
  });
});
