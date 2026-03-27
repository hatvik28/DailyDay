import { describe, it, expect } from "vitest";
import {
  formatDateKey,
  parseDateKey,
  clamp,
  isValidPriority,
  isValidFrequency,
  isValidHexColor,
} from "./utils";

describe("formatDateKey", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(formatDateKey(new Date(2026, 2, 27))).toBe("2026-03-27");
  });

  it("zero-pads single digit months and days", () => {
    expect(formatDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("parseDateKey", () => {
  it("parses YYYY-MM-DD into a Date", () => {
    const date = parseDateKey("2026-03-27");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2); // 0-indexed
    expect(date.getDate()).toBe(27);
  });
});

describe("clamp", () => {
  it("clamps below minimum", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps above maximum", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("returns value when in range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe("isValidPriority", () => {
  it("accepts low, medium, high", () => {
    expect(isValidPriority("low")).toBe(true);
    expect(isValidPriority("medium")).toBe(true);
    expect(isValidPriority("high")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isValidPriority("urgent")).toBe(false);
    expect(isValidPriority(123)).toBe(false);
    expect(isValidPriority(null)).toBe(false);
  });
});

describe("isValidFrequency", () => {
  it("accepts daily, weekdays, weekends", () => {
    expect(isValidFrequency("daily")).toBe(true);
    expect(isValidFrequency("weekdays")).toBe(true);
    expect(isValidFrequency("weekends")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isValidFrequency("monthly")).toBe(false);
    expect(isValidFrequency(null)).toBe(false);
  });
});

describe("isValidHexColor", () => {
  it("accepts valid hex colors", () => {
    expect(isValidHexColor("#6366f1")).toBe(true);
    expect(isValidHexColor("#FF00AA")).toBe(true);
  });

  it("rejects invalid hex colors", () => {
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("#fff")).toBe(false); // 3-char not accepted
    expect(isValidHexColor("#GGGGGG")).toBe(false);
    expect(isValidHexColor(null)).toBe(false);
  });
});
