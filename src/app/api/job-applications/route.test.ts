import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the route module
vi.mock("@/lib/auth", () => ({
  getRequiredUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "./route";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockGetRequiredUser = vi.mocked(getRequiredUser);
const mockFindMany = vi.mocked(prisma.jobApplication.findMany);
const mockCreate = vi.mocked(prisma.jobApplication.create);

const MOCK_USER = { id: "user-123", email: "test@example.com", name: "Test User" };

const MOCK_APPLICATION = {
  id: "app-1",
  userId: "user-123",
  company: "Google",
  role: "Software Engineer",
  status: "applied",
  url: "https://google.com/jobs",
  salaryMin: 120000,
  salaryMax: 180000,
  location: "Mountain View, CA",
  remote: false,
  notes: "",
  appliedAt: new Date("2026-03-01T00:00:00.000Z"),
  respondedAt: null,
  createdAt: new Date("2026-03-01T00:00:00.000Z"),
  updatedAt: new Date("2026-03-01T00:00:00.000Z"),
};

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /api/job-applications
// ---------------------------------------------------------------------------
describe("GET /api/job-applications", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetRequiredUser.mockRejectedValueOnce(new Error("Unauthorized"));

    const req = makeRequest("http://localhost/api/job-applications");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns list of applications for authenticated user", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindMany.mockResolvedValueOnce([MOCK_APPLICATION] as never);

    const req = makeRequest("http://localhost/api/job-applications");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].company).toBe("Google");
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: { appliedAt: "desc" },
    });
  });

  it("filters by valid status when provided", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindMany.mockResolvedValueOnce([] as never);

    const req = makeRequest("http://localhost/api/job-applications?status=interview");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-123", status: "interview" },
      orderBy: { appliedAt: "desc" },
    });
  });

  it("ignores invalid status filter and returns all applications", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindMany.mockResolvedValueOnce([MOCK_APPLICATION] as never);

    const req = makeRequest("http://localhost/api/job-applications?status=invalid_status");
    const res = await GET(req);

    expect(res.status).toBe(200);
    // status should NOT be added to the where clause for invalid values
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: { appliedAt: "desc" },
    });
  });

  it("returns empty array when user has no applications", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindMany.mockResolvedValueOnce([] as never);

    const req = makeRequest("http://localhost/api/job-applications");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns 500 when prisma throws unexpectedly", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindMany.mockRejectedValueOnce(new Error("DB error") as never);

    const req = makeRequest("http://localhost/api/job-applications");
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to fetch applications" });
  });

  it("filters by each valid status correctly", async () => {
    const validStatuses = ["applied", "phone_screen", "interview", "offer", "rejected", "withdrawn"];
    for (const status of validStatuses) {
      vi.clearAllMocks();
      mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
      mockFindMany.mockResolvedValueOnce([] as never);

      const req = makeRequest(`http://localhost/api/job-applications?status=${status}`);
      await GET(req);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: "user-123", status },
        orderBy: { appliedAt: "desc" },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/job-applications
// ---------------------------------------------------------------------------
describe("POST /api/job-applications", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetRequiredUser.mockRejectedValueOnce(new Error("Unauthorized"));

    const req = makeRequest("http://localhost/api/job-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Google", role: "SWE" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("creates a new application and returns 201", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockCreate.mockResolvedValueOnce(MOCK_APPLICATION as never);

    const req = makeRequest("http://localhost/api/job-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Google", role: "Software Engineer" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.company).toBe("Google");
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("trims whitespace from company and role", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockCreate.mockResolvedValueOnce(MOCK_APPLICATION as never);

    const req = makeRequest("http://localhost/api/job-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "  Google  ", role: "  SWE  " }),
    });
    await POST(req);

    const createCall = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createCall.data.company).toBe("Google");
    expect(createCall.data.role).toBe("SWE");
  });

  it("returns 400 when company is missing", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);

    const req = makeRequest("http://localhost/api/job-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "", role: "SWE" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Company is required");
  });

  it("returns 400 when role is missing", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);

    const req = makeRequest("http://localhost/api/job-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Google", role: "" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Role is required");
  });

  it("returns 400 when status is invalid", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);

    const req = makeRequest("http://localhost/api/job-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Google", role: "SWE", status: "hired" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid status");
  });

  it("returns 400 when salaryMin is negative", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);

    const req = makeRequest("http://localhost/api/job-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Google", role: "SWE", salaryMin: -100 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Salary minimum cannot be negative");
  });

  it("defaults status to 'applied' when not provided", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockCreate.mockResolvedValueOnce(MOCK_APPLICATION as never);

    const req = makeRequest("http://localhost/api/job-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Google", role: "SWE" }),
    });
    await POST(req);

    const createCall = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createCall.data.status).toBe("applied");
  });

  it("defaults remote to false when not provided", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockCreate.mockResolvedValueOnce(MOCK_APPLICATION as never);

    const req = makeRequest("http://localhost/api/job-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Google", role: "SWE" }),
    });
    await POST(req);

    const createCall = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createCall.data.remote).toBe(false);
  });

  it("accepts all optional fields", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockCreate.mockResolvedValueOnce(MOCK_APPLICATION as never);

    const req = makeRequest("http://localhost/api/job-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: "Google",
        role: "SWE",
        status: "interview",
        url: "https://google.com/jobs/123",
        salaryMin: 120000,
        salaryMax: 200000,
        location: "New York",
        remote: true,
        notes: "Applied via referral",
        appliedAt: "2026-01-15T00:00:00.000Z",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const createCall = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createCall.data.status).toBe("interview");
    expect(createCall.data.remote).toBe(true);
    expect(createCall.data.salaryMin).toBe(120000);
    expect(createCall.data.salaryMax).toBe(200000);
  });

  it("returns 500 when prisma create throws", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockCreate.mockRejectedValueOnce(new Error("DB error") as never);

    const req = makeRequest("http://localhost/api/job-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Google", role: "SWE" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to create application" });
  });
});