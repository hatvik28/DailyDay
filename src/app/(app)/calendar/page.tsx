"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { BookMarked, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CompletedTask = {
  id: string;
  title: string;
  completionNote: string | null;
};

type CalendarDayPayload = {
  taskCount: number;
  completedTaskCount: number;
  habitsDone: number;
  habitsTotal: number;
  hasJournal: boolean;
  completedTasks: CompletedTask[];
};

function dayQuality(day: CalendarDayPayload | undefined): number | null {
  if (!day) return null;
  const hasTasks = day.taskCount > 0;
  const taskRatio = day.taskCount > 0 ? day.completedTaskCount / day.taskCount : null;

  if (hasTasks && taskRatio != null) {
    return taskRatio;
  }

  if (day.habitsTotal > 0) {
    return day.habitsDone / day.habitsTotal;
  }

  if (day.hasJournal) return 0.55;

  return null;
}

function cellBackgroundClass(day: CalendarDayPayload | undefined): string {
  const quality = dayQuality(day);
  if (quality == null) {
    return "border-border bg-card hover:bg-accent/40";
  }
  if (quality >= 0.62) {
    return "border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/20";
  }
  if (quality <= 0.38) {
    return "border-red-500/25 bg-red-500/12 hover:bg-red-500/18";
  }
  return "border-border bg-muted/40 hover:bg-muted/60";
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [days, setDays] = useState<Record<string, CalendarDayPayload>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const monthKey = format(currentMonth, "yyyy-MM");

  const fetchMonth = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/calendar?month=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load calendar");
      }
      setDays(data.days ?? {});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Something went wrong");
      setDays({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMonth(monthKey);
  }, [fetchMonth, monthKey]);

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    const output: Date[] = [];

    for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
      output.push(cursor);
    }

    return output;
  }, [currentMonth]);

  const weeks = useMemo(() => {
    const chunked: Date[][] = [];
    for (let index = 0; index < gridDays.length; index += 7) {
      chunked.push(gridDays.slice(index, index + 7));
    }
    return chunked;
  }, [gridDays]);

  function onDayClick(date: Date) {
    router.push(`/?date=${format(date, "yyyy-MM-dd")}`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold tracking-tight">
            {format(currentMonth, "MMMM yyyy")}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => setCurrentMonth((month) => startOfMonth(subMonths(month, 1)))}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => setCurrentMonth((month) => startOfMonth(addMonths(month, 1)))}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-6 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => void fetchMonth(monthKey)}>
                Retry
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="-mx-1 overflow-x-auto px-1">
              <div className="min-w-[280px]">
                <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:gap-1 sm:text-xs">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => (
                    <div key={weekday} className="py-1">
                      <span className="sm:hidden">{weekday.slice(0, 1)}</span>
                      <span className="hidden sm:inline">{weekday}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-0.5 sm:space-y-1">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 gap-0.5 sm:gap-1">
                      {week.map((date) => {
                        const dateKey = format(date, "yyyy-MM-dd");
                        const payload = days[dateKey];
                        const inMonth = isSameMonth(date, currentMonth);
                        const today = isToday(date);
                        const visibleTasks = payload?.completedTasks.slice(0, 2) ?? [];

                        return (
                          <div key={dateKey} className="group relative">
                            <button
                              type="button"
                              onClick={() => onDayClick(date)}
                              className={cn(
                                "flex min-h-[74px] w-full flex-col rounded-md border p-1 text-left transition-colors sm:min-h-[120px] sm:p-1.5",
                                cellBackgroundClass(inMonth ? payload : undefined),
                                !inMonth && "border-transparent bg-muted/20 opacity-40 hover:opacity-60",
                                today && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                              )}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span
                                  className={cn(
                                    "text-xs font-semibold tabular-nums sm:text-sm",
                                    !inMonth && "text-muted-foreground"
                                  )}
                                >
                                  {format(date, "d")}
                                </span>
                                {payload?.hasJournal && (
                                  <BookMarked className="size-3.5 shrink-0 text-primary" />
                                )}
                              </div>

                              <div className="mt-2 flex flex-1 flex-col gap-1">
                                {payload && payload.taskCount > 0 && (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                      <span>{payload.completedTaskCount}/{payload.taskCount} tasks</span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                      <div
                                        className="h-full rounded-full bg-emerald-500 transition-[width]"
                                        style={{
                                          width: `${Math.round(
                                            (payload.completedTaskCount / payload.taskCount) * 100
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {visibleTasks.map((task) => (
                                  <div
                                    key={task.id}
                                    className="hidden truncate rounded bg-background/75 px-1.5 py-1 text-[10px] text-foreground sm:block"
                                  >
                                    {task.title}
                                  </div>
                                ))}

                                {payload && payload.habitsTotal > 0 && (
                                  <p className="mt-auto truncate text-[10px] text-muted-foreground">
                                    Habits {payload.habitsDone}/{payload.habitsTotal}
                                  </p>
                                )}
                              </div>
                            </button>

                            {payload && payload.completedTasks.length > 0 && (
                              <div className="pointer-events-none absolute left-1/2 top-full z-20 hidden w-64 -translate-x-1/2 rounded-xl border border-border bg-card p-3 text-left shadow-xl group-hover:block group-focus-within:block">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Completed tasks
                                </p>
                                <div className="mt-2 space-y-2">
                                  {payload.completedTasks.map((task) => (
                                    <div key={task.id} className="rounded-lg bg-accent/30 p-2">
                                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                                      {task.completionNote && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {task.completionNote}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
