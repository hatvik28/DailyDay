/**
 * Gmail OAuth2 client — mirrors the Fitbit integration pattern.
 * Handles authorization URL generation, token exchange, refresh, and API calls.
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

// --- Config helpers (server-side only) ---

function getClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_CLIENT_ID is not set");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET is not set");
  return secret;
}

function getRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    "http://localhost:3000/api/gmail/callback"
  );
}

// --- OAuth URL ---

export function getGmailAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

// --- Token types ---

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

// --- Token exchange ---

export async function exchangeCodeForTokens(
  code: string
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    code,
    grant_type: "authorization_code",
    redirect_uri: getRedirectUri(),
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Google token exchange failed:", res.status, text);
    throw new Error(`Token exchange failed: ${res.status}`);
  }

  return res.json();
}

// --- Token refresh ---

export async function refreshAccessToken(
  refreshToken: string
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Google token refresh failed:", res.status, text);
    throw new Error(`Token refresh failed: ${res.status}`);
  }

  return res.json();
}

// --- Gmail API helpers ---

async function gmailGet(accessToken: string, path: string) {
  const res = await fetch(`${GMAIL_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (res.status === 401) {
    throw new Error("GMAIL_TOKEN_EXPIRED");
  }

  if (res.status === 429) {
    throw new Error("Gmail rate limit exceeded. Please try again later.");
  }

  if (!res.ok) {
    console.error(`Gmail API error ${path}:`, res.status);
    return null;
  }

  return res.json();
}

// --- Data fetching ---

export interface GmailMessageRaw {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
    mimeType: string;
    body?: { size: number; data?: string };
    parts?: { mimeType: string; body?: { size: number; data?: string } }[];
  };
  internalDate: string;
}

export interface GmailListResponse {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export async function listMessages(
  accessToken: string,
  maxResults = 10,
  query = ""
): Promise<GmailListResponse | null> {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
  });
  if (query) params.set("q", query);

  return gmailGet(accessToken, `/users/me/messages?${params.toString()}`);
}

export async function getMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessageRaw | null> {
  return gmailGet(accessToken, `/users/me/messages/${messageId}?format=full`);
}

export async function getProfile(
  accessToken: string
): Promise<{ emailAddress: string; messagesTotal: number } | null> {
  return gmailGet(accessToken, "/users/me/profile");
}

// --- Token revocation ---

export async function revokeToken(accessToken: string): Promise<void> {
  try {
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${accessToken}`,
      { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
  } catch {
    // Best-effort revocation
  }
}
