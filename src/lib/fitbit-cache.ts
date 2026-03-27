/**
 * Fitbit API cache layer.
 *
 * Stores daily health metrics in `FitbitDailyCache` so we don't
 * re-fetch from the Fitbit API on every dashboard load.
 *
 * Cache TTL: 1 hour per day-entry.
 */

import { prisma } from "@/lib/prisma";
import { getFitbitHealthData, type FitbitHealthData } from "@/lib/fitbit";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedFitbitDay {
  activity: FitbitHealthData["activity"];
  heartRate: FitbitHealthData["heartRate"];
  sleep: FitbitHealthData["sleep"];
  weight: FitbitHealthData["weight"];
}

/**
 * Return cached Fitbit data for a single day, or fetch + cache if stale/missing.
 */
export async function getCachedFitbitDay(
  userId: string,
  accessToken: string,
  date: string
): Promise<FitbitHealthData> {
  // --- Check cache ---
  const cached = await prisma.fitbitDailyCache.findUnique({
    where: { userId_date: { userId, date } },
  });

  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return hydrate(cached);
  }

  // --- Cache miss or stale — fetch from API ---
  console.log(`[Fitbit Cache] MISS for ${date} — fetching from API`);
  const fresh = await getFitbitHealthData(accessToken, date);

  // --- Write to cache ---
  await prisma.fitbitDailyCache.upsert({
    where: { userId_date: { userId, date } },
    update: flatten(fresh),
    create: { userId, date, ...flatten(fresh) },
  });

  return fresh;
}

/**
 * Fetch multiple days, using the cache for each.
 */
export async function getCachedFitbitDays(
  userId: string,
  accessToken: string,
  dates: string[]
): Promise<FitbitHealthData[]> {
  return Promise.all(
    dates.map((date) => getCachedFitbitDay(userId, accessToken, date))
  );
}

// --- Helpers: flatten FitbitHealthData → DB columns ---

function flatten(data: FitbitHealthData) {
  return {
    steps: data.activity?.steps ?? null,
    distance: data.activity?.distance ?? null,
    floors: data.activity?.floors ?? null,
    caloriesOut: data.activity?.caloriesOut ?? null,
    caloriesBMR: data.activity?.caloriesBMR ?? null,
    activeCalories: data.activity?.activeCalories ?? null,
    lightlyActiveMins: data.activity?.lightlyActiveMinutes ?? null,
    fairlyActiveMins: data.activity?.fairlyActiveMinutes ?? null,
    veryActiveMins: data.activity?.veryActiveMinutes ?? null,
    sedentaryMins: data.activity?.sedentaryMinutes ?? null,
    stepGoal: data.activity?.goals.steps ?? null,
    restingHeartRate: data.heartRate?.restingHeartRate ?? null,
    sleepMinutes: data.sleep?.totalMinutesAsleep ?? null,
    sleepTimeInBed: data.sleep?.totalTimeInBed ?? null,
    sleepEfficiency: data.sleep?.efficiency ?? null,
    sleepDeep: data.sleep?.stages?.deep ?? null,
    sleepLight: data.sleep?.stages?.light ?? null,
    sleepRem: data.sleep?.stages?.rem ?? null,
    sleepWake: data.sleep?.stages?.wake ?? null,
    weight: data.weight?.weight ?? null,
    bmi: data.weight?.bmi ?? null,
    fetchedAt: new Date(),
  };
}

// --- Helpers: hydrate DB row → FitbitHealthData ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hydrate(row: any): FitbitHealthData {
  const hasActivity = row.steps !== null;
  const hasHeart = row.restingHeartRate !== null;
  const hasSleep = row.sleepMinutes !== null;
  const hasWeight = row.weight !== null;

  return {
    activity: hasActivity
      ? {
          steps: row.steps,
          distance: row.distance ?? 0,
          floors: row.floors ?? 0,
          caloriesOut: row.caloriesOut ?? 0,
          caloriesBMR: row.caloriesBMR ?? 0,
          activeCalories: row.activeCalories ?? 0,
          lightlyActiveMinutes: row.lightlyActiveMins ?? 0,
          fairlyActiveMinutes: row.fairlyActiveMins ?? 0,
          veryActiveMinutes: row.veryActiveMins ?? 0,
          sedentaryMinutes: row.sedentaryMins ?? 0,
          goals: {
            steps: row.stepGoal ?? 10000,
            distance: 8,
            caloriesOut: 2500,
            floors: 10,
          },
        }
      : null,
    heartRate: hasHeart
      ? { restingHeartRate: row.restingHeartRate, zones: [] }
      : null,
    sleep: hasSleep
      ? {
          totalMinutesAsleep: row.sleepMinutes,
          totalTimeInBed: row.sleepTimeInBed ?? 0,
          efficiency: row.sleepEfficiency ?? 0,
          stages:
            row.sleepDeep !== null
              ? {
                  deep: row.sleepDeep,
                  light: row.sleepLight ?? 0,
                  rem: row.sleepRem ?? 0,
                  wake: row.sleepWake ?? 0,
                }
              : null,
        }
      : null,
    weight: hasWeight
      ? { weight: row.weight, bmi: row.bmi ?? 0, date: row.date }
      : null,
  };
}
