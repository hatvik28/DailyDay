ALTER TABLE "Task" ADD COLUMN "startTime" TEXT;
ALTER TABLE "Task" ADD COLUMN "endTime" TEXT;
ALTER TABLE "Task" ADD COLUMN "estimatedMinutes" INTEGER;
ALTER TABLE "Task" ADD COLUMN "completionNote" TEXT;

CREATE TABLE "TaskSubitem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaskSubitem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TaskSubitem_taskId_idx" ON "TaskSubitem"("taskId");
