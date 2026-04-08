-- CreateTable
CREATE TABLE "NeetcodeProblem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL DEFAULT '',
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "topic" TEXT NOT NULL DEFAULT 'arrays_hashing',
    "listTag" TEXT NOT NULL DEFAULT 'neetcode_150',
    "timeMinutes" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "solvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeetcodeProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeetcodeReview" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "reviewNumber" INTEGER NOT NULL,
    "quality" TEXT NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeMinutes" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NeetcodeReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NeetcodeProblem_userId_idx" ON "NeetcodeProblem"("userId");

-- CreateIndex
CREATE INDEX "NeetcodeProblem_userId_topic_idx" ON "NeetcodeProblem"("userId", "topic");

-- CreateIndex
CREATE INDEX "NeetcodeReview_problemId_idx" ON "NeetcodeReview"("problemId");

-- AddForeignKey
ALTER TABLE "NeetcodeProblem" ADD CONSTRAINT "NeetcodeProblem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeetcodeReview" ADD CONSTRAINT "NeetcodeReview_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "NeetcodeProblem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
