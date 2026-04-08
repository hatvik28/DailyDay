"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Code2, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  computeNeetcodeStats,
  type Difficulty,
} from "@/lib/neetcode";

interface NeetcodeProblemData {
  id: string;
  title: string;
  url: string;
  difficulty: string;
  topic: string;
  interviewReady: boolean;
  reviews: { nextReviewAt: string }[];
}

interface NeetcodePanelProps {
  className?: string;
}

export default function NeetcodePanel({ className }: NeetcodePanelProps) {
  const [problems, setProblems] = useState<NeetcodeProblemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const res = await fetch("/api/neetcode");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setProblems(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = computeNeetcodeStats(problems);
  const recent = problems.slice(0, 5);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            <CardTitle>NeetCode</CardTitle>
          </div>
          <Link
            href="/neetcode"
            className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
          >
            View All
          </Link>
        </div>
        <CardDescription>
          {stats.total} solved · {stats.dueForReview} due · {stats.interviewReadyCount} ready
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <p>Failed to load problems.</p>
          </div>
        ) : problems.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <p>No problems tracked yet.</p>
            <Link
              href="/neetcode"
              className="mt-3 inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              Add Your First Problem
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mini difficulty stats */}
            <div className="flex gap-2">
              {(["easy", "medium", "hard"] as const).map((diff) => (
                <div
                  key={diff}
                  className={cn(
                    "flex-1 rounded-lg px-2 py-1.5 text-center text-xs",
                    DIFFICULTY_COLORS[diff],
                  )}
                >
                  <p className="text-lg font-bold">{stats.byDifficulty[diff]}</p>
                  <p className="truncate">{DIFFICULTY_LABELS[diff]}</p>
                </div>
              ))}
            </div>

            {/* Recent problems */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Recent</p>
              {recent.map((problem) => (
                <div
                  key={problem.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 transition-colors hover:bg-accent/30"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {problem.interviewReady && (
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                      )}
                      <p className="truncate text-sm font-medium">{problem.title}</p>
                      {problem.url && (
                        <a
                          href={problem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${problem.title} on NeetCode`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      "shrink-0 text-[10px]",
                      DIFFICULTY_COLORS[problem.difficulty as Difficulty] ?? DIFFICULTY_COLORS.medium,
                    )}
                  >
                    {DIFFICULTY_LABELS[problem.difficulty as Difficulty] ?? problem.difficulty}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
