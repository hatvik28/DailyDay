import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getFitbitHealthData } from "./fitbit";

// ── Fetch mocking helpers ──

type MockResponse = {
  ok: boolean;
  status: number;
  statusText?: string;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
};

function makeResponse(init: MockResponse): Response {
  return {
    ok: init.ok,
    status: init.status,
    statusText: init.statusText ?? "",
    json: init.json ?? (async () => ({})),
    text: init.text ?? (async () => ""),
  } as unknown as Response;
}

// Minimal valid Fitbit API payloads for each endpoint, enough for the
// parsers in getFitbitHealthData to construct a non-null shape.
const VALID_ACTIVITY = {
  summary: {
    steps: 8500,
    distances: [{ activity: "total", distance: 6.2 }],
    floors: 12,
    caloriesOut: 2100,
    caloriesBMR: 1500,
    lightlyActiveMinutes: 120,
    fairlyActiveMinutes: 20,
    veryActiveMinutes: 30,
    sedentaryMinutes: 800,
  },
  goals: { steps: 10000, distance: 8, caloriesOut: 2500, floors: 10 },
};

const VALID_HEART = {
  "activities-heart": [
    {
      value: {
        restingHeartRate: 62,
        heartRateZones: [
          { name: "Out of Range", min: 30, max: 90, minutes: 500, caloriesOut: 800 },
        ],
      },
    },
  ],
};

const VALID_SLEEP = {
  summary: {
    totalMinutesAsleep: 420,
    totalTimeInBed: 480,
    stages: { deep: 60, light: 240, rem: 90, wake: 30 },
  },
  sleep: [{ efficiency: 92 }],
};

const VALID_WEIGHT = {
  weight: [{ weight: 75.2, bmi: 23.1, date: "2026-04-14" }],
};

// Install a fetch mock that routes requests to responses based on path.
function installFetchMock(
  routes: Record<string, MockResponse | (() => MockResponse)>
) {
  const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    for (const [pattern, responder] of Object.entries(routes)) {
      if (url.includes(pattern)) {
        const resolved = typeof responder === "function" ? responder() : responder;
        return makeResponse(resolved);
      }
    }
    throw new Error(`Unexpected fetch to ${url}`);
  });
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Happy path ──

describe("getFitbitHealthData — all endpoints succeed", () => {
  it("returns parsed data for all four endpoints and no errors field", async () => {
    installFetchMock({
      "/activities/date/": { ok: true, status: 200, json: async () => VALID_ACTIVITY },
      "/activities/heart/date/": { ok: true, status: 200, json: async () => VALID_HEART },
      "/sleep/date/": { ok: true, status: 200, json: async () => VALID_SLEEP },
      "/body/log/weight/date/": { ok: true, status: 200, json: async () => VALID_WEIGHT },
    });

    const data = await getFitbitHealthData("fake-token", "2026-04-14");

    expect(data.activity?.steps).toBe(8500);
    expect(data.heartRate?.restingHeartRate).toBe(62);
    expect(data.sleep?.totalMinutesAsleep).toBe(420);
    expect(data.weight?.weight).toBe(75.2);
    expect(data.errors).toBeUndefined();
  });
});

// ── Partial failures: allSettled should preserve successes ──

describe("getFitbitHealthData — partial failures", () => {
  it("keeps successful endpoints and records per-endpoint errors", async () => {
    installFetchMock({
      "/activities/date/": { ok: true, status: 200, json: async () => VALID_ACTIVITY },
      "/activities/heart/date/": {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => '{"errors":["boom"]}',
      },
      "/sleep/date/": { ok: true, status: 200, json: async () => VALID_SLEEP },
      "/body/log/weight/date/": {
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => "blocked",
      },
    });

    const data = await getFitbitHealthData("fake-token", "2026-04-14");

    // Successful endpoints still populate
    expect(data.activity?.steps).toBe(8500);
    expect(data.sleep?.totalMinutesAsleep).toBe(420);

    // Failed endpoints are null
    expect(data.heartRate).toBeNull();
    expect(data.weight).toBeNull();

    // Per-endpoint errors captured
    expect(data.errors).toBeDefined();
    expect(data.errors?.heartRate).toContain("500");
    expect(data.errors?.weight).toContain("403");

    // No errors set for the successful endpoints
    expect(data.errors?.activity).toBeUndefined();
    expect(data.errors?.sleep).toBeUndefined();
  });

  it("includes a truncated response body snippet in the error message", async () => {
    const longBody = "x".repeat(1000);
    installFetchMock({
      "/activities/date/": {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => longBody,
      },
      "/activities/heart/date/": { ok: true, status: 200, json: async () => VALID_HEART },
      "/sleep/date/": { ok: true, status: 200, json: async () => VALID_SLEEP },
      "/body/log/weight/date/": { ok: true, status: 200, json: async () => VALID_WEIGHT },
    });

    const data = await getFitbitHealthData("fake-token", "2026-04-14");

    expect(data.errors?.activity).toBeDefined();
    // The thrown error snippet is capped at 200 chars in the message
    expect(data.errors!.activity!.length).toBeLessThan(400);
    expect(data.errors!.activity).toContain("500");
  });
});

// ── Token expiration propagation ──

describe("getFitbitHealthData — token expired", () => {
  it("rethrows FITBIT_TOKEN_EXPIRED so the route can refresh", async () => {
    installFetchMock({
      "/activities/date/": { ok: false, status: 401, text: async () => "unauthorized" },
      "/activities/heart/date/": { ok: true, status: 200, json: async () => VALID_HEART },
      "/sleep/date/": { ok: true, status: 200, json: async () => VALID_SLEEP },
      "/body/log/weight/date/": { ok: true, status: 200, json: async () => VALID_WEIGHT },
    });

    await expect(getFitbitHealthData("fake-token", "2026-04-14")).rejects.toThrow(
      "FITBIT_TOKEN_EXPIRED"
    );
  });
});

// ── Rate limit ──

describe("getFitbitHealthData — rate limit", () => {
  it("surfaces 429 as a per-endpoint error rather than silently dropping it", async () => {
    installFetchMock({
      "/activities/date/": { ok: true, status: 200, json: async () => VALID_ACTIVITY },
      "/activities/heart/date/": {
        ok: false,
        status: 429,
        text: async () => "rate limited",
      },
      "/sleep/date/": { ok: true, status: 200, json: async () => VALID_SLEEP },
      "/body/log/weight/date/": { ok: true, status: 200, json: async () => VALID_WEIGHT },
    });

    const data = await getFitbitHealthData("fake-token", "2026-04-14");

    expect(data.heartRate).toBeNull();
    expect(data.errors?.heartRate).toContain("rate limit");
    // Other endpoints still work
    expect(data.activity?.steps).toBe(8500);
  });
});

// ── Empty but valid payloads ──

describe("getFitbitHealthData — empty but valid responses", () => {
  it("returns nulls without errors when Fitbit returns 200 with missing fields", async () => {
    installFetchMock({
      "/activities/date/": { ok: true, status: 200, json: async () => ({}) },
      "/activities/heart/date/": { ok: true, status: 200, json: async () => ({}) },
      "/sleep/date/": { ok: true, status: 200, json: async () => ({}) },
      "/body/log/weight/date/": { ok: true, status: 200, json: async () => ({}) },
    });

    const data = await getFitbitHealthData("fake-token", "2026-04-14");

    expect(data.activity).toBeNull();
    expect(data.heartRate).toBeNull();
    expect(data.sleep).toBeNull();
    expect(data.weight).toBeNull();
    // Empty response is not an error — it's "no data for this date"
    expect(data.errors).toBeUndefined();
  });
});
