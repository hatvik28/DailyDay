export interface TaskTimerInput {
  durationMinutes?: number | null;
  timerStatus?: string | null;
  timerStartedAt?: string | Date | null;
  timerEndsAt?: string | Date | null;
  timerOutcome?: string | null;
}

export interface ReorderableTask {
  id: string;
  position: number;
}

export type TimerStatus = "idle" | "running" | "paused";
export type TimerOutcome = "completed" | "extended" | "not_done" | null;

function normalizeOptionalString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeDateValue(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeDurationMinutes(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

export function validateTaskTimer(input: TaskTimerInput): string | null {
  const durationMinutes = normalizeDurationMinutes(input.durationMinutes);
  const timerStatus = normalizeTimerStatus(input.timerStatus);
  const timerStartedAt = normalizeDateValue(input.timerStartedAt);
  const timerEndsAt = normalizeDateValue(input.timerEndsAt);

  if (durationMinutes !== null && durationMinutes <= 0) {
    return "Duration must be greater than 0";
  }

  if (timerStatus === "running") {
    if (!timerStartedAt || !timerEndsAt) {
      return "Running timers need a start and end time";
    }
    if (timerEndsAt.getTime() <= timerStartedAt.getTime()) {
      return "Timer end must be after timer start";
    }
  }

  return null;
}

export function normalizeTimerStatus(value: string | null | undefined): TimerStatus {
  if (value === "running" || value === "paused") return value;
  return "idle";
}

export function normalizeTimerOutcome(value: string | null | undefined): TimerOutcome {
  if (value === "completed" || value === "extended" || value === "not_done") {
    return value;
  }
  return null;
}

export function formatDurationMinutes(value: number | null | undefined) {
  const safe = normalizeDurationMinutes(value);
  if (!safe || safe <= 0) return null;
  if (safe < 60) return `${safe}m`;
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function getTimerRemainingMs(input: TaskTimerInput, now = new Date()) {
  const endsAt = normalizeDateValue(input.timerEndsAt);
  if (!endsAt) return 0;
  return Math.max(0, endsAt.getTime() - now.getTime());
}

export function isTimerExpired(input: TaskTimerInput, now = new Date()) {
  return normalizeTimerStatus(input.timerStatus) === "running" && getTimerRemainingMs(input, now) === 0;
}

export function formatRemainingMs(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatTaskTimerLabel(input: TaskTimerInput, now = new Date()) {
  const durationLabel = formatDurationMinutes(input.durationMinutes);
  if (normalizeTimerStatus(input.timerStatus) === "running") {
    return formatRemainingMs(getTimerRemainingMs(input, now));
  }
  if (isTimerExpired(input, now)) {
    return "Timer done";
  }
  return durationLabel;
}

export function sanitizeCompletionNote(value: string | null | undefined): string | null {
  return normalizeOptionalString(value);
}

export function buildTaskPositionUpdates(taskIds: string[], tasks: ReorderableTask[]) {
  const knownIds = new Set(tasks.map((task) => task.id));
  const uniqueTaskIds = taskIds.filter(
    (taskId, index) => knownIds.has(taskId) && taskIds.indexOf(taskId) === index
  );

  if (uniqueTaskIds.length !== tasks.length) {
    return null;
  }

  return uniqueTaskIds.map((taskId, index) => ({
    id: taskId,
    position: index,
  }));
}
