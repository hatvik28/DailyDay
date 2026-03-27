import { describe, it, expect } from "vitest";
import { transformMessage, transformMessages } from "./transformers";
import type { GmailMessageRaw } from "./client";

function makeRawMessage(overrides: Partial<GmailMessageRaw> = {}): GmailMessageRaw {
  return {
    id: "msg-1",
    threadId: "thread-1",
    snippet: "Preview text here",
    internalDate: String(new Date("2026-03-27T10:00:00Z").getTime()),
    labelIds: ["INBOX"],
    payload: {
      headers: [
        { name: "From", value: "John Doe <john@example.com>" },
        { name: "Subject", value: "Hello World" },
      ],
      mimeType: "text/plain",
    },
    ...overrides,
  };
}

describe("transformMessage", () => {
  it("extracts sender name and email", () => {
    const email = transformMessage(makeRawMessage());
    expect(email.from).toBe("John Doe");
    expect(email.fromEmail).toBe("john@example.com");
  });

  it("handles plain email without name", () => {
    const email = transformMessage(
      makeRawMessage({
        payload: {
          headers: [
            { name: "From", value: "plain@example.com" },
            { name: "Subject", value: "Test" },
          ],
          mimeType: "text/plain",
        },
      })
    );
    expect(email.from).toBe("plain@example.com");
    expect(email.fromEmail).toBe("plain@example.com");
  });

  it("detects Job App tag from keywords", () => {
    const email = transformMessage(
      makeRawMessage({
        payload: {
          headers: [
            { name: "From", value: "noreply@greenhouse.io" },
            { name: "Subject", value: "Your application has been received" },
          ],
          mimeType: "text/plain",
        },
      })
    );
    expect(email.tag).toBe("Job App");
  });

  it("detects Interview tag", () => {
    const email = transformMessage(
      makeRawMessage({
        payload: {
          headers: [
            { name: "From", value: "recruiter@company.com" },
            { name: "Subject", value: "Schedule your technical screen" },
          ],
          mimeType: "text/plain",
        },
      })
    );
    expect(email.tag).toBe("Interview");
  });

  it("detects Follow Up tag", () => {
    const email = transformMessage(
      makeRawMessage({
        snippet: "Just wanted to follow up on our conversation",
        payload: {
          headers: [
            { name: "From", value: "person@company.com" },
            { name: "Subject", value: "Checking in" },
          ],
          mimeType: "text/plain",
        },
      })
    );
    expect(email.tag).toBe("Follow Up");
  });

  it("defaults to Inbox tag for generic emails", () => {
    const email = transformMessage(
      makeRawMessage({
        snippet: "Here is your receipt",
        payload: {
          headers: [
            { name: "From", value: "shop@store.com" },
            { name: "Subject", value: "Order confirmation" },
          ],
          mimeType: "text/plain",
        },
      })
    );
    expect(email.tag).toBe("Inbox");
  });

  it("detects unread emails", () => {
    const unread = transformMessage(makeRawMessage({ labelIds: ["INBOX", "UNREAD"] }));
    const read = transformMessage(makeRawMessage({ labelIds: ["INBOX"] }));
    expect(unread.isUnread).toBe(true);
    expect(read.isUnread).toBe(false);
  });

  it("handles missing subject", () => {
    const email = transformMessage(
      makeRawMessage({
        payload: {
          headers: [{ name: "From", value: "a@b.com" }],
          mimeType: "text/plain",
        },
      })
    );
    expect(email.subject).toBe("(No Subject)");
  });
});

describe("transformMessages", () => {
  it("transforms an array of raw messages", () => {
    const results = transformMessages([makeRawMessage(), makeRawMessage({ id: "msg-2" })]);
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("msg-1");
    expect(results[1].id).toBe("msg-2");
  });

  it("returns empty array for empty input", () => {
    expect(transformMessages([])).toEqual([]);
  });
});
