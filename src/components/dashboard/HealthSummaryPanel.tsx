"use client";

import { Activity, HeartPulse } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface HealthSummaryCard {
  title: string;
  insight: string;
}

interface HealthSummaryPanelProps {
  connected: boolean;
  summaries: HealthSummaryCard[];
  error?: string | null;
}

export default function HealthSummaryPanel({
  connected,
  summaries,
  error,
}: HealthSummaryPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-rose-500" />
          <CardTitle>Health summary</CardTitle>
        </div>
        <CardDescription>Pattern-based suggestions from your last 7 days</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!connected ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            {error ?? "Connect Fitbit to unlock dashboard health summaries."}
          </div>
        ) : summaries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Not enough recent Fitbit data yet to generate a summary.
          </div>
        ) : (
          summaries.map((summary) => (
            <div
              key={summary.title}
              className="rounded-xl border border-border bg-accent/30 p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">{summary.title}</p>
              </div>
              <p className="text-sm text-muted-foreground">{summary.insight}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
