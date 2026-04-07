"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Code2,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  TOPICS,
  TOPIC_LABELS,
  LIST_TAGS,
  LIST_TAG_LABELS,
  REVIEW_QUALITIES,
  REVIEW_QUALITY_LABELS,
  computeNeetcodeStats,
  type Difficulty,
  type Topic,
  type ReviewQuality,
} from "@/lib/neetcode";

interface NeetcodeReview {
  id: string;
  reviewNumber: number;
  quality: string;
  intervalDays: number;
  nextReviewAt: string;
  reviewedAt: string;
  timeMinutes: number | null;
  notes: string;
}

interface NeetcodeProblem {
  id: string;
  title: string;
  url: string;
  difficulty: string;
  topic: string;
  listTag: string;
  timeMinutes: number | null;
  notes: string;
  interviewReady: boolean;
  solvedAt: string;
  reviews: NeetcodeReview[];
}

type ViewMode = "table" | "topics";

const EMPTY_FORM = {
  title: "",
  url: "",
  difficulty: "medium" as string,
  topic: "arrays_hashing" as string,
  listTag: "neetcode_150" as string,
  timeMinutes: "",
  notes: "",
  interviewReady: false,
};

export default function NeetcodePage() {
  const [problems, setProblems] = useState<NeetcodeProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProblem, setEditingProblem] = useState<NeetcodeProblem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NeetcodeProblem | null>(null);
  const [reviewTarget, setReviewTarget] = useState<NeetcodeProblem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [reviewForm, setReviewForm] = useState({ quality: "good" as string, timeMinutes: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const loadProblems = useCallback(async () => {
    try {
      const res = await fetch("/api/neetcode");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setProblems(data);
    } catch (error) {
      console.error("Failed to load problems:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProblems();
  }, [loadProblems]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/neetcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          timeMinutes: form.timeMinutes ? Number(form.timeMinutes) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to add problem");
        return;
      }
      setShowAddDialog(false);
      setForm(EMPTY_FORM);
      await loadProblems();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingProblem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/neetcode/${editingProblem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          timeMinutes: form.timeMinutes ? Number(form.timeMinutes) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to update problem");
        return;
      }
      setEditingProblem(null);
      setForm(EMPTY_FORM);
      await loadProblems();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/neetcode/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        alert(data.error ?? "Failed to delete problem");
        return;
      }
      setDeleteTarget(null);
      await loadProblems();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleReview = async () => {
    if (!reviewTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/neetcode/${reviewTarget.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quality: reviewForm.quality,
          timeMinutes: reviewForm.timeMinutes ? Number(reviewForm.timeMinutes) : null,
          notes: reviewForm.notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to submit review");
        return;
      }
      setReviewTarget(null);
      setReviewForm({ quality: "good", timeMinutes: "", notes: "" });
      await loadProblems();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleInterviewReady = async (problem: NeetcodeProblem) => {
    try {
      const res = await fetch(`/api/neetcode/${problem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewReady: !problem.interviewReady }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        console.error("Failed to toggle interview ready:", data.error);
        return;
      }
      await loadProblems();
    } catch (error) {
      console.error("Failed to toggle interview ready:", error);
    }
  };

  const openEdit = (problem: NeetcodeProblem) => {
    setForm({
      title: problem.title,
      url: problem.url,
      difficulty: problem.difficulty,
      topic: problem.topic,
      listTag: problem.listTag,
      timeMinutes: problem.timeMinutes?.toString() ?? "",
      notes: problem.notes,
      interviewReady: problem.interviewReady,
    });
    setEditingProblem(problem);
  };

  const stats = computeNeetcodeStats(problems);

  const filtered = problems.filter((p) => {
    if (topicFilter !== "all" && p.topic !== topicFilter) return false;
    if (difficultyFilter !== "all" && p.difficulty !== difficultyFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">NeetCode Tracker</h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} solved · {stats.dueForReview} due for review · {stats.interviewReadyCount} interview ready
          </p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setShowAddDialog(true); }}>
          <Plus className="mr-1.5 size-4" />
          Add Problem
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {DIFFICULTIES.map((diff) => (
          <button
            key={diff}
            onClick={() => setDifficultyFilter(difficultyFilter === diff ? "all" : diff)}
            className={cn(
              "rounded-xl border p-3 text-center transition-colors",
              difficultyFilter === diff
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-accent/40",
            )}
          >
            <p className="text-2xl font-bold">{stats.byDifficulty[diff]}</p>
            <p className="text-xs text-muted-foreground">{DIFFICULTY_LABELS[diff]}</p>
          </button>
        ))}
        <button
          onClick={() => setDifficultyFilter("all")}
          className={cn(
            "rounded-xl border p-3 text-center transition-colors",
            difficultyFilter === "all" && topicFilter === "all"
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-accent/40",
          )}
        >
          <p className="text-2xl font-bold">{stats.dueForReview}</p>
          <p className="text-xs text-muted-foreground">Due Review</p>
        </button>
        <button
          className="rounded-xl border border-border p-3 text-center"
        >
          <p className="text-2xl font-bold">{stats.interviewReadyCount}</p>
          <p className="text-xs text-muted-foreground">Ready</p>
        </button>
      </div>

      {/* View toggle + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={viewMode === "table" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("table")}
        >
          Table
        </Button>
        <Button
          variant={viewMode === "topics" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("topics")}
        >
          By Topic
        </Button>

        {/* Topic filter */}
        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        >
          <option value="all">All Topics</option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>{TOPIC_LABELS[t]}</option>
          ))}
        </select>

        {(topicFilter !== "all" || difficultyFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setTopicFilter("all"); setDifficultyFilter("all"); }}
          >
            <X className="mr-1 size-3" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Content */}
      {viewMode === "table" ? (
        <TableView
          problems={filtered}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onReview={setReviewTarget}
          onToggleReady={handleToggleInterviewReady}
        />
      ) : (
        <TopicView
          problems={filtered}
          onEdit={openEdit}
          onReview={setReviewTarget}
          onToggleReady={handleToggleInterviewReady}
        />
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Problem</DialogTitle>
            <DialogDescription>Track a NeetCode problem you solved.</DialogDescription>
          </DialogHeader>
          <ProblemForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingProblem} onOpenChange={(open) => { if (!open) setEditingProblem(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Problem</DialogTitle>
            <DialogDescription>{editingProblem?.title}</DialogDescription>
          </DialogHeader>
          <ProblemForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProblem(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={(open) => { if (!open) setReviewTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review: {reviewTarget?.title}</DialogTitle>
            <DialogDescription>
              Review #{(reviewTarget?.reviews.length ?? 0) + 1} — How did it go?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Quality Rating</label>
              <div className="grid grid-cols-3 gap-2">
                {REVIEW_QUALITIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => setReviewForm({ ...reviewForm, quality: q })}
                    className={cn(
                      "rounded-lg border p-3 text-center text-sm transition-colors",
                      reviewForm.quality === q
                        ? "border-primary bg-primary/10 font-semibold"
                        : "border-border hover:bg-accent/40",
                    )}
                  >
                    {REVIEW_QUALITY_LABELS[q]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="review-time" className="mb-1 block text-sm font-medium">Time (minutes)</label>
              <Input
                id="review-time"
                type="number"
                value={reviewForm.timeMinutes}
                onChange={(e) => setReviewForm({ ...reviewForm, timeMinutes: e.target.value })}
                placeholder="15"
              />
            </div>
            <div>
              <label htmlFor="review-notes" className="mb-1 block text-sm font-medium">Notes</label>
              <Textarea
                id="review-notes"
                value={reviewForm.notes}
                onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                placeholder="What I remembered, what I forgot..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewTarget(null)}>Cancel</Button>
            <Button onClick={handleReview} disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Problem</DialogTitle>
            <DialogDescription>
              Remove &quot;{deleteTarget?.title}&quot;? This will also delete all review history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Sub-components ---

function ProblemForm({
  form,
  setForm,
}: {
  form: typeof EMPTY_FORM;
  setForm: (f: typeof EMPTY_FORM) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium">Title *</label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Two Sum"
        />
      </div>

      <div>
        <label htmlFor="url" className="mb-1 block text-sm font-medium">Problem URL</label>
        <Input
          id="url"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="https://neetcode.io/problems/..."
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="difficulty" className="mb-1 block text-sm font-medium">Difficulty</label>
          <select
            id="difficulty"
            value={form.difficulty}
            onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="topic" className="mb-1 block text-sm font-medium">Topic</label>
          <select
            id="topic"
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {TOPICS.map((t) => (
              <option key={t} value={t}>{TOPIC_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="listTag" className="mb-1 block text-sm font-medium">List</label>
          <select
            id="listTag"
            value={form.listTag}
            onChange={(e) => setForm({ ...form, listTag: e.target.value })}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {LIST_TAGS.map((l) => (
              <option key={l} value={l}>{LIST_TAG_LABELS[l]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="timeMinutes" className="mb-1 block text-sm font-medium">Time (minutes)</label>
          <Input
            id="timeMinutes"
            type="number"
            value={form.timeMinutes}
            onChange={(e) => setForm({ ...form, timeMinutes: e.target.value })}
            placeholder="25"
          />
        </div>
        <div className="flex items-end pb-1">
          <label htmlFor="interviewReady" className="flex items-center gap-2 text-sm">
            <input
              id="interviewReady"
              type="checkbox"
              checked={form.interviewReady}
              onChange={(e) => setForm({ ...form, interviewReady: e.target.checked })}
              className="rounded"
            />
            Interview Ready
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">Notes</label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Solution approach, key insight..."
          rows={3}
        />
      </div>
    </div>
  );
}

function getReviewStatus(problem: NeetcodeProblem): { label: string; className: string } {
  if (problem.interviewReady) {
    return { label: "Interview Ready", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" };
  }
  if (problem.reviews.length === 0) {
    return { label: "Needs First Review", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
  }
  const lastReview = problem.reviews[problem.reviews.length - 1];
  const nextReview = new Date(lastReview.nextReviewAt);
  if (nextReview <= new Date()) {
    return { label: "Due for Review", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" };
  }
  const daysUntil = Math.ceil((nextReview.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return {
    label: `Review in ${daysUntil}d`,
    className: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
  };
}

function TableView({
  problems,
  onEdit,
  onDelete,
  onReview,
  onToggleReady,
}: {
  problems: NeetcodeProblem[];
  onEdit: (p: NeetcodeProblem) => void;
  onDelete: (p: NeetcodeProblem) => void;
  onReview: (p: NeetcodeProblem) => void;
  onToggleReady: (p: NeetcodeProblem) => void;
}) {
  if (problems.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No problems yet. Click &quot;Add Problem&quot; to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Problem</th>
                <th className="px-4 py-3 font-medium">Difficulty</th>
                <th className="px-4 py-3 font-medium">Topic</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Reviews</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => {
                const status = getReviewStatus(problem);
                return (
                  <tr
                    key={problem.id}
                    className="border-b transition-colors hover:bg-accent/30 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Code2 className="size-4 text-muted-foreground" />
                        <span className="font-medium">{problem.title}</span>
                        {problem.url && (
                          <a
                            href={problem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open ${problem.title}`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-[10px]", DIFFICULTY_COLORS[problem.difficulty as Difficulty] ?? DIFFICULTY_COLORS.medium)}>
                        {DIFFICULTY_LABELS[problem.difficulty as Difficulty] ?? problem.difficulty}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {TOPIC_LABELS[problem.topic as Topic] ?? problem.topic}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-[10px]", status.className)}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {problem.reviews.length}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Toggle interview ready"
                          onClick={() => onToggleReady(problem)}
                        >
                          <CheckCircle2 className={cn("size-4", problem.interviewReady ? "text-emerald-500" : "text-muted-foreground")} />
                        </Button>
                        {!problem.interviewReady && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Review this problem"
                            onClick={() => onReview(problem)}
                          >
                            <RotateCcw className="size-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => onEdit(problem)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive"
                          onClick={() => onDelete(problem)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TopicView({
  problems,
  onEdit,
  onReview,
  onToggleReady,
}: {
  problems: NeetcodeProblem[];
  onEdit: (p: NeetcodeProblem) => void;
  onReview: (p: NeetcodeProblem) => void;
  onToggleReady: (p: NeetcodeProblem) => void;
}) {
  // Group by topic, only show topics that have problems
  const grouped = TOPICS.reduce(
    (acc, topic) => {
      const topicProblems = problems.filter((p) => p.topic === topic);
      if (topicProblems.length > 0) {
        acc.push({ topic, problems: topicProblems });
      }
      return acc;
    },
    [] as { topic: string; problems: NeetcodeProblem[] }[],
  );

  if (grouped.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No problems match the current filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {grouped.map(({ topic, problems: topicProblems }) => (
        <Card key={topic}>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{TOPIC_LABELS[topic as Topic]}</h3>
              <Badge variant="outline" className="text-xs">{topicProblems.length}</Badge>
            </div>
            <div className="space-y-2">
              {topicProblems.map((problem) => {
                const status = getReviewStatus(problem);
                return (
                  <div
                    key={problem.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 transition-colors hover:bg-accent/30"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        onClick={() => onToggleReady(problem)}
                        title="Toggle interview ready"
                        className="shrink-0"
                      >
                        <CheckCircle2
                          className={cn(
                            "size-4",
                            problem.interviewReady ? "text-emerald-500" : "text-muted-foreground",
                          )}
                        />
                      </button>
                      <button
                        onClick={() => onEdit(problem)}
                        className="min-w-0 text-left"
                      >
                        <p className="truncate text-sm font-medium">{problem.title}</p>
                        <div className="flex items-center gap-1.5">
                          <Badge className={cn("text-[9px]", DIFFICULTY_COLORS[problem.difficulty as Difficulty])}>
                            {DIFFICULTY_LABELS[problem.difficulty as Difficulty]}
                          </Badge>
                          <span className={cn("rounded-full px-1.5 py-0.5 text-[9px]", status.className)}>
                            {status.label}
                          </span>
                        </div>
                      </button>
                    </div>
                    {!problem.interviewReady && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="Review"
                        onClick={() => onReview(problem)}
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
