"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateKey } from "@/lib/utils";
import DayNavigation from "@/components/dashboard/DayNavigation";
import CompletionHeatmap from "@/components/dashboard/CompletionHeatmap";
import HealthSummaryPanel from "@/components/dashboard/HealthSummaryPanel";
import GmailInboxPanel from "@/components/dashboard/GmailInboxPanel";
import JobTrackerPanel from "@/components/dashboard/JobTrackerPanel";
import TaskList from "@/components/dashboard/TaskList";
import HabitChecklist from "@/components/dashboard/HabitChecklist";

interface TaskSubitem {
  id: string;
  title: string;
  completed: boolean;
  position: number;
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  priority: string;
  position: number;
  categoryId: string | null;
  durationMinutes?: number | null;
  timerStatus?: string;
  timerStartedAt?: string | null;
  timerEndsAt?: string | null;
  timerOutcome?: string | null;
  completionNote?: string | null;
  category?: { name: string; color: string } | null;
  subitems: TaskSubitem[];
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface HabitLog {
  date: string;
  completed: boolean;
}

interface Habit {
  id: string;
  name: string;
  color: string;
  frequency: string;
  active: boolean;
  logs: HabitLog[];
}

interface DayEntry {
  id: string;
  date: string;
  journalText: string;
  tasks: Task[];
}

interface DashboardInsights {
  heatmap: {
    date: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    intensity: 0 | 1 | 2 | 3 | 4;
  }[];
  health: {
    connected: boolean;
    summaries: { title: string; insight: string }[];
    error?: string | null;
  };
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState(() => formatDateKey(new Date()));
  const [_dayEntry, setDayEntry] = useState<DayEntry | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const loadBaseData = useCallback(async (date: string, background = false) => {
    if (!background) {
      setLoading(true);
    }
    setError(null);

    try {
      const [dayRes, habitsRes, categoriesRes] = await Promise.all([
        fetch(`/api/day-entry?date=${date}`),
        fetch(`/api/habits?date=${date}`),
        fetch("/api/categories"),
      ]);

      if (!dayRes.ok || !habitsRes.ok || !categoriesRes.ok) {
        throw new Error("Failed to load dashboard data");
      }

      const [dayData, habitsData, categoriesData] = await Promise.all([
        dayRes.json(),
        habitsRes.json(),
        categoriesRes.json(),
      ]);

      setDayEntry(dayData);
      setTasks(dayData.tasks ?? []);
      setHabits(habitsData);
      setCategories(categoriesData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Something went wrong");
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, []);

  const loadInsights = useCallback(async (date: string, background = false) => {
    if (!background) {
      setInsightsLoading(true);
    }
    setInsightsError(null);

    try {
      const res = await fetch(`/api/dashboard-insights?date=${date}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load dashboard insights");
      }

      setInsights(data);
    } catch (loadError) {
      setInsightsError(loadError instanceof Error ? loadError.message : "Something went wrong");
    } finally {
      if (!background) {
        setInsightsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get("date");
    if (fromUrl && /^\d{4}-\d{2}-\d{2}$/.test(fromUrl)) {
      setCurrentDate((previous) => (fromUrl !== previous ? fromUrl : previous));
    }
  }, [searchParams]);

  useEffect(() => {
    void Promise.all([loadBaseData(currentDate), loadInsights(currentDate)]);
  }, [currentDate, loadBaseData, loadInsights]);

  const handleRefresh = useCallback(() => {
    void Promise.all([loadBaseData(currentDate), loadInsights(currentDate)]);
  }, [currentDate, loadBaseData, loadInsights]);

  const handleBackgroundRefresh = useCallback(() => {
    void loadInsights(currentDate, true);
  }, [currentDate, loadInsights]);

  const progress = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [tasks]);

  if (error) {
    return (
      <div className="space-y-6">
        <DayNavigation date={currentDate} onDateChange={setCurrentDate} />
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DayNavigation date={currentDate} onDateChange={setCurrentDate} />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">Daily progress</span>
              <span className="text-muted-foreground">
                {progress.completed}/{progress.total} tasks · {progress.percent}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full border border-border bg-muted">
              <div className="flex h-full w-full">
                <div
                  className="h-full bg-emerald-500 transition-[width]"
                  style={{ width: `${progress.percent}%` }}
                />
                <div
                  className="h-full bg-rose-400/80 transition-[width]"
                  style={{ width: `${100 - progress.percent}%` }}
                />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr,0.85fr]">
            <HealthSummaryPanel
              connected={insights?.health.connected ?? false}
              summaries={insights?.health.summaries ?? []}
              error={insightsError ?? insights?.health.error}
            />
            <JobTrackerPanel />
          </div>

          <GmailInboxPanel />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr,0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskList
                  date={currentDate}
                  tasks={tasks}
                  categories={categories}
                  onTasksChange={setTasks}
                  onMutationComplete={handleBackgroundRefresh}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Habits</CardTitle>
              </CardHeader>
              <CardContent>
                <HabitChecklist
                  date={currentDate}
                  habits={habits}
                  onHabitsChange={setHabits}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Completion history
              </h2>
              {insightsLoading && (
                <span className="text-xs text-muted-foreground">Refreshing insights…</span>
              )}
            </div>
            <CompletionHeatmap cells={insights?.heatmap ?? []} />
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
