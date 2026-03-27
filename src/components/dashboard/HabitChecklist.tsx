"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

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

interface HabitChecklistProps {
  date: string;
  habits: Habit[];
  onHabitsChange: (habits: Habit[]) => void;
}

export default function HabitChecklist({ date, habits, onHabitsChange }: HabitChecklistProps) {
  const [habitState, setHabitState] = useState(habits);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    setHabitState(habits);
  }, [habits]);

  const activeHabits = useMemo(() => habitState.filter((habit) => habit.active), [habitState]);

  const isCompleted = useCallback(
    (habit: Habit) => habit.logs.some((log) => log.date === date && log.completed),
    [date]
  );

  const handleToggle = useCallback(
    async (habit: Habit) => {
      const done = isCompleted(habit);
      const nextHabits = habitState.map((item) => {
        if (item.id !== habit.id) return item;
        const filteredLogs = item.logs.filter((log) => log.date !== date);
        return {
          ...item,
          logs: done ? filteredLogs : [...filteredLogs, { date, completed: true }],
        };
      });

      setHabitState(nextHabits);
      onHabitsChange(nextHabits);
      setTogglingId(habit.id);

      try {
        const res = await fetch(`/api/habits/${habit.id}/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, completed: !done }),
        });
        if (!res.ok) throw new Error("Failed to toggle habit");
      } catch {
        setHabitState(habits);
        onHabitsChange(habits);
      } finally {
        setTogglingId(null);
      }
    },
    [date, habitState, habits, isCompleted, onHabitsChange]
  );

  if (activeHabits.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No habits yet. Add some in the Habits page.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {activeHabits.map((habit) => {
        const done = isCompleted(habit);
        return (
          <label
            key={habit.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
              done ? "border-border bg-accent/40" : "border-border bg-card"
            )}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: habit.color }} />
            <Checkbox
              checked={done}
              disabled={togglingId === habit.id}
              onChange={() => void handleToggle(habit)}
            />
            <span className={cn("text-sm", done && "text-muted-foreground line-through")}>
              {habit.name}
            </span>
          </label>
        );
      })}
    </div>
  );
}
