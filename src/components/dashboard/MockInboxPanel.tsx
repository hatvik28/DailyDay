"use client";

import { BriefcaseBusiness, Clock3, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MockInboxItem } from "@/lib/dashboard";

const TAG_STYLES: Record<MockInboxItem["tag"], string> = {
  "Job App": "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  Interview: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  "Follow Up": "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  Inbox: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
};

export default function MockInboxPanel({ items }: { items: MockInboxItem[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle>Email & job tracker</CardTitle>
        </div>
        <CardDescription>Mock inbox for the dashboard MVP until Gmail integration lands</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-border bg-background/70 p-4 transition-colors hover:bg-accent/40"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.subject}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <BriefcaseBusiness className="h-3.5 w-3.5" />
                  <span className="truncate">{item.sender}</span>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${TAG_STYLES[item.tag]}`}>
                {item.tag}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{item.preview}</p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              <span>{item.timestamp}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
