"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  Flame,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type PeriodDays = 7 | 30 | 90;

interface TaskStats {
  total: number;
  completed: number;
  completionRate: number;
}

interface HabitStatRow {
  habitId: string;
  habitName: string;
  color: string;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
}

interface CategoryBreakdownRow {
  categoryId: string | null;
  categoryName: string;
  color: string;
  taskCount: number;
}

interface StatsPayload {
  taskStats: TaskStats;
  habitStats: HabitStatRow[];
  categoryBreakdown: CategoryBreakdownRow[];
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === "string" && err.trim()) return err;
  }
  return fallback;
}

function isStatsPayload(data: unknown): data is StatsPayload {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (!o.taskStats || typeof o.taskStats !== "object") return false;
  if (!Array.isArray(o.habitStats)) return false;
  if (!Array.isArray(o.categoryBreakdown)) return false;
  return true;
}

async function fetchStats(days: PeriodDays): Promise<StatsPayload> {
  const res = await fetch(`/api/stats?days=${days}`);
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Failed to load stats"));
  }
  if (!isStatsPayload(data)) {
    throw new Error("Invalid stats response from server");
  }
  return data;
}

const PERIODS: { value: PeriodDays; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export default function StatsPage() {
  const [period, setPeriod] = useState<PeriodDays>(30);
  const [data, setData] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedPeriodRef = useRef<PeriodDays>(period);

  const load = useCallback(async () => {
    if (lastFetchedPeriodRef.current !== period) {
      setData(null);
      lastFetchedPeriodRef.current = period;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchStats(period);
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const pieData = useMemo(() => {
    if (!data?.categoryBreakdown.length) return [];
    return data.categoryBreakdown
      .filter((c) => c.taskCount > 0)
      .map((c) => ({
        ...c,
        key: c.categoryId ?? "__uncategorized__",
      }));
  }, [data?.categoryBreakdown]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading stats…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const taskStats = data?.taskStats ?? {
    total: 0,
    completed: 0,
    completionRate: 0,
  };
  const habitStats = data?.habitStats ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Stats &amp; insights
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Productivity over your chosen period.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              type="button"
              variant={period === p.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p.value)}
              disabled={loading}
            >
              {p.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh stats"
          >
            <RefreshCw
              className={cn("h-4 w-4", loading && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {error && data && (
        <p className="text-sm text-destructive">
          {error}{" "}
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => void load()}
          >
            Retry
          </button>
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <CardTitle>Task completion</CardTitle>
            </div>
            <CardDescription>Tasks in the selected period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {taskStats.total === 0 ? (
              <p className="text-sm text-muted-foreground">
                No task data yet for this period. Add tasks on your dashboard
                to see completion here.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {taskStats.total}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Completed</p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {taskStats.completed}
                    </p>
                  </div>
                </div>
                <div className="flex items-end gap-4">
                  <span className="text-5xl font-bold tabular-nums tracking-tight">
                    {taskStats.completionRate}%
                  </span>
                  <span className="pb-2 text-sm text-muted-foreground">
                    completion rate
                  </span>
                </div>
                <div className="space-y-2">
                  <Progress value={taskStats.completionRate} />
                  <p className="text-xs text-muted-foreground">
                    {taskStats.completed} of {taskStats.total} tasks done
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <CardTitle>Habit streaks</CardTitle>
            </div>
            <CardDescription>
              Current and longest streaks per habit
            </CardDescription>
          </CardHeader>
          <CardContent>
            {habitStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No habits tracked yet. Create habits to see streaks here.
              </p>
            ) : (
              <ul className="space-y-4">
                {habitStats.map((h) => {
                  const maxLen = Math.max(h.longestStreak, 1);
                  const barPct = Math.min(
                    100,
                    Math.round((h.currentStreak / maxLen) * 100)
                  );
                  return (
                    <li key={h.habitId} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border border-border"
                            style={{ backgroundColor: h.color }}
                            aria-hidden
                          />
                          <span className="truncate font-medium">
                            {h.habitName}
                          </span>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                          <Badge variant="secondary" className="tabular-nums">
                            Now {h.currentStreak}d
                          </Badge>
                          <Badge variant="outline" className="tabular-nums">
                            Best {h.longestStreak}d
                          </Badge>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${barPct}%`,
                            backgroundColor: h.color,
                            minWidth: h.currentStreak > 0 ? "4px" : undefined,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-violet-500" />
              <CardTitle>Category breakdown</CardTitle>
            </div>
            <CardDescription>Tasks per category in this period</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No task data yet for this period. Tasks on your dashboard will
                appear here grouped by category.
              </p>
            ) : (
              <div className="mx-auto w-full max-w-md space-y-4">
                <div className="h-[280px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="taskCount"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={96}
                        paddingAngle={2}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        layout="horizontal"
                        wrapperStyle={{ paddingTop: 16 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
