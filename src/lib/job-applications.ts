/**
 * Job application types and validation helpers.
 * Business logic layer — no Prisma or API concerns.
 */

import { isValidISODate } from "./utils";

export const JOB_STATUSES = [
  "applied",
  "phone_screen",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const STATUS_LABELS: Record<JobStatus, string> = {
  applied: "Applied",
  phone_screen: "Phone Screen",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const STATUS_COLORS: Record<JobStatus, string> = {
  applied: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  phone_screen: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  interview: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  offer: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  withdrawn: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
};

/** Pipeline order for Kanban-style display */
export const PIPELINE_ORDER: JobStatus[] = [
  "applied",
  "phone_screen",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

export function isValidJobStatus(value: unknown): value is JobStatus {
  return typeof value === "string" && JOB_STATUSES.includes(value as JobStatus);
}

export interface JobApplicationInput {
  company?: string;
  role?: string;
  status?: string;
  url?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  location?: string;
  remote?: boolean;
  notes?: string;
  appliedAt?: string;
  respondedAt?: string;
}

export function validateJobApplication(input: JobApplicationInput): string | null {
  if (!input.company?.trim()) return "Company is required";
  if (typeof input.company !== "string") return "Company must be a string";
  if (!input.role?.trim()) return "Role is required";
  if (typeof input.role !== "string") return "Role must be a string";
  if (input.status !== undefined && typeof input.status !== "string") return "Status must be a string";
  if (input.status && !isValidJobStatus(input.status)) {
    return `Invalid status. Must be one of: ${JOB_STATUSES.join(", ")}`;
  }
  if (input.url !== undefined && typeof input.url !== "string") return "URL must be a string";
  if (input.location !== undefined && typeof input.location !== "string") return "Location must be a string";
  if (input.notes !== undefined && typeof input.notes !== "string") return "Notes must be a string";
  if (input.remote !== undefined && typeof input.remote !== "boolean") return "Remote must be a boolean";
  if (input.salaryMin != null) {
    if (typeof input.salaryMin !== "number" || !Number.isFinite(input.salaryMin)) {
      return "Salary minimum must be a finite number";
    }
    if (input.salaryMin < 0) return "Salary minimum cannot be negative";
  }
  if (input.salaryMax != null) {
    if (typeof input.salaryMax !== "number" || !Number.isFinite(input.salaryMax)) {
      return "Salary maximum must be a finite number";
    }
    if (input.salaryMax < 0) return "Salary maximum cannot be negative";
  }
  if (input.salaryMin != null && input.salaryMax != null && input.salaryMin > input.salaryMax) {
    return "Salary minimum cannot exceed maximum";
  }
  if (input.appliedAt !== undefined) {
    if (typeof input.appliedAt !== "string" || !isValidISODate(input.appliedAt)) {
      return "appliedAt must be a valid ISO date (YYYY-MM-DD)";
    }
  }
  if (input.respondedAt !== undefined) {
    if (typeof input.respondedAt !== "string" || !isValidISODate(input.respondedAt)) {
      return "respondedAt must be a valid ISO date (YYYY-MM-DD)";
    }
  }
  return null;
}

export interface JobStats {
  total: number;
  byStatus: Record<JobStatus, number>;
  responseRate: number; // % that moved past "applied"
}

export function computeJobStats(statuses: string[]): JobStats {
  const byStatus = Object.fromEntries(JOB_STATUSES.map((s) => [s, 0])) as Record<JobStatus, number>;

  for (const status of statuses) {
    if (isValidJobStatus(status)) {
      byStatus[status]++;
    }
  }

  const total = statuses.length;
  const responded = total - byStatus.applied;
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

  return { total, byStatus, responseRate };
}
