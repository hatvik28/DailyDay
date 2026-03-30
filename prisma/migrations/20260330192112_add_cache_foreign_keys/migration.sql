-- DropIndex
DROP INDEX "GmailCache_userId_idx";

-- AddForeignKey
ALTER TABLE "FitbitDailyCache" ADD CONSTRAINT "FitbitDailyCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GmailCache" ADD CONSTRAINT "GmailCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
