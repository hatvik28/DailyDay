import { formatDateKey, parseDateKey } from "./utils";

export interface HeatmapInputRow {
  date: string;
  totalTasks: number;
  completedTasks: number;
}

export interface HeatmapCell {
  date: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface FitbitTrendDay {
  date: string;
  steps?: number | null;
  stepGoal?: number | null;
  sleepMinutes?: number | null;
  activeMinutes?: number | null;
  restingHeartRate?: number | null;
}

export interface HealthSummaryCard {
  title: string;
  insight: string;
}

export interface MockInboxItem {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  tag: "Job App" | "Interview" | "Follow Up" | "Inbox";
  timestamp: string;
}

export interface CompletedCalendarTask {
  id: string;
  title: string;
  completionNote: string | null;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function intensityForRate(rate: number): 0 | 1 | 2 | 3 | 4 {
  if (rate <= 0) return 0;
  if (rate < 25) return 1;
  if (rate < 50) return 2;
  if (rate < 80) return 3;
  return 4;
}

export function buildHeatmapCells(rows: HeatmapInputRow[], days = 84, endDate = new Date()): HeatmapCell[] {
  const rowMap = new Map(rows.map((row) => [row.date, row]));
  const lastDate = parseDateKey(formatDateKey(endDate));
  const firstDate = addDays(lastDate, -(days - 1));
  const cells: HeatmapCell[] = [];

  for (let cursor = firstDate; cursor <= lastDate; cursor = addDays(cursor, 1)) {
    const key = formatDateKey(cursor);
    const row = rowMap.get(key);
    const totalTasks = row?.totalTasks ?? 0;
    const completedTasks = row?.completedTasks ?? 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    cells.push({
      date: key,
      totalTasks,
      completedTasks,
      completionRate,
      intensity: intensityForRate(completionRate),
    });
  }

  return cells;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildHealthSummaries(days: FitbitTrendDay[]): HealthSummaryCard[] {
  const summaries: HealthSummaryCard[] = [];

  const stepRatios = days
    .filter(
      (day) =>
        typeof day.steps === "number" &&
        typeof day.stepGoal === "number" &&
        day.stepGoal > 0
    )
    .map((day) => day.steps! / day.stepGoal!);
  const avgStepRatio = average(stepRatios);
  if (avgStepRatio !== null) {
    summaries.push(
      avgStepRatio >= 0.9
        ? {
            title: "Movement is consistent",
            insight: `You averaged ${Math.round(avgStepRatio * 100)}% of your daily step goal over the last 7 days. Keep that rhythm going.`,
          }
        : {
            title: "Walk a little more",
            insight: `You averaged ${Math.round(avgStepRatio * 100)}% of your daily step goal over the last 7 days. A short daily walk would lift the trend fastest.`,
          }
    );
  }

  const sleepHours = days
    .filter((day) => typeof day.sleepMinutes === "number")
    .map((day) => day.sleepMinutes! / 60);
  const avgSleepHours = average(sleepHours);
  if (avgSleepHours !== null) {
    summaries.push(
      avgSleepHours >= 7
        ? {
            title: "Sleep is in a healthy range",
            insight: `You averaged ${avgSleepHours.toFixed(1)} hours of sleep recently. Consistency is the main thing to protect.`,
          }
        : {
            title: "Sleep needs attention",
            insight: `You averaged ${avgSleepHours.toFixed(1)} hours of sleep over the last 7 days. An earlier wind-down routine would likely help the most.`,
          }
    );
  }

  const activeMinutes = days
    .filter((day) => typeof day.activeMinutes === "number")
    .map((day) => day.activeMinutes!);
  const avgActiveMinutes = average(activeMinutes);
  if (avgActiveMinutes !== null) {
    summaries.push(
      avgActiveMinutes >= 30
        ? {
            title: "Active time looks solid",
            insight: `You averaged ${Math.round(avgActiveMinutes)} active minutes per day in the last week.`,
          }
        : {
            title: "Add more active minutes",
            insight: `You averaged ${Math.round(avgActiveMinutes)} active minutes per day in the last week. A dedicated 20 to 30 minute session would improve this quickly.`,
          }
    );
  }

  const restingHeartRates = days
    .filter((day) => typeof day.restingHeartRate === "number")
    .map((day) => day.restingHeartRate!);
  if (restingHeartRates.length >= 4) {
    const baseline = average(restingHeartRates.slice(0, Math.ceil(restingHeartRates.length / 2)));
    const recent = average(restingHeartRates.slice(-Math.floor(restingHeartRates.length / 2)));

    if (baseline !== null && recent !== null && recent - baseline >= 4) {
      summaries.push({
        title: "Recovery may be lagging",
        insight: `Your recent resting heart rate is about ${Math.round(
          recent - baseline
        )} bpm above the earlier part of the week. More sleep or a lighter day may help.`,
      });
    }
  }

  return summaries.slice(0, 3);
}

export function buildMockInbox(date: string): MockInboxItem[] {
  return [
    {
      id: `${date}-1`,
      sender: "Greenhouse",
      subject: "Application update: Frontend Engineer",
      preview: "Your application was viewed and moved to the hiring team review stage.",
      tag: "Job App",
      timestamp: "8:45 AM",
    },
    {
      id: `${date}-2`,
      sender: "Recruiter at Vercel",
      subject: "Quick follow up on your portfolio",
      preview: "Wanted to circle back after looking through your recent work and GitHub profile.",
      tag: "Follow Up",
      timestamp: "10:10 AM",
    },
    {
      id: `${date}-3`,
      sender: "Interview Scheduler",
      subject: "Availability for technical interview",
      preview: "Please share two or three time windows for next week so we can lock this in.",
      tag: "Interview",
      timestamp: "1:25 PM",
    },
    {
      id: `${date}-4`,
      sender: "Personal Inbox",
      subject: "Leetcode reminder and notes",
      preview: "You flagged a couple of medium problems to revisit after work tonight.",
      tag: "Inbox",
      timestamp: "6:05 PM",
    },
  ];
}
