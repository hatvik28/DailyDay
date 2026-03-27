"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, isValidHexColor, isValidFrequency } from "@/lib/utils";

type Frequency = "daily" | "weekdays" | "weekly";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Habit {
  id: string;
  name: string;
  color: string;
  frequency: string;
  active: boolean;
  categoryId: string | null;
  category?: { id: string; name: string; color: string } | null;
}

const DEFAULT_COLOR = "#6366f1";

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Daily",
  weekdays: "Weekdays",
  weekly: "Weekly",
};

function frequencyLabel(value: string): string {
  if (value === "daily" || value === "weekdays" || value === "weekly") {
    return FREQUENCY_LABELS[value];
  }
  return value;
}

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

async function fetchHabitsList(): Promise<Habit[]> {
  const res = await fetch("/api/habits");
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Failed to load habits"));
  }
  if (!Array.isArray(data)) {
    throw new Error("Invalid habits response from server");
  }
  return data as Habit[];
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

type FormFields = {
  name: string;
  color: string;
  frequency: Frequency;
  categoryId: string;
  active: boolean;
};

function emptyCreateForm(): FormFields {
  return {
    name: "",
    color: DEFAULT_COLOR,
    frequency: "daily",
    categoryId: "",
    active: true,
  };
}

function habitToForm(h: Habit): FormFields {
  const freq = isValidFrequency(h.frequency) ? h.frequency : "daily";
  return {
    name: h.name,
    color: h.color || DEFAULT_COLOR,
    frequency: freq as Frequency,
    categoryId: h.categoryId ?? "",
    active: h.active,
  };
}

function validateForm(fields: FormFields): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = fields.name.trim();
  if (!name) {
    errors.name = "Name is required";
  }
  if (!isValidHexColor(fields.color)) {
    errors.color = "Use a valid hex color (e.g. #6366f1)";
  }
  if (!isValidFrequency(fields.frequency)) {
    errors.frequency = "Pick a valid frequency";
  }
  return errors;
}

function ColorPreview({ color }: { color: string }) {
  const valid = isValidHexColor(color);
  return (
    <span
      className="inline-block size-8 shrink-0 rounded-full border border-zinc-200 shadow-sm dark:border-zinc-700"
      style={valid ? { backgroundColor: color } : undefined}
      title={valid ? color : "Invalid color"}
      aria-hidden
    />
  );
}

function HabitCardDot({ color }: { color: string }) {
  const valid = isValidHexColor(color);
  return (
    <span
      className="size-3 shrink-0 rounded-full ring-2 ring-zinc-200 dark:ring-zinc-700"
      style={valid ? { backgroundColor: color } : { backgroundColor: "#a1a1aa" }}
      aria-hidden
    />
  );
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);

  const [createForm, setCreateForm] = useState<FormFields>(emptyCreateForm);
  const [editForm, setEditForm] = useState<FormFields>(emptyCreateForm);

  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [createSubmitError, setCreateSubmitError] = useState<string | null>(null);
  const [editSubmitError, setEditSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [createPending, setCreatePending] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [togglePendingId, setTogglePendingId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [h, c] = await Promise.all([fetchHabitsList(), fetchCategoriesList()]);
      setHabits(h);
      setCategories(c);
    } catch (e) {
      setHabits([]);
      setCategories([]);
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const activeHabits = useMemo(
    () => habits.filter((h) => h.active).sort((a, b) => a.name.localeCompare(b.name)),
    [habits]
  );
  const archivedHabits = useMemo(
    () => habits.filter((h) => !h.active).sort((a, b) => a.name.localeCompare(b.name)),
    [habits]
  );

  function openEdit(h: Habit) {
    setEditingHabit(h);
    setEditForm(habitToForm(h));
    setEditErrors({});
    setEditSubmitError(null);
    setEditOpen(true);
  }

  function openDelete(h: Habit) {
    setDeletingHabit(h);
    setDeleteError(null);
    setDeleteOpen(true);
  }

  function resetCreateForm() {
    setCreateForm(emptyCreateForm());
    setCreateErrors({});
    setCreateSubmitError(null);
  }

  function closeCreate() {
    resetCreateForm();
    setCreateOpen(false);
  }

  async function refetchHabits() {
    const h = await fetchHabitsList();
    setHabits(h);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateSubmitError(null);
    const errs = validateForm(createForm);
    setCreateErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setCreatePending(true);
    try {
      const body: Record<string, unknown> = {
        name: createForm.name.trim(),
        color: createForm.color,
        frequency: createForm.frequency,
      };
      if (createForm.categoryId) {
        body.categoryId = createForm.categoryId;
      }

      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJson(res);
      if (!res.ok) {
        setCreateSubmitError(getErrorMessage(data, "Failed to create habit"));
        return;
      }
      closeCreate();
      await refetchHabits();
    } catch (err) {
      setCreateSubmitError(
        err instanceof Error ? err.message : "Network error while creating habit"
      );
    } finally {
      setCreatePending(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingHabit) return;
    setEditSubmitError(null);
    const errs = validateForm(editForm);
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setEditPending(true);
    try {
      const body: Record<string, unknown> = {
        name: editForm.name.trim(),
        color: editForm.color,
        frequency: editForm.frequency,
        active: editForm.active,
        categoryId: editForm.categoryId ? editForm.categoryId : null,
      };

      const res = await fetch(`/api/habits/${editingHabit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJson(res);
      if (!res.ok) {
        setEditSubmitError(getErrorMessage(data, "Failed to update habit"));
        return;
      }
      setEditOpen(false);
      setEditingHabit(null);
      await refetchHabits();
    } catch (err) {
      setEditSubmitError(
        err instanceof Error ? err.message : "Network error while updating habit"
      );
    } finally {
      setEditPending(false);
    }
  }

  async function handleToggleActive(h: Habit) {
    setTogglePendingId(h.id);
    try {
      const res = await fetch(`/api/habits/${h.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !h.active }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        setError(getErrorMessage(data, "Failed to update habit"));
        return;
      }
      await refetchHabits();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setTogglePendingId(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingHabit) return;
    setDeleteError(null);
    setDeletePending(true);
    try {
      const res = await fetch(`/api/habits/${deletingHabit.id}`, {
        method: "DELETE",
      });
      if (res.status === 204) {
        setDeleteOpen(false);
        setDeletingHabit(null);
        await refetchHabits();
        return;
      }
      const data = await readJson(res);
      setDeleteError(getErrorMessage(data, "Failed to delete habit"));
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Network error while deleting habit"
      );
    } finally {
      setDeletePending(false);
    }
  }

  function renderHabitCard(h: Habit) {
    const cat = h.category;
    const toggling = togglePendingId === h.id;

    return (
      <Card key={h.id}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <HabitCardDot color={h.color} />
              <CardTitle className="truncate text-base font-semibold">{h.name}</CardTitle>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => openEdit(h)}
                aria-label={`Edit ${h.name}`}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => void handleToggleActive(h)}
                disabled={toggling}
                aria-label={h.active ? `Archive ${h.name}` : `Unarchive ${h.name}`}
              >
                {toggling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : h.active ? (
                  <Archive className="size-4" />
                ) : (
                  <ArchiveRestore className="size-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-red-600 hover:text-red-600 dark:text-red-400"
                onClick={() => openDelete(h)}
                aria-label={`Delete ${h.name}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-2">
            <Badge variant="secondary">{frequencyLabel(h.frequency)}</Badge>
            {cat ? (
              <Badge variant="outline" className="gap-1.5 font-normal">
                <span
                  className="size-2 rounded-full"
                  style={
                    isValidHexColor(cat.color)
                      ? { backgroundColor: cat.color }
                      : { backgroundColor: "#a1a1aa" }
                  }
                  aria-hidden
                />
                {cat.name}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
      </Card>
    );
  }

  function renderSection(title: string, description: string, list: Habit[]) {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        {list.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No habits here yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map(renderHabitCard)}
          </div>
        )}
      </section>
    );
  }

  const categorySelectOptions = (
    <>
      <option value="">None</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </>
  );

  if (error && loading === false && habits.length === 0 && categories.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Habits</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage recurring habits, frequencies, and categories.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void loadAll()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Habits</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Create, edit, archive, or delete your habits.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            resetCreateForm();
            setCreateOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add Habit
        </Button>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent>
          <form onSubmit={(e) => void handleCreateSubmit(e)}>
            <DialogHeader>
              <DialogTitle>New habit</DialogTitle>
              <DialogDescription>
                Add a name, optional color, frequency, and category.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Morning walk"
                  aria-invalid={!!createErrors.name}
                  className={cn(createErrors.name && "border-red-500")}
                />
                {createErrors.name ? (
                  <p className="text-xs text-red-600 dark:text-red-400">{createErrors.name}</p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-color">Color (hex)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="create-color"
                    value={createForm.color}
                    onChange={(e) => setCreateForm((f) => ({ ...f, color: e.target.value }))}
                    placeholder="#6366f1"
                    className={cn("font-mono", createErrors.color && "border-red-500")}
                    aria-invalid={!!createErrors.color}
                  />
                  <ColorPreview color={createForm.color} />
                </div>
                {createErrors.color ? (
                  <p className="text-xs text-red-600 dark:text-red-400">{createErrors.color}</p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-frequency">Frequency</Label>
                <Select
                  id="create-frequency"
                  value={createForm.frequency}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      frequency: e.target.value as Frequency,
                    }))
                  }
                  aria-invalid={!!createErrors.frequency}
                  className={cn(createErrors.frequency && "border-red-500")}
                >
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekly">Weekly</option>
                </Select>
                {createErrors.frequency ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {createErrors.frequency}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-category">Category (optional)</Label>
                <Select
                  id="create-category"
                  value={createForm.categoryId}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, categoryId: e.target.value }))
                  }
                >
                  {categorySelectOptions}
                </Select>
              </div>
              {createSubmitError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{createSubmitError}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreate}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPending}>
                {createPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          <span>{error}</span>
          <Button
            variant="link"
            className="ml-2 h-auto p-0 text-red-800 underline dark:text-red-200"
            onClick={() => void loadAll()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-zinc-400" aria-label="Loading" />
        </div>
      ) : (
        <>
          {habits.length === 0 && !error ? (
            <Card>
              <CardHeader>
                <CardTitle>No habits yet</CardTitle>
                <CardDescription>
                  Create your first habit to start tracking. You can assign a category and pick how
                  often it repeats.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {habits.length > 0 ? (
            <div className="space-y-10">
              {renderSection(
                "Active",
                "Habits you are currently tracking.",
                activeHabits
              )}
              {renderSection(
                "Archived",
                "Paused habits. Unarchive anytime to bring them back.",
                archivedHabits
              )}
            </div>
          ) : null}
        </>
      )}

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditingHabit(null);
            setEditErrors({});
            setEditSubmitError(null);
          }
        }}
      >
        <DialogContent>
          {editingHabit ? (
            <form onSubmit={(e) => void handleEditSubmit(e)}>
              <DialogHeader>
                <DialogTitle>Edit habit</DialogTitle>
                <DialogDescription>Update details for “{editingHabit.name}”.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    aria-invalid={!!editErrors.name}
                    className={cn(editErrors.name && "border-red-500")}
                  />
                  {editErrors.name ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{editErrors.name}</p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-color">Color (hex)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="edit-color"
                      value={editForm.color}
                      onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                      className={cn("font-mono", editErrors.color && "border-red-500")}
                      aria-invalid={!!editErrors.color}
                    />
                    <ColorPreview color={editForm.color} />
                  </div>
                  {editErrors.color ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{editErrors.color}</p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-frequency">Frequency</Label>
                  <Select
                    id="edit-frequency"
                    value={editForm.frequency}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        frequency: e.target.value as Frequency,
                      }))
                    }
                    className={cn(editErrors.frequency && "border-red-500")}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekly">Weekly</option>
                  </Select>
                  {editErrors.frequency ? (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {editErrors.frequency}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-category">Category (optional)</Label>
                  <Select
                    id="edit-category"
                    value={editForm.categoryId}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, categoryId: e.target.value }))
                    }
                  >
                    {categorySelectOptions}
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-active"
                    checked={editForm.active}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, active: e.target.checked }))
                    }
                  />
                  <Label htmlFor="edit-active" className="font-normal">
                    Active (not archived)
                  </Label>
                </div>
                {editSubmitError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{editSubmitError}</p>
                ) : null}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editPending}>
                  {editPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeletingHabit(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete habit?</DialogTitle>
            <DialogDescription>
              {deletingHabit
                ? `“${deletingHabit.name}” will be removed permanently. This cannot be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletePending || !deletingHabit}
              onClick={() => void handleDeleteConfirm()}
            >
              {deletePending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
