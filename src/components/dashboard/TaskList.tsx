"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  priority: string;
  position: number;
  categoryId: string | null;
  durationMinutes?: number | null;
  timerStatus?: string;
  timerStartedAt?: string | null;
  timerEndsAt?: string | null;
  timerOutcome?: string | null;
  completionNote?: string | null;
  category?: { name: string; color: string } | null;
  subitems: { id: string; title: string; completed: boolean; position: number }[];
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface TaskListProps {
  date: string;
  tasks: Task[];
  categories: Category[];
  onTasksChange: (tasks: Task[]) => void;
  onMutationComplete?: () => void;
}

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => a.position - b.position);
}

export default function TaskList({
  date,
  tasks,
  categories: _categories,
  onTasksChange,
  onMutationComplete,
}: TaskListProps) {
  const [taskState, setTaskState] = useState<Task[]>(tasks);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    setTaskState(tasks);
  }, [tasks]);

  const commitTasks = useCallback(
    (nextTasks: Task[]) => {
      const sorted = sortTasks(nextTasks);
      setTaskState(sorted);
      queueMicrotask(() => onTasksChange(sorted));
    },
    [onTasksChange]
  );

  const persistPatch = useCallback(
    async (taskId: string, patch: Record<string, unknown>, rollback: Task[]) => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("Failed to update task");
        const updated: Task = await res.json();
        let nextTasks: Task[] = [];
        setTaskState((current) => {
          nextTasks = sortTasks(
            current.map((task) => (task.id === taskId ? updated : task))
          );
          return nextTasks;
        });
        queueMicrotask(() => {
          onTasksChange(nextTasks);
          onMutationComplete?.();
        });
      } catch {
        commitTasks(rollback);
      }
    },
    [commitTasks, onMutationComplete, onTasksChange]
  );

  const sorted = useMemo(() => sortTasks(taskState), [taskState]);

  const handleAddTask = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) return;

    setAdding(true);
    const rollback = taskState;
    const optimisticTask: Task = {
      id: `temp-${Date.now()}`,
      title,
      description: "",
      completed: false,
      priority: "medium",
      position: sorted.length,
      categoryId: null,
      durationMinutes: null,
      timerStatus: "idle",
      timerStartedAt: null,
      timerEndsAt: null,
      timerOutcome: null,
      completionNote: null,
      category: null,
      subitems: [],
    };
    commitTasks([...taskState, optimisticTask]);
    setNewTitle("");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, title, priority: "medium" }),
      });
      if (!res.ok) throw new Error("Failed to add task");
      const created: Task = await res.json();
      commitTasks([...rollback, created]);
      onMutationComplete?.();
    } catch {
      commitTasks(rollback);
      setNewTitle(title);
    } finally {
      setAdding(false);
    }
  }, [commitTasks, date, newTitle, onMutationComplete, sorted.length, taskState]);

  const handleToggleComplete = useCallback(
    async (task: Task) => {
      const rollback = taskState;
      const nextTasks = taskState.map((t) =>
        t.id === task.id ? { ...t, completed: !t.completed } : t
      );
      commitTasks(nextTasks);
      await persistPatch(task.id, { completed: !task.completed }, rollback);
    },
    [commitTasks, persistPatch, taskState]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const rollback = taskState;
    commitTasks(taskState.filter((task) => task.id !== deleteTarget.id));
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/tasks/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      onMutationComplete?.();
    } catch {
      commitTasks(rollback);
    }
  }, [commitTasks, deleteTarget, onMutationComplete, taskState]);

  const handleReorder = useCallback(
    async (fromTaskId: string, toTaskId: string) => {
      if (fromTaskId === toTaskId) return;
      const rollback = taskState;
      const ordered = sortTasks(taskState);
      const fromIndex = ordered.findIndex((task) => task.id === fromTaskId);
      const toIndex = ordered.findIndex((task) => task.id === toTaskId);
      if (fromIndex < 0 || toIndex < 0) return;

      const nextTasks = [...ordered];
      const [moved] = nextTasks.splice(fromIndex, 1);
      nextTasks.splice(toIndex, 0, moved);
      const resequenced = nextTasks.map((task, index) => ({ ...task, position: index }));
      commitTasks(resequenced);

      try {
        const res = await fetch("/api/tasks/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskIds: resequenced.map((task) => task.id) }),
        });
        if (!res.ok) throw new Error("Failed to reorder");
        onMutationComplete?.();
      } catch {
        commitTasks(rollback);
      }
    },
    [commitTasks, onMutationComplete, taskState]
  );

  return (
    <div className="space-y-3">
      {sorted.map((task) => (
        <div
          key={task.id}
          className="rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
          draggable
          onDragStart={() => setDraggingId(task.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (draggingId) void handleReorder(draggingId, task.id);
            setDraggingId(null);
          }}
          onDragEnd={() => setDraggingId(null)}
        >
          <div className="flex items-center gap-3">
            <button className="rounded-md border border-border p-1 text-muted-foreground hover:text-foreground">
              <GripVertical className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
              <span className={cn("block text-sm font-medium", task.completed && "text-muted-foreground line-through")}>
                {task.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {task.completed ? (
                <button
                  type="button"
                  onClick={() => void handleToggleComplete(task)}
                  className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                >
                  Completed
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleToggleComplete(task)}
                  className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                >
                  Complete
                </button>
              )}
              <Badge variant="outline" className={cn("text-[10px]", PRIORITY_STYLES[task.priority])}>
                {task.priority}
              </Badge>
              <Dialog open={deleteTarget?.id === task.id} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogTrigger
                  className="inline-flex size-7 items-center justify-center rounded-md text-red-500 hover:bg-accent hover:text-red-600"
                  onClick={() => setDeleteTarget(task)}
                >
                  <Trash2 className="size-3.5" />
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Task</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete &ldquo;{task.title}&rdquo;? This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDelete}>
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      ))}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void handleAddTask();
        }}
      >
        <Input placeholder="Add a task..." value={newTitle} onChange={(event) => setNewTitle(event.target.value)} disabled={adding} />
        <Button type="submit" size="sm" disabled={adding || !newTitle.trim()}>
          <Plus className="size-4" />
        </Button>
      </form>
    </div>
  );
}
