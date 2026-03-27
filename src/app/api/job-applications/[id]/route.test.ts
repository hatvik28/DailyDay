import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getRequiredUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { PUT, DELETE } from "./route";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockGetRequiredUser = vi.mocked(getRequiredUser);
const mockFindFirst = vi.mocked(prisma.jobApplication.findFirst);
const mockUpdate = vi.mocked(prisma.jobApplication.update);
const mockDelete = vi.mocked(prisma.jobApplication.delete);

const MOCK_USER = { id: "user-123", email: "test@example.com", name: "Test User" };

const MOCK_APPLICATION = {
  id: "app-abc",
  userId: "user-123",
  company: "Acme Corp",
  role: "Backend Engineer",
  status: "applied",
  url: "",
  salaryMin: null,
  salaryMax: null,
  location: "",
  remote: false,
  notes: "",
  appliedAt: new Date("2026-03-01T00:00:00.000Z"),
  respondedAt: null,
  createdAt: new Date("2026-03-01T00:00:00.000Z"),
  updatedAt: new Date("2026-03-01T00:00:00.000Z"),
};

function makePutRequest(id: string, body: Record<string, unknown>): Request {
  return new Request(`http://localhost/api/job-applications/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string): Request {
  return new Request(`http://localhost/api/job-applications/${id}`, {
    method: "DELETE",
  });
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// PUT /api/job-applications/[id]
// ---------------------------------------------------------------------------
describe("PUT /api/job-applications/[id]", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetRequiredUser.mockRejectedValueOnce(new Error("Unauthorized"));

    const res = await PUT(makePutRequest("app-abc", { status: "interview" }), makeParams("app-abc"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when application does not exist for user", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindFirst.mockResolvedValueOnce(null as never);

    const res = await PUT(makePutRequest("nonexistent", { status: "interview" }), makeParams("nonexistent"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Application not found" });
  });

  it("returns 404 for an application belonging to another user", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    // findFirst returns null when userId doesn't match (Prisma enforces the where clause)
    mockFindFirst.mockResolvedValueOnce(null as never);

    const res = await PUT(makePutRequest("app-other-user", { status: "offer" }), makeParams("app-other-user"));

    expect(res.status).toBe(404);
  });

  it("updates status and returns the updated application", async () => {
    const updated = { ...MOCK_APPLICATION, status: "interview" };
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindFirst.mockResolvedValueOnce(MOCK_APPLICATION as never);
    mockUpdate.mockResolvedValueOnce(updated as never);

    const res = await PUT(makePutRequest("app-abc", { status: "interview" }), makeParams("app-abc"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("interview");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "app-abc" },
      data: expect.objectContaining({ status: "interview" }),
    });
  });

  it("returns 400 when status is invalid", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);

    const res = await PUT(makePutRequest("app-abc", { status: "hired" }), makeParams("app-abc"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid status");
  });

  it("returns 400 when salaryMin is negative", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);

    const res = await PUT(makePutRequest("app-abc", { salaryMin: -500 }), makeParams("app-abc"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Salary minimum cannot be negative");
  });

  it("returns 400 when salaryMin exceeds salaryMax", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);

    const res = await PUT(
      makePutRequest("app-abc", { salaryMin: 200000, salaryMax: 100000 }),
      makeParams("app-abc")
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Salary minimum cannot exceed maximum");
  });

  it("trims whitespace from company, role, url, location, and notes", async () => {
    const updated = { ...MOCK_APPLICATION, company: "Trimmed Co", role: "Dev" };
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindFirst.mockResolvedValueOnce(MOCK_APPLICATION as never);
    mockUpdate.mockResolvedValueOnce(updated as never);

    await PUT(
      makePutRequest("app-abc", {
        company: "  Trimmed Co  ",
        role: "  Dev  ",
        url: "  https://example.com  ",
        location: "  Remote  ",
        notes: "  Some notes  ",
      }),
      makeParams("app-abc")
    );

    const updateCall = mockUpdate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateCall.data.company).toBe("Trimmed Co");
    expect(updateCall.data.role).toBe("Dev");
    expect(updateCall.data.url).toBe("https://example.com");
    expect(updateCall.data.location).toBe("Remote");
    expect(updateCall.data.notes).toBe("Some notes");
  });

  it("does not include fields in update data when they are absent from body", async () => {
    const updated = { ...MOCK_APPLICATION, status: "offer" };
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindFirst.mockResolvedValueOnce(MOCK_APPLICATION as never);
    mockUpdate.mockResolvedValueOnce(updated as never);

    await PUT(makePutRequest("app-abc", { status: "offer" }), makeParams("app-abc"));

    const updateCall = mockUpdate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateCall.data).not.toHaveProperty("company");
    expect(updateCall.data).not.toHaveProperty("role");
    expect(updateCall.data.status).toBe("offer");
  });

  it("converts respondedAt string to Date", async () => {
    const updated = { ...MOCK_APPLICATION, respondedAt: new Date("2026-03-10T00:00:00.000Z") };
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindFirst.mockResolvedValueOnce(MOCK_APPLICATION as never);
    mockUpdate.mockResolvedValueOnce(updated as never);

    await PUT(
      makePutRequest("app-abc", { respondedAt: "2026-03-10T00:00:00.000Z" }),
      makeParams("app-abc")
    );

    const updateCall = mockUpdate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateCall.data.respondedAt).toBeInstanceOf(Date);
  });

  it("returns 500 when prisma update throws", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindFirst.mockResolvedValueOnce(MOCK_APPLICATION as never);
    mockUpdate.mockRejectedValueOnce(new Error("DB error") as never);

    const res = await PUT(makePutRequest("app-abc", { status: "interview" }), makeParams("app-abc"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to update application" });
  });

  it("passes the correct userId to findFirst for ownership check", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindFirst.mockResolvedValueOnce(MOCK_APPLICATION as never);
    mockUpdate.mockResolvedValueOnce(MOCK_APPLICATION as never);

    await PUT(makePutRequest("app-abc", { status: "offer" }), makeParams("app-abc"));

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "app-abc", userId: "user-123" },
    });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/job-applications/[id]
// ---------------------------------------------------------------------------
describe("DELETE /api/job-applications/[id]", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetRequiredUser.mockRejectedValueOnce(new Error("Unauthorized"));

    const res = await DELETE(makeDeleteRequest("app-abc"), makeParams("app-abc"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when application does not exist for user", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindFirst.mockResolvedValueOnce(null as never);

    const res = await DELETE(makeDeleteRequest("nonexistent"), makeParams("nonexistent"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Application not found" });
  });

  it("deletes the application and returns success", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindFirst.mockResolvedValueOnce(MOCK_APPLICATION as never);
    mockDelete.mockResolvedValueOnce(MOCK_APPLICATION as never);

    const res = await DELETE(makeDeleteRequest("app-abc"), makeParams("app-abc"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "app-abc" } });
  });

  it("passes correct userId to findFirst for ownership check", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindFirst.mockResolvedValueOnce(MOCK_APPLICATION as never);
    mockDelete.mockResolvedValueOnce(MOCK_APPLICATION as never);

    await DELETE(makeDeleteRequest("app-abc"), makeParams("app-abc"));

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "app-abc", userId: "user-123" },
    });
  });

  it("does not call delete when application is not found", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindFirst.mockResolvedValueOnce(null as never);

    await DELETE(makeDeleteRequest("app-abc"), makeParams("app-abc"));

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("returns 500 when prisma delete throws", async () => {
    mockGetRequiredUser.mockResolvedValueOnce(MOCK_USER);
    mockFindFirst.mockResolvedValueOnce(MOCK_APPLICATION as never);
    mockDelete.mockRejectedValueOnce(new Error("DB error") as never);

    const res = await DELETE(makeDeleteRequest("app-abc"), makeParams("app-abc"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to delete application" });
  });
});