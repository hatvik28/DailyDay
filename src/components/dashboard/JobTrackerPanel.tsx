"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PIPELINE_ORDER,
  computeJobStats,
  type JobStatus,
} from "@/lib/job-applications";

interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: string;
  url: string;
  appliedAt: string;
}

export default function JobTrackerPanel() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/job-applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch {
      // Silently fail on dashboard — not critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = computeJobStats(applications.map((a) => a.status));
  const recent = applications.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="h-5 w-5 text-primary" />
            <CardTitle>Job Tracker</CardTitle>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
          >
            View All
          </Link>
        </div>
        <CardDescription>
          {stats.total} applications · {stats.responseRate}% response rate
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : applications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <p>No applications tracked yet.</p>
            <Link
              href="/jobs"
              className="mt-3 inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              Add Your First Application
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mini pipeline stats */}
            <div className="flex gap-2">
              {PIPELINE_ORDER.filter((s) => s !== "withdrawn").map((status) => (
                <div
                  key={status}
                  className={cn(
                    "flex-1 rounded-lg px-2 py-1.5 text-center text-xs",
                    STATUS_COLORS[status]
                  )}
                >
                  <p className="text-lg font-bold">{stats.byStatus[status]}</p>
                  <p className="truncate">{STATUS_LABELS[status]}</p>
                </div>
              ))}
            </div>

            {/* Recent applications */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Recent</p>
              {recent.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 transition-colors hover:bg-accent/30"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{app.company}</p>
                      {app.url && (
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${app.company} job posting`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{app.role}</p>
                  </div>
                  <Badge
                    className={cn(
                      "shrink-0 text-[10px]",
                      STATUS_COLORS[app.status as JobStatus] ?? STATUS_COLORS.applied
                    )}
                  >
                    {STATUS_LABELS[app.status as JobStatus] ?? app.status}
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
