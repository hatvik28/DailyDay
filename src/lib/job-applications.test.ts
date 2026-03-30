import { describe, it, expect } from "vitest";
import {
  isValidJobStatus,
  validateJobApplication,
  computeJobStats,
  JOB_STATUSES,
  STATUS_LABELS,
  PIPELINE_ORDER,
} from "./job-applications";

describe("isValidJobStatus", () => {
  it("accepts all valid statuses", () => {
    for (const status of JOB_STATUSES) {
      expect(isValidJobStatus(status)).toBe(true);
    }
  });

  it("rejects invalid values", () => {
    expect(isValidJobStatus("pending")).toBe(false);
    expect(isValidJobStatus("")).toBe(false);
    expect(isValidJobStatus(null)).toBe(false);
    expect(isValidJobStatus(123)).toBe(false);
  });
});

describe("validateJobApplication", () => {
  it("passes with valid company and role", () => {
    expect(validateJobApplication({ company: "Google", role: "SWE" })).toBeNull();
  });

  it("requires company", () => {
    expect(validateJobApplication({ company: "", role: "SWE" })).toBe("Company is required");
    expect(validateJobApplication({ company: "  ", role: "SWE" })).toBe("Company is required");
  });

  it("requires role", () => {
    expect(validateJobApplication({ company: "Google", role: "" })).toBe("Role is required");
  });

  it("rejects invalid status", () => {
    const result = validateJobApplication({ company: "Google", role: "SWE", status: "invalid" });
    expect(result).toContain("Invalid status");
  });

  it("accepts valid status", () => {
    expect(
      validateJobApplication({ company: "Google", role: "SWE", status: "interview" })
    ).toBeNull();
  });

  it("rejects negative salary", () => {
    expect(
      validateJobApplication({ company: "Google", role: "SWE", salaryMin: -1 })
    ).toBe("Salary minimum cannot be negative");
    expect(
      validateJobApplication({ company: "Google", role: "SWE", salaryMax: -5 })
    ).toBe("Salary maximum cannot be negative");
  });

  it("rejects min > max salary", () => {
    expect(
      validateJobApplication({ company: "Google", role: "SWE", salaryMin: 200000, salaryMax: 100000 })
    ).toBe("Salary minimum cannot exceed maximum");
  });

  it("accepts valid salary range", () => {
    expect(
      validateJobApplication({ company: "Google", role: "SWE", salaryMin: 100000, salaryMax: 200000 })
    ).toBeNull();
  });

  it("rejects invalid respondedAt", () => {
    expect(
      validateJobApplication({ company: "Google", role: "SWE", respondedAt: "not-a-date" })
    ).toBe("respondedAt must be a valid ISO date string");
  });

  it("accepts valid respondedAt", () => {
    expect(
      validateJobApplication({ company: "Google", role: "SWE", respondedAt: "2026-03-15" })
    ).toBeNull();
  });
});

describe("computeJobStats", () => {
  it("counts statuses correctly", () => {
    const stats = computeJobStats(["applied", "applied", "interview", "offer", "rejected"]);
    expect(stats.total).toBe(5);
    expect(stats.byStatus.applied).toBe(2);
    expect(stats.byStatus.interview).toBe(1);
    expect(stats.byStatus.offer).toBe(1);
    expect(stats.byStatus.rejected).toBe(1);
    expect(stats.byStatus.phone_screen).toBe(0);
  });

  it("calculates response rate", () => {
    // 3 applied, 2 moved past applied = 40% response rate
    const stats = computeJobStats(["applied", "applied", "applied", "interview", "offer"]);
    expect(stats.responseRate).toBe(40);
  });

  it("handles empty array", () => {
    const stats = computeJobStats([]);
    expect(stats.total).toBe(0);
    expect(stats.responseRate).toBe(0);
  });

  it("handles 100% response rate", () => {
    const stats = computeJobStats(["interview", "offer", "rejected"]);
    expect(stats.responseRate).toBe(100);
  });
});

describe("constants", () => {
  it("STATUS_LABELS has labels for all statuses", () => {
    for (const status of JOB_STATUSES) {
      expect(STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it("PIPELINE_ORDER contains all statuses", () => {
    for (const status of JOB_STATUSES) {
      expect(PIPELINE_ORDER).toContain(status);
    }
  });
});
