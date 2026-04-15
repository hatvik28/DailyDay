import crypto from "crypto";

const FITBIT_AUTH_URL = "https://www.fitbit.com/oauth2/authorize";
const FITBIT_TOKEN_URL = "https://api.fitbit.com/oauth2/token";
const FITBIT_API_BASE = "https://api.fitbit.com";

const SCOPES = "activity heartrate sleep weight profile";

function getClientId(): string {
  const id = process.env.FITBIT_CLIENT_ID;
  if (!id) throw new Error("FITBIT_CLIENT_ID is not set");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.FITBIT_CLIENT_SECRET;
  if (!secret) throw new Error("FITBIT_CLIENT_SECRET is not set");
  return secret;
}

function getRedirectUri(): string {
  return process.env.FITBIT_REDIRECT_URI ?? "http://localhost:3000/api/fitbit/callback";
}

// --- PKCE ---

export function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

// --- OAuth URLs ---

export function getAuthorizationUrl(codeChallenge: string, state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: "code",
    scope: SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    redirect_uri: getRedirectUri(),
    state,
  });
  return `${FITBIT_AUTH_URL}?${params.toString()}`;
}

// --- Token exchange ---

function getBasicAuthHeader(): string {
  const encoded = Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64");
  return `Basic ${encoded}`;
}

export interface FitbitTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  user_id: string;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<FitbitTokenResponse> {
  const body = new URLSearchParams({
    client_id: getClientId(),
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: getRedirectUri(),
  });

  const res = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Fitbit token exchange failed:", res.status, text);
    throw new Error(`Token exchange failed: ${res.status}`);
  }

  return res.json();
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<FitbitTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: getClientId(),
  });

  const res = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Fitbit token refresh failed:", res.status, text);
    throw new Error(`Token refresh failed: ${res.status}`);
  }

  return res.json();
}

// --- Data fetching ---

async function fitbitGet(accessToken: string, path: string) {
  const res = await fetch(`${FITBIT_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (res.status === 401) {
    throw new Error("FITBIT_TOKEN_EXPIRED");
  }

  if (res.status === 429) {
    throw new Error("Fitbit rate limit exceeded. Please try again later.");
  }

  if (!res.ok) {
    // Read the body so we can see what Fitbit actually complained about.
    // Truncate to avoid flooding logs with huge HTML error pages.
    let bodySnippet: string;
    try {
      const text = await res.text();
      bodySnippet = text.slice(0, 500);
    } catch {
      bodySnippet = "<failed to read response body>";
    }
    console.error(`Fitbit API error: ${path} → ${res.status} ${res.statusText} — body: ${bodySnippet}`);
    throw new Error(`Fitbit ${path} returned ${res.status}: ${bodySnippet.slice(0, 200)}`);
  }

  return res.json();
}

export interface FitbitHealthData {
  activity: {
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
  } | null;
  heartRate: {
    restingHeartRate: number | null;
    zones: { name: string; min: number; max: number; minutes: number; caloriesOut: number }[];
  } | null;
  sleep: {
    totalMinutesAsleep: number;
    totalTimeInBed: number;
    efficiency: number;
    stages: { deep: number; light: number; rem: number; wake: number } | null;
  } | null;
  weight: {
    weight: number;
    bmi: number;
    date: string;
  } | null;
  /**
   * Per-endpoint error messages. A key is only present if that specific Fitbit
   * endpoint failed. Callers should surface these to the UI so empty metrics
   * are distinguishable from silently broken ones.
   */
  errors?: {
    activity?: string;
    heartRate?: string;
    sleep?: string;
    weight?: string;
  };
}

export async function getFitbitHealthData(
  accessToken: string,
  date: string
): Promise<FitbitHealthData> {
  // Use allSettled so one failing endpoint doesn't wipe the other three.
  // Each settled result is either { status: "fulfilled", value } or
  // { status: "rejected", reason }.
  const [activityResult, heartResult, sleepResult, weightResult] = await Promise.allSettled([
    fitbitGet(accessToken, `/1/user/-/activities/date/${date}.json`),
    fitbitGet(accessToken, `/1/user/-/activities/heart/date/${date}/1d.json`),
    fitbitGet(accessToken, `/1.2/user/-/sleep/date/${date}.json`),
    fitbitGet(accessToken, `/1/user/-/body/log/weight/date/${date}.json`),
  ]);

  // If any endpoint returned FITBIT_TOKEN_EXPIRED, surface it so the route
  // handler can trigger a refresh + retry (same behavior as before).
  for (const r of [activityResult, heartResult, sleepResult, weightResult]) {
    if (r.status === "rejected" && r.reason instanceof Error && r.reason.message === "FITBIT_TOKEN_EXPIRED") {
      throw r.reason;
    }
  }

  const errors: NonNullable<FitbitHealthData["errors"]> = {};
  const errorMessage = (reason: unknown): string =>
    reason instanceof Error ? reason.message : String(reason);

  const activityRaw = activityResult.status === "fulfilled" ? activityResult.value : null;
  if (activityResult.status === "rejected") errors.activity = errorMessage(activityResult.reason);

  const heartRaw = heartResult.status === "fulfilled" ? heartResult.value : null;
  if (heartResult.status === "rejected") errors.heartRate = errorMessage(heartResult.reason);

  const sleepRaw = sleepResult.status === "fulfilled" ? sleepResult.value : null;
  if (sleepResult.status === "rejected") errors.sleep = errorMessage(sleepResult.reason);

  const weightRaw = weightResult.status === "fulfilled" ? weightResult.value : null;
  if (weightResult.status === "rejected") errors.weight = errorMessage(weightResult.reason);

  // Parse activity
  let activity: FitbitHealthData["activity"] = null;
  if (activityRaw?.summary) {
    const s = activityRaw.summary;
    activity = {
      steps: s.steps ?? 0,
      distance: s.distances?.find((d: { activity: string }) => d.activity === "total")?.distance ?? 0,
      floors: s.floors ?? 0,
      caloriesOut: s.caloriesOut ?? 0,
      caloriesBMR: s.caloriesBMR ?? 0,
      activeCalories: (s.caloriesOut ?? 0) - (s.caloriesBMR ?? 0),
      lightlyActiveMinutes: s.lightlyActiveMinutes ?? 0,
      fairlyActiveMinutes: s.fairlyActiveMinutes ?? 0,
      veryActiveMinutes: s.veryActiveMinutes ?? 0,
      sedentaryMinutes: s.sedentaryMinutes ?? 0,
      goals: activityRaw.goals ?? { steps: 10000, distance: 8, caloriesOut: 2500, floors: 10 },
    };
  }

  // Parse heart rate
  let heartRate: FitbitHealthData["heartRate"] = null;
  if (heartRaw?.["activities-heart"]?.[0]?.value) {
    const v = heartRaw["activities-heart"][0].value;
    heartRate = {
      restingHeartRate: v.restingHeartRate ?? null,
      zones: (v.heartRateZones ?? []).map(
        (z: { name: string; min: number; max: number; minutes: number; caloriesOut: number }) => ({
          name: z.name,
          min: z.min,
          max: z.max,
          minutes: z.minutes,
          caloriesOut: z.caloriesOut,
        })
      ),
    };
  }

  // Parse sleep
  let sleep: FitbitHealthData["sleep"] = null;
  if (sleepRaw?.summary) {
    const summary = sleepRaw.summary;
    sleep = {
      totalMinutesAsleep: summary.totalMinutesAsleep ?? 0,
      totalTimeInBed: summary.totalTimeInBed ?? 0,
      efficiency: sleepRaw.sleep?.[0]?.efficiency ?? 0,
      stages: summary.stages
        ? {
            deep: summary.stages.deep ?? 0,
            light: summary.stages.light ?? 0,
            rem: summary.stages.rem ?? 0,
            wake: summary.stages.wake ?? 0,
          }
        : null,
    };
  }

  // Parse weight
  let weight: FitbitHealthData["weight"] = null;
  if (weightRaw?.weight?.length > 0) {
    const latest = weightRaw.weight[weightRaw.weight.length - 1];
    weight = {
      weight: latest.weight,
      bmi: latest.bmi,
      date: latest.date,
    };
  }

  return {
    activity,
    heartRate,
    sleep,
    weight,
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
  };
}

// --- Token revocation ---

export async function revokeToken(accessToken: string): Promise<void> {
  try {
    await fetch("https://api.fitbit.com/oauth2/revoke", {
      method: "POST",
      headers: {
        Authorization: getBasicAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ token: accessToken }).toString(),
    });
  } catch {
    // Best-effort revocation; don't block on failure
  }
}
