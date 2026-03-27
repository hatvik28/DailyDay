"use client";

import { useState, useEffect, useCallback, Suspense, type ComponentType } from "react";
import { useSearchParams } from "next/navigation";
import {
  Footprints,
  Flame,
  Heart,
  Moon,
  Dumbbell,
  Scale,
  Loader2,
  Unplug,
  Plug,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn, formatDateKey } from "@/lib/utils";
import DayNavigation from "@/components/dashboard/DayNavigation";

interface ActivityData {
  steps: number;
  distance: number;
  floors: number;
  caloriesOut: number;
  caloriesBMR: number;
  activeCalories: number;
  lightlyActiveMinutes: number;
  fairlyActiveMinutes: number;
  veryActiveMinutes: number;
  sedentaryMinutes: number;
  goals: { steps: number; distance: number; caloriesOut: number; floors: number };
}

interface HeartRateData {
  restingHeartRate: number | null;
  zones: { name: string; min: number; max: number; minutes: number; caloriesOut: number }[];
}

interface SleepData {
  totalMinutesAsleep: number;
  totalTimeInBed: number;
  efficiency: number;
  stages: { deep: number; light: number; rem: number; wake: number } | null;
}

interface WeightData {
  weight: number;
  bmi: number;
  date: string;
}

interface HealthResponse {
  connected: boolean;
  error?: string;
  date?: string;
  activity?: ActivityData | null;
  heartRate?: HeartRateData | null;
  sleep?: SleepData | null;
  weight?: WeightData | null;
}

const EMPTY_METRIC_STYLES = {
  emerald: {
    surface: "bg-emerald-100 dark:bg-emerald-950",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  orange: {
    surface: "bg-orange-100 dark:bg-orange-950",
    icon: "text-orange-600 dark:text-orange-400",
  },
  red: {
    surface: "bg-red-100 dark:bg-red-950",
    icon: "text-red-600 dark:text-red-400",
  },
  indigo: {
    surface: "bg-indigo-100 dark:bg-indigo-950",
    icon: "text-indigo-600 dark:text-indigo-400",
  },
  violet: {
    surface: "bg-violet-100 dark:bg-violet-950",
    icon: "text-violet-600 dark:text-violet-400",
  },
  teal: {
    surface: "bg-teal-100 dark:bg-teal-950",
    icon: "text-teal-600 dark:text-teal-400",
  },
} as const;

const OAUTH_ERRORS: Record<string, string> = {
  access_denied: "Fitbit access was denied. Please try again and approve all permissions.",
  no_code: "No authorization code received from Fitbit.",
  session_expired: "OAuth session expired. Please try connecting again.",
  state_mismatch: "Security check failed. Please try connecting again.",
  token_exchange_failed: "Failed to connect with Fitbit. Please try again.",
};

// --- Metric Card Components ---

function StepsCard({ data }: { data: ActivityData }) {
  const goalPercent = Math.min(100, Math.round((data.steps / data.goals.steps) * 100));
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-950">
          <Footprints className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <CardTitle className="text-base">Steps</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">{data.steps.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">/ {data.goals.steps.toLocaleString()}</span>
        </div>
        <Progress value={goalPercent} className="h-2" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>Distance</span>
          <span className="text-right font-medium text-foreground">{data.distance.toFixed(2)} km</span>
          <span>Floors</span>
          <span className="text-right font-medium text-foreground">{data.floors}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function CaloriesCard({ data }: { data: ActivityData }) {
  const goalPercent = Math.min(100, Math.round((data.caloriesOut / data.goals.caloriesOut) * 100));
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-950">
          <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        </div>
        <CardTitle className="text-base">Calories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">{data.caloriesOut.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">kcal burned</span>
        </div>
        <Progress value={goalPercent} className="h-2" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>BMR</span>
          <span className="text-right font-medium text-foreground">{data.caloriesBMR.toLocaleString()} kcal</span>
          <span>Active</span>
          <span className="text-right font-medium text-foreground">{data.activeCalories.toLocaleString()} kcal</span>
        </div>
      </CardContent>
    </Card>
  );
}

function HeartRateCard({ data }: { data: HeartRateData }) {
  const ZONE_COLORS: Record<string, string> = {
    "Out of Range": "bg-zinc-300 dark:bg-zinc-600",
    "Fat Burn": "bg-yellow-400 dark:bg-yellow-500",
    "Cardio": "bg-orange-500 dark:bg-orange-400",
    "Peak": "bg-red-500 dark:bg-red-400",
  };
  const totalMinutes = data.zones.reduce((sum, z) => sum + z.minutes, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="rounded-lg bg-red-100 p-2 dark:bg-red-950">
          <Heart className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <CardTitle className="text-base">Heart Rate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.restingHeartRate != null ? (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">{data.restingHeartRate}</span>
            <span className="text-sm text-muted-foreground">bpm resting</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No resting heart rate data</p>
        )}

        {totalMinutes > 0 && (
          <div className="space-y-2">
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {data.zones.map((zone) => {
                const pct = totalMinutes > 0 ? (zone.minutes / totalMinutes) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={zone.name}
                    className={cn("h-full", ZONE_COLORS[zone.name] ?? "bg-zinc-400")}
                    style={{ width: `${pct}%` }}
                    title={`${zone.name}: ${zone.minutes} min`}
                  />
                );
              })}
            </div>
            <div className="space-y-1">
              {data.zones
                .filter((z) => z.minutes > 0)
                .map((zone) => (
                  <div key={zone.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2.5 w-2.5 rounded-full", ZONE_COLORS[zone.name] ?? "bg-zinc-400")} />
                      <span className="text-muted-foreground">{zone.name}</span>
                    </div>
                    <span className="font-medium tabular-nums">{zone.minutes} min</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SleepCard({ data }: { data: SleepData }) {
  const hours = Math.floor(data.totalMinutesAsleep / 60);
  const mins = data.totalMinutesAsleep % 60;

  const STAGE_COLORS = {
    deep: "bg-indigo-600 dark:bg-indigo-500",
    light: "bg-sky-400 dark:bg-sky-400",
    rem: "bg-purple-500 dark:bg-purple-400",
    wake: "bg-amber-400 dark:bg-amber-300",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-950">
          <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <CardTitle className="text-base">Sleep</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">
            {hours}h {mins}m
          </span>
          <span className="text-sm text-muted-foreground">asleep</span>
        </div>

        {data.stages && (
          <>
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {(Object.entries(data.stages) as [keyof typeof STAGE_COLORS, number][]).map(
                ([stage, minutes]) => {
                  const pct = data.totalTimeInBed > 0 ? (minutes / data.totalTimeInBed) * 100 : 0;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={stage}
                      className={cn("h-full", STAGE_COLORS[stage])}
                      style={{ width: `${pct}%` }}
                      title={`${stage}: ${minutes} min`}
                    />
                  );
                }
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {(Object.entries(data.stages) as [keyof typeof STAGE_COLORS, number][]).map(
                ([stage, minutes]) => (
                  <div key={stage} className="flex items-center gap-2">
                    <div className={cn("h-2.5 w-2.5 rounded-full", STAGE_COLORS[stage])} />
                    <span className="text-muted-foreground capitalize">{stage}</span>
                    <span className="ml-auto font-medium tabular-nums">{minutes}m</span>
                  </div>
                )
              )}
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>Time in bed</span>
          <span className="text-right font-medium text-foreground">
            {Math.floor(data.totalTimeInBed / 60)}h {data.totalTimeInBed % 60}m
          </span>
          <span>Efficiency</span>
          <span className="text-right font-medium text-foreground">{data.efficiency}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveMinutesCard({ data }: { data: ActivityData }) {
  const total = data.lightlyActiveMinutes + data.fairlyActiveMinutes + data.veryActiveMinutes;
  const segments = [
    { label: "Very active", minutes: data.veryActiveMinutes, color: "bg-red-500 dark:bg-red-400" },
    { label: "Fairly active", minutes: data.fairlyActiveMinutes, color: "bg-orange-400 dark:bg-orange-400" },
    { label: "Lightly active", minutes: data.lightlyActiveMinutes, color: "bg-yellow-400 dark:bg-yellow-300" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="rounded-lg bg-violet-100 p-2 dark:bg-violet-950">
          <Dumbbell className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <CardTitle className="text-base">Active Minutes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">{total}</span>
          <span className="text-sm text-muted-foreground">active minutes</span>
        </div>

        {total > 0 && (
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {segments.map((seg) => {
              const pct = total > 0 ? (seg.minutes / total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={seg.label}
                  className={cn("h-full", seg.color)}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
        )}

        <div className="space-y-1">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className={cn("h-2.5 w-2.5 rounded-full", seg.color)} />
                <span className="text-muted-foreground">{seg.label}</span>
              </div>
              <span className="font-medium tabular-nums">{seg.minutes} min</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm pt-1 border-t border-border">
            <span className="text-muted-foreground">Sedentary</span>
            <span className="font-medium tabular-nums">{data.sedentaryMinutes} min</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WeightCard({ data }: { data: WeightData }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="rounded-lg bg-teal-100 p-2 dark:bg-teal-950">
          <Scale className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        </div>
        <CardTitle className="text-base">Weight</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">{data.weight.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">kg</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>BMI</span>
          <span className="text-right font-medium text-foreground">{data.bmi.toFixed(1)}</span>
          <span>Recorded</span>
          <span className="text-right font-medium text-foreground">{data.date}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main page ---

function HealthContent() {
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState(() => formatDateKey(new Date()));
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);

  // Check for OAuth error from redirect
  const oauthError = searchParams.get("error");

  const fetchData = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fitbit/data?date=${date}`);
      if (!res.ok) {
        throw new Error("Failed to fetch health data");
      }
      const json: HealthResponse = await res.json();
      setData(json);
      if (json.error) {
        setError(json.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(currentDate);
  }, [currentDate, fetchData]);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/fitbit/disconnect", { method: "POST" });
      if (res.ok) {
        setData({ connected: false });
        setShowDisconnect(false);
      } else {
        setError("Failed to disconnect Fitbit");
      }
    } catch {
      setError("Network error while disconnecting");
    } finally {
      setDisconnecting(false);
    }
  }

  // Not connected state
  if (!loading && data && !data.connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Health</h1>
          <p className="text-muted-foreground">Connect your Fitbit to see health metrics</p>
        </div>

        {(oauthError || error) && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/40">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-900 dark:text-red-100">
                {oauthError ? OAUTH_ERRORS[oauthError] ?? "An error occurred during Fitbit authorization." : error}
              </p>
            </div>
          </div>
        )}

        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="rounded-full bg-primary/10 p-4">
              <Plug className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold">Connect Fitbit</h2>
              <p className="text-sm text-muted-foreground">
                Link your Fitbit account to see steps, heart rate, sleep, calories, and more.
              </p>
            </div>
            <a
              href="/api/fitbit/connect"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              Connect Fitbit
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Health</h1>
          <p className="text-muted-foreground">Your Fitbit health metrics</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDisconnect(true)}
          className="shrink-0"
        >
          <Unplug className="h-4 w-4 mr-1.5" />
          Disconnect
        </Button>
      </div>

      <DayNavigation date={currentDate} onDateChange={setCurrentDate} />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchData(currentDate)}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.activity ? (
            <StepsCard data={data.activity} />
          ) : (
            <EmptyMetricCard icon={Footprints} label="Steps" color="emerald" />
          )}

          {data?.activity ? (
            <CaloriesCard data={data.activity} />
          ) : (
            <EmptyMetricCard icon={Flame} label="Calories" color="orange" />
          )}

          {data?.heartRate ? (
            <HeartRateCard data={data.heartRate} />
          ) : (
            <EmptyMetricCard icon={Heart} label="Heart Rate" color="red" />
          )}

          {data?.sleep ? (
            <SleepCard data={data.sleep} />
          ) : (
            <EmptyMetricCard icon={Moon} label="Sleep" color="indigo" />
          )}

          {data?.activity ? (
            <ActiveMinutesCard data={data.activity} />
          ) : (
            <EmptyMetricCard icon={Dumbbell} label="Active Minutes" color="violet" />
          )}

          {data?.weight ? (
            <WeightCard data={data.weight} />
          ) : (
            <EmptyMetricCard icon={Scale} label="Weight" color="teal" />
          )}
        </div>
      )}

      {/* Disconnect confirmation dialog */}
      <Dialog open={showDisconnect} onOpenChange={setShowDisconnect}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Fitbit?</DialogTitle>
            <DialogDescription>
              This will remove your Fitbit connection. You can reconnect anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisconnect(false)} disabled={disconnecting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting}>
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyMetricCard({
  icon: Icon,
  label,
  color,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  color: keyof typeof EMPTY_METRIC_STYLES;
}) {
  const styles = EMPTY_METRIC_STYLES[color];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className={cn("rounded-lg p-2", styles.surface)}>
          <Icon className={cn("h-5 w-5", styles.icon)} />
        </div>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">No data for this date</p>
      </CardContent>
    </Card>
  );
}

export default function HealthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <HealthContent />
    </Suspense>
  );
}
