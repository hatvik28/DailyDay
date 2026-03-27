"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HeatmapCell {
  date: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

const INTENSITY_STYLES: Record<HeatmapCell["intensity"], string> = {
  0: "bg-muted",
  1: "bg-emerald-100 dark:bg-emerald-950/60",
  2: "bg-emerald-200 dark:bg-emerald-900/80",
  3: "bg-emerald-400 dark:bg-emerald-700",
  4: "bg-emerald-600 dark:bg-emerald-500",
};

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export default function CompletionHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const columns = chunk(cells, 7);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Completion heatmap</CardTitle>
        <CardDescription>Last 12 weeks of daily task completion</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-1.5">
            {columns.map((column, columnIndex) => (
              <div key={columnIndex} className="flex flex-col gap-1.5">
                {column.map((cell) => (
                  <div
                    key={cell.date}
                    className={cn(
                      "h-4 w-4 rounded-[4px] border border-border/70",
                      INTENSITY_STYLES[cell.intensity]
                    )}
                    title={`${cell.date}: ${cell.completedTasks}/${cell.totalTasks} tasks completed`}
                    aria-label={`${cell.date}: ${cell.completedTasks} of ${cell.totalTasks} tasks completed`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>Less complete</span>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3, 4].map((intensity) => (
              <span
                key={intensity}
                className={cn("h-3 w-3 rounded-sm", INTENSITY_STYLES[intensity as 0 | 1 | 2 | 3 | 4])}
              />
            ))}
          </div>
          <span>More complete</span>
        </div>
      </CardContent>
    </Card>
  );
}
