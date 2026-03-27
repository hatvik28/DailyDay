"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateKey, parseDateKey } from "@/lib/utils";

interface DayNavigationProps {
  date: string;
  onDateChange: (date: string) => void;
}

export default function DayNavigation({ date, onDateChange }: DayNavigationProps) {
  const parsed = parseDateKey(date);
  const today = formatDateKey(new Date());
  const isToday = date === today;

  function goToPrevious() {
    const prev = new Date(parsed);
    prev.setDate(prev.getDate() - 1);
    onDateChange(formatDateKey(prev));
  }

  function goToNext() {
    const next = new Date(parsed);
    next.setDate(next.getDate() + 1);
    onDateChange(formatDateKey(next));
  }

  function goToToday() {
    onDateChange(today);
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={goToPrevious}>
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-lg font-semibold md:text-xl">
          {format(parsed, "EEEE, MMMM d, yyyy")}
        </h2>
        <Button variant="outline" size="icon" onClick={goToNext}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      {!isToday && (
        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
      )}
    </div>
  );
}
