"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  X,
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
  JOB_STATUSES,
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
  salaryMin: number | null;
  salaryMax: number | null;
  location: string;
  remote: boolean;
  notes: string;
  appliedAt: string;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = "table" | "pipeline";

const EMPTY_FORM = {
  company: "",
  role: "",
  status: "applied" as string,
  url: "",
  salaryMin: "",
  salaryMax: "",
  location: "",
  remote: false,
  notes: "",
};

export default function JobsPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadApplications = useCallback(async () => {
    try {
      const res = await fetch("/api/job-applications");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setApplications(data);
    } catch (error) {
      console.error("Failed to load applications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to add application");
        return;
      }
      setShowAddDialog(false);
      setForm(EMPTY_FORM);
      await loadApplications();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingApp) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/job-applications/${editingApp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to update application");
        return;
      }
      setEditingApp(null);
      setForm(EMPTY_FORM);
      await loadApplications();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/job-applications/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        alert(data.error ?? "Failed to delete application");
        return;
      }
      setDeleteTarget(null);
      await loadApplications();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleStatusChange = async (app: JobApplication, newStatus: string) => {
    try {
      const response = await fetch(`/api/job-applications/${app.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        console.error("Failed to update status:", data.error);
        return;
      }
      await loadApplications();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const openEdit = (app: JobApplication) => {
    setForm({
      company: app.company,
      role: app.role,
      status: app.status,
      url: app.url,
      salaryMin: app.salaryMin?.toString() ?? "",
      salaryMax: app.salaryMax?.toString() ?? "",
      location: app.location,
      remote: app.remote,
      notes: app.notes,
    });
    setEditingApp(app);
  };

  const stats = computeJobStats(applications.map((a) => a.status));
  const filtered =
    statusFilter === "all"
      ? applications
      : applications.filter((a) => a.status === statusFilter);

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
          <h1 className="text-2xl font-bold tracking-tight">Job Applications</h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} total · {stats.responseRate}% response rate
          </p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setShowAddDialog(true); }}>
          <Plus className="mr-1.5 size-4" />
          Add Application
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {PIPELINE_ORDER.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
            className={cn(
              "rounded-xl border p-3 text-center transition-colors",
              statusFilter === status
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-accent/40"
            )}
          >
            <p className="text-2xl font-bold">{stats.byStatus[status]}</p>
            <p className="text-xs text-muted-foreground">{STATUS_LABELS[status]}</p>
          </button>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === "table" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("table")}
        >
          Table
        </Button>
        <Button
          variant={viewMode === "pipeline" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("pipeline")}
        >
          Pipeline
        </Button>
        {statusFilter !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter("all")}>
            <X className="mr-1 size-3" />
            Clear filter
          </Button>
        )}
      </div>

      {/* Content */}
      {viewMode === "table" ? (
        <TableView
          applications={filtered}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <PipelineView
          applications={filtered}
          onEdit={openEdit}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Application</DialogTitle>
            <DialogDescription>Track a new job application.</DialogDescription>
          </DialogHeader>
          <ApplicationForm form={form} setForm={setForm} />
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
      <Dialog open={!!editingApp} onOpenChange={(open) => { if (!open) setEditingApp(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Application</DialogTitle>
            <DialogDescription>{editingApp?.company} — {editingApp?.role}</DialogDescription>
          </DialogHeader>
          <ApplicationForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingApp(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              Remove {deleteTarget?.company} — {deleteTarget?.role}? This cannot be undone.
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

function ApplicationForm({
  form,
  setForm,
}: {
  form: typeof EMPTY_FORM;
  setForm: (f: typeof EMPTY_FORM) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="company" className="mb-1 block text-sm font-medium">Company *</label>
          <Input
            id="company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="Google"
          />
        </div>
        <div>
          <label htmlFor="role" className="mb-1 block text-sm font-medium">Role *</label>
          <Input
            id="role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="Software Engineer"
          />
        </div>
      </div>

      <div>
        <label htmlFor="status" className="mb-1 block text-sm font-medium">Status</label>
        <select
          id="status"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s as JobStatus]}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="url" className="mb-1 block text-sm font-medium">Job URL</label>
        <Input
          id="url"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="salaryMin" className="mb-1 block text-sm font-medium">Salary Min</label>
          <Input
            id="salaryMin"
            type="number"
            value={form.salaryMin}
            onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
            placeholder="80000"
          />
        </div>
        <div>
          <label htmlFor="salaryMax" className="mb-1 block text-sm font-medium">Salary Max</label>
          <Input
            id="salaryMax"
            type="number"
            value={form.salaryMax}
            onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
            placeholder="120000"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="location" className="mb-1 block text-sm font-medium">Location</label>
          <Input
            id="location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="San Francisco, CA"
          />
        </div>
        <div className="flex items-end pb-1">
          <label htmlFor="remote" className="flex items-center gap-2 text-sm">
            <input
              id="remote"
              type="checkbox"
              checked={form.remote}
              onChange={(e) => setForm({ ...form, remote: e.target.checked })}
              className="rounded"
            />
            Remote
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">Notes</label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Referred by..., need to prep for..."
          rows={3}
        />
      </div>
    </div>
  );
}

function TableView({
  applications,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  applications: JobApplication[];
  onEdit: (app: JobApplication) => void;
  onDelete: (app: JobApplication) => void;
  onStatusChange: (app: JobApplication, status: string) => void;
}) {
  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No applications yet. Click "Add Application" to get started.
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
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Applied</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr
                  key={app.id}
                  className="border-b transition-colors hover:bg-accent/30 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <BriefcaseBusiness className="size-4 text-muted-foreground" />
                      <span className="font-medium">{app.company}</span>
                      {app.url && (
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${app.company} job posting`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{app.role}</td>
                  <td className="px-4 py-3">
                    <select
                      value={app.status}
                      onChange={(e) => onStatusChange(app, e.target.value)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold border-0 cursor-pointer",
                        STATUS_COLORS[app.status as JobStatus] ?? STATUS_COLORS.applied
                      )}
                    >
                      {JOB_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s as JobStatus]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {app.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {app.location}
                      </span>
                    )}
                    {app.remote && <Badge variant="outline" className="ml-1 text-[10px]">Remote</Badge>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(app.appliedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(app)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        onClick={() => onDelete(app)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineView({
  applications,
  onEdit,
  onStatusChange,
}: {
  applications: JobApplication[];
  onEdit: (app: JobApplication) => void;
  onStatusChange: (app: JobApplication, status: string) => void;
}) {
  const columns = PIPELINE_ORDER;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {columns.map((status) => {
        const columnApps = applications.filter((a) => a.status === status);
        return (
          <div key={status} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{STATUS_LABELS[status]}</h3>
              <Badge variant="outline" className="text-xs">{columnApps.length}</Badge>
            </div>
            <div className="space-y-2">
              {columnApps.map((app) => (
                <Card
                  key={app.id}
                  className="cursor-pointer transition-colors hover:bg-accent/30"
                  onClick={() => onEdit(app)}
                >
                  <CardContent className="p-3">
                    <p className="text-sm font-semibold">{app.company}</p>
                    <p className="text-xs text-muted-foreground">{app.role}</p>
                    {app.location && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {app.location}
                      </p>
                    )}
                    <div className="mt-2 flex gap-1">
                      {PIPELINE_ORDER.slice(PIPELINE_ORDER.indexOf(status as JobStatus) + 1)
                        .filter((s) => s !== "withdrawn")
                        .slice(0, 2)
                        .map((nextStatus) => (
                          <button
                            key={nextStatus}
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusChange(app, nextStatus);
                            }}
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                              STATUS_COLORS[nextStatus]
                            )}
                          >
                            → {STATUS_LABELS[nextStatus]}
                          </button>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {columnApps.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">No apps</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
