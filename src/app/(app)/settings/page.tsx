"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Pencil,
  Trash2,
  Plus,
  User,
  FolderOpen,
  Repeat,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { isValidHexColor, cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface RecurringTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  frequency: string;
  active: boolean;
  categoryId: string | null;
  category?: { name: string; color: string } | null;
}

const DEFAULT_COLOR = "#6366f1";

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === "string" && err.trim()) return err;
  }
  return fallback;
}

async function fetchCategoriesList(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Failed to load categories"));
  }
  if (!Array.isArray(data)) {
    throw new Error("Invalid categories response from server");
  }
  return data as Category[];
}

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();

  const [categories, setCategories] = useState<Category[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [addName, setAddName] = useState("");
  const [addColor, setAddColor] = useState(DEFAULT_COLOR);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(DEFAULT_COLOR);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Recurring tasks state
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [rtLoading, setRtLoading] = useState(true);
  const [rtError, setRtError] = useState<string | null>(null);
  const [rtAddTitle, setRtAddTitle] = useState("");
  const [rtAddPriority, setRtAddPriority] = useState("medium");
  const [rtAddFrequency, setRtAddFrequency] = useState("daily");
  const [rtAddSubmitting, setRtAddSubmitting] = useState(false);
  const [rtAddError, setRtAddError] = useState<string | null>(null);
  const [rtDeleteId, setRtDeleteId] = useState<string | null>(null);
  const [rtDeleteSubmitting, setRtDeleteSubmitting] = useState(false);

  const loadRecurringTasks = useCallback(async () => {
    setRtLoading(true);
    setRtError(null);
    try {
      const res = await fetch("/api/recurring-tasks");
      const data = await readJson(res);
      if (!res.ok) throw new Error(getErrorMessage(data, "Failed to load recurring tasks"));
      setRecurringTasks(data as RecurringTask[]);
    } catch (e) {
      setRecurringTasks([]);
      setRtError(e instanceof Error ? e.message : "Failed to load recurring tasks");
    } finally {
      setRtLoading(false);
    }
  }, []);

  async function addRecurringTask(e: React.FormEvent) {
    e.preventDefault();
    setRtAddError(null);
    const title = rtAddTitle.trim();
    if (!title) { setRtAddError("Title is required"); return; }
    setRtAddSubmitting(true);
    try {
      const res = await fetch("/api/recurring-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, priority: rtAddPriority, frequency: rtAddFrequency }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(getErrorMessage(data, "Failed to create recurring task"));
      setRtAddTitle("");
      setRtAddPriority("medium");
      setRtAddFrequency("daily");
      await loadRecurringTasks();
    } catch (err) {
      setRtAddError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRtAddSubmitting(false);
    }
  }

  async function deleteRecurringTask(id: string) {
    setRtDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/recurring-tasks/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete");
      setRtDeleteId(null);
      await loadRecurringTasks();
    } catch {
      // silently fail
    } finally {
      setRtDeleteSubmitting(false);
    }
  }

  async function toggleRecurringTask(task: RecurringTask) {
    try {
      await fetch(`/api/recurring-tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !task.active }),
      });
      await loadRecurringTasks();
    } catch {
      // silently fail
    }
  }

  const loadCategories = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const list = await fetchCategoriesList();
      setCategories(list);
    } catch (e) {
      setCategories([]);
      setListError(e instanceof Error ? e.message : "Failed to load categories");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
    void loadRecurringTasks();
  }, [loadCategories, loadRecurringTasks]);

  function openEdit(cat: Category) {
    setEditing(cat);
    setEditName(cat.name);
    setEditColor(cat.color);
    setEditError(null);
    setEditOpen(true);
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    const name = addName.trim();
    if (!name) {
      setAddError("Name is required");
      return;
    }
    if (!isValidHexColor(addColor)) {
      setAddError("Color must be a valid hex value like #6366f1");
      return;
    }
    setAddSubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: addColor }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Failed to create category"));
      }
      setAddName("");
      setAddColor(DEFAULT_COLOR);
      await loadCategories();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAddSubmitting(false);
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditError(null);
    const name = editName.trim();
    if (!name) {
      setEditError("Name cannot be empty");
      return;
    }
    if (!isValidHexColor(editColor)) {
      setEditError("Color must be a valid hex value like #6366f1");
      return;
    }
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/categories/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: editColor }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Failed to update category"));
      }
      setEditOpen(false);
      setEditing(null);
      await loadCategories();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/categories/${deleting.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const data = await readJson(res);
        throw new Error(getErrorMessage(data, "Failed to delete category"));
      }
      setDeleteOpen(false);
      setDeleting(null);
      await loadCategories();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  const addColorInvalid =
    addColor.length > 0 && !isValidHexColor(addColor);
  const editColorInvalid =
    editColor.length > 0 && !isValidHexColor(editColor);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage recurring tasks, categories, and your account.
        </p>
      </div>

      {/* Recurring Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Recurring Tasks</CardTitle>
          </div>
          <CardDescription>
            Tasks that automatically appear on your dashboard each day.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {rtLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading recurring tasks…</span>
            </div>
          ) : rtError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
              {rtError}
              <div className="mt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => void loadRecurringTasks()}>
                  Retry
                </Button>
              </div>
            </div>
          ) : recurringTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recurring tasks yet. Add one below to get started.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {recurringTasks.map((rt) => (
                <li
                  key={rt.id}
                  className={cn(
                    "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between",
                    !rt.active && "opacity-50"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="truncate font-medium">{rt.title}</span>
                    <Badge variant="outline" className="shrink-0 text-xs capitalize">
                      {rt.frequency}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 text-xs capitalize",
                        rt.priority === "high" && "border-red-300 text-red-600",
                        rt.priority === "low" && "border-green-300 text-green-600"
                      )}
                    >
                      {rt.priority}
                    </Badge>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void toggleRecurringTask(rt)}
                    >
                      {rt.active ? "Pause" : "Resume"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setRtDeleteId(rt.id)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={addRecurringTask}
            className="space-y-4 rounded-lg border border-dashed border-border bg-muted/30 p-4"
          >
            <p className="text-sm font-medium">Add recurring task</p>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="rt-title">Title</Label>
                <Input
                  id="rt-title"
                  value={rtAddTitle}
                  onChange={(e) => setRtAddTitle(e.target.value)}
                  placeholder="e.g. Leetcode"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rt-priority">Priority</Label>
                <Select
                  id="rt-priority"
                  value={rtAddPriority}
                  onChange={(e) => setRtAddPriority(e.target.value)}
                  className="w-[120px]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rt-frequency">Frequency</Label>
                <Select
                  id="rt-frequency"
                  value={rtAddFrequency}
                  onChange={(e) => setRtAddFrequency(e.target.value)}
                  className="w-[130px]"
                >
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekends">Weekends</option>
                </Select>
              </div>
            </div>
            {rtAddError && (
              <p className="text-sm text-destructive">{rtAddError}</p>
            )}
            <Button type="submit" disabled={rtAddSubmitting}>
              {rtAddSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add recurring task
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Delete recurring task confirmation */}
      <Dialog open={!!rtDeleteId} onOpenChange={(open) => !open && setRtDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete recurring task</DialogTitle>
            <DialogDescription>
              This will stop the task from being auto-created on future days.
              Existing tasks already created won&apos;t be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setRtDeleteId(null)} disabled={rtDeleteSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => rtDeleteId && void deleteRecurringTask(rtDeleteId)}
              disabled={rtDeleteSubmitting}
            >
              {rtDeleteSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Categories</CardTitle>
          </div>
          <CardDescription>
            Organize tasks with labels and colors. Names must be unique.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {listLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading categories…</span>
            </div>
          ) : listError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
              {listError}
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadCategories()}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No categories yet. Add one below to get started.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-border"
                      style={{ backgroundColor: cat.color }}
                      aria-hidden
                    />
                    <span className="truncate font-medium">{cat.name}</span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(cat)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setDeleting(cat);
                        setDeleteError(null);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={submitAdd}
            className="space-y-4 rounded-lg border border-dashed border-border bg-muted/30 p-4"
          >
            <p className="text-sm font-medium">Add category</p>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="new-cat-name">Name</Label>
                <Input
                  id="new-cat-name"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Work"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-cat-color">Color (hex)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="new-cat-color"
                    value={addColor}
                    onChange={(e) => setAddColor(e.target.value)}
                    placeholder="#6366f1"
                    className="font-mono text-sm"
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <span
                    className={cn(
                      "h-9 w-9 shrink-0 rounded-md border border-border",
                      addColorInvalid && "opacity-40"
                    )}
                    style={{
                      backgroundColor: isValidHexColor(addColor)
                        ? addColor
                        : "transparent",
                    }}
                    title="Color preview"
                    aria-hidden
                  />
                </div>
                {addColorInvalid && (
                  <p className="text-xs text-destructive">
                    Enter a valid 6-digit hex color (e.g. #6366f1)
                  </p>
                )}
              </div>
            </div>
            {addError && (
              <p className="text-sm text-destructive">{addError}</p>
            )}
            <Button type="submit" disabled={addSubmitting}>
              {addSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add category
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Account</CardTitle>
          </div>
          <CardDescription>Your signed-in profile</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionStatus === "loading" ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading session…</span>
            </div>
          ) : sessionStatus === "unauthenticated" ? (
            <p className="text-sm text-muted-foreground">
              You are not signed in.
            </p>
          ) : (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium break-all">
                  {session?.user?.email ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">
                  {session?.user?.name?.trim()
                    ? session.user.name
                    : "—"}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submitEdit}>
            <DialogHeader>
              <DialogTitle>Edit category</DialogTitle>
              <DialogDescription>
                Update the name and color. Hex must be six digits after #.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cat-name">Name</Label>
                <Input
                  id="edit-cat-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cat-color">Color (hex)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="edit-cat-color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="font-mono text-sm"
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <span
                    className={cn(
                      "h-9 w-9 shrink-0 rounded-md border border-border",
                      editColorInvalid && "opacity-40"
                    )}
                    style={{
                      backgroundColor: isValidHexColor(editColor)
                        ? editColor
                        : "transparent",
                    }}
                    aria-hidden
                  />
                </div>
                {editColorInvalid && (
                  <p className="text-xs text-destructive">
                    Enter a valid 6-digit hex color (e.g. #6366f1)
                  </p>
                )}
              </div>
              {editError && (
                <p className="text-sm text-destructive">{editError}</p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={editSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete category</DialogTitle>
            <DialogDescription>
              {deleting ? (
                <>
                  Remove &ldquo;{deleting.name}&rdquo;? Tasks using this category
                  may need to be reassigned.
                </>
              ) : (
                "This category will be removed."
              )}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
