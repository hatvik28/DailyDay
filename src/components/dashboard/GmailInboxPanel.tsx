"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Clock3,
  Loader2,
  Mail,
  MailOpen,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GmailEmail {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: string;
  timestamp: string;
  labels: string[];
  tag: "Job App" | "Interview" | "Follow Up" | "Inbox";
  isUnread: boolean;
}

const TAG_STYLES: Record<GmailEmail["tag"], string> = {
  "Job App":
    "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  Interview:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  "Follow Up":
    "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  Inbox:
    "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
};

interface GmailInboxPanelProps {
  className?: string;
}

export default function GmailInboxPanel({ className }: GmailInboxPanelProps) {
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchEmails = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/gmail/messages?max=8");
      const data = await res.json();

      setConnected(data.connected ?? false);
      setEmails(data.emails ?? []);
    } catch {
      console.error("Failed to fetch Gmail messages");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchEmails();
  }, [fetchEmails]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/gmail/disconnect", { method: "POST" });
      setConnected(false);
      setEmails([]);
    } catch {
      console.error("Failed to disconnect Gmail");
    } finally {
      setDisconnecting(false);
    }
  };

  // --- Not connected state ---
  if (connected === false) {
    return (
      <Card className={cn("flex flex-col", className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Gmail Inbox</CardTitle>
          </div>
          <CardDescription>
            Connect your Gmail to see real emails on your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1">
          <a href="/api/gmail/connect">
            <Button variant="outline" className="w-full gap-2">
              <Mail className="h-4 w-4" />
              Connect Gmail
            </Button>
          </a>
        </CardContent>
      </Card>
    );
  }

  // --- Loading state ---
  if (loading) {
    return (
      <Card className={cn("flex flex-col", className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Gmail Inbox</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // --- Connected state ---
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Gmail Inbox</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => fetchEmails(true)}
              disabled={refreshing}
              title="Refresh emails"
            >
              <RefreshCw
                className={cn("h-4 w-4", refreshing && "animate-spin")}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleDisconnect}
              disabled={disconnecting}
              title="Disconnect Gmail"
            >
              <Unplug className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>
          {emails.length > 0
            ? `Showing ${emails.length} recent emails`
            : "No recent emails"}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {emails.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            <MailOpen className="mx-auto mb-2 h-8 w-8" />
            Your inbox is empty
          </p>
        ) : (
          emails.map((email) => (
            <div
              key={email.id}
              className={cn(
                "rounded-xl border border-border bg-background/70 p-4 transition-colors hover:bg-accent/40",
                email.isUnread && "border-l-2 border-l-primary bg-primary/5"
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate text-sm",
                      email.isUnread ? "font-bold" : "font-semibold"
                    )}
                  >
                    {email.subject}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <BriefcaseBusiness className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{email.from}</span>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${TAG_STYLES[email.tag]}`}
                >
                  {email.tag}
                </span>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {email.snippet}
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                <span>{email.date}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
