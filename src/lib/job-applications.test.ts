import { describe, it, expect } from "vitest";
import {
  isValidJobStatus,
  validateJobApplication,
  computeJobStats,
  JOB_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
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

  it("PIPELINE_ORDER has no duplicates", () => {
    expect(new Set(PIPELINE_ORDER).size).toBe(PIPELINE_ORDER.length);
  });

  it("PIPELINE_ORDER length matches JOB_STATUSES length", () => {
    expect(PIPELINE_ORDER.length).toBe(JOB_STATUSES.length);
  });

  it("STATUS_COLORS has a color class for all statuses", () => {
    for (const status of JOB_STATUSES) {
      expect(STATUS_COLORS[status]).toBeTruthy();
      expect(typeof STATUS_COLORS[status]).toBe("string");
    }
  });
});

describe("isValidJobStatus — extra edge cases", () => {
  it("rejects undefined", () => {
    expect(isValidJobStatus(undefined)).toBe(false);
  });

  it("rejects an array", () => {
    expect(isValidJobStatus(["applied"])).toBe(false);
  });

  it("rejects an object", () => {
    expect(isValidJobStatus({ status: "applied" })).toBe(false);
  });

  it("rejects a boolean", () => {
    expect(isValidJobStatus(true)).toBe(false);
  });
});

describe("validateJobApplication — extra edge cases", () => {
  it("accepts equal salaryMin and salaryMax", () => {
    expect(
      validateJobApplication({ company: "Acme", role: "Dev", salaryMin: 100000, salaryMax: 100000 })
    ).toBeNull();
  });

  it("accepts null salaryMin and salaryMax explicitly", () => {
    expect(
      validateJobApplication({ company: "Acme", role: "Dev", salaryMin: null, salaryMax: null })
    ).toBeNull();
  });

  it("accepts zero salary values", () => {
    expect(
      validateJobApplication({ company: "Acme", role: "Dev", salaryMin: 0, salaryMax: 0 })
    ).toBeNull();
  });

  it("rejects role that is only whitespace", () => {
    expect(validateJobApplication({ company: "Acme", role: "   " })).toBe("Role is required");
  });

  it("accepts application with all optional fields omitted", () => {
    expect(validateJobApplication({ company: "Acme", role: "Dev" })).toBeNull();
  });

  it("accepts all valid statuses", () => {
    for (const status of JOB_STATUSES) {
      expect(validateJobApplication({ company: "Acme", role: "Dev", status })).toBeNull();
    }
  });

  it("error message for invalid status lists valid options", () => {
    const result = validateJobApplication({ company: "Acme", role: "Dev", status: "hired" });
    expect(result).toContain("applied");
    expect(result).toContain("rejected");
  });
});

describe("computeJobStats — extra edge cases", () => {
  it("ignores unrecognised status strings in byStatus but counts them in total", () => {
    const stats = computeJobStats(["applied", "unknown_status"]);
    // total includes all input entries
    expect(stats.total).toBe(2);
    // unknown status does not appear in any byStatus bucket
    const knownCount = Object.values(stats.byStatus).reduce((a, b) => a + b, 0);
    expect(knownCount).toBe(1);
  });

  it("counts withdrawn status correctly", () => {
    const stats = computeJobStats(["withdrawn", "withdrawn", "applied"]);
    expect(stats.byStatus.withdrawn).toBe(2);
    expect(stats.total).toBe(3);
  });

  it("response rate is 0 when all are applied", () => {
    const stats = computeJobStats(["applied", "applied", "applied"]);
    expect(stats.responseRate).toBe(0);
  });

  it("response rate rounds correctly", () => {
    // 1 out of 3 responded → 33.33% → rounds to 33
    const stats = computeJobStats(["applied", "applied", "interview"]);
    expect(stats.responseRate).toBe(33);
  });

  it("all byStatus values are initialised to 0 for empty input", () => {
    const stats = computeJobStats([]);
    for (const status of JOB_STATUSES) {
      expect(stats.byStatus[status]).toBe(0);
    }
  });
});