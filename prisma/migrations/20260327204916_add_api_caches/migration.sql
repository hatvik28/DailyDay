-- CreateTable
CREATE TABLE "FitbitDailyCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "steps" INTEGER,
    "distance" REAL,
    "floors" INTEGER,
    "caloriesOut" INTEGER,
    "caloriesBMR" INTEGER,
    "activeCalories" INTEGER,
    "lightlyActiveMins" INTEGER,
    "fairlyActiveMins" INTEGER,
    "veryActiveMins" INTEGER,
    "sedentaryMins" INTEGER,
    "stepGoal" INTEGER,
    "restingHeartRate" INTEGER,
    "sleepMinutes" INTEGER,
    "sleepTimeInBed" INTEGER,
    "sleepEfficiency" INTEGER,
    "sleepDeep" INTEGER,
    "sleepLight" INTEGER,
    "sleepRem" INTEGER,
    "sleepWake" INTEGER,
    "weight" REAL,
    "bmi" REAL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GmailCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "FitbitDailyCache_userId_idx" ON "FitbitDailyCache"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FitbitDailyCache_userId_date_key" ON "FitbitDailyCache"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "GmailCache_userId_key" ON "GmailCache"("userId");

-- CreateIndex
CREATE INDEX "GmailCache_userId_idx" ON "GmailCache"("userId");
