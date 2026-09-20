export const SESSION_STORAGE_KEY = "email_scheduler_token";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  slackConnected: boolean;
};

const apiBaseUrl = () => (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/$/, "");

export const getBackendApiUrl = (path: string): string => `${apiBaseUrl()}${path}`;

export const fetchAuthenticatedUser = async (token: string): Promise<AuthenticatedUser | null> => {
  const response = await fetch(getBackendApiUrl("/auth/me"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as AuthenticatedUser;
};

type ApiErrorResponse = { error?: { message?: string }; message?: string };
type SlackAuthorizationResponse = ApiErrorResponse & { authorizationUrl?: string };

export type EmailRecord = {
  id: string;
  campaignId: string;
  recipientEmail: string;
  subject?: string;
  body?: string;
  status: string;
  scheduledTime: string;
  sentAt?: string | null;
};

export type SentEmailDetail = EmailRecord & {
  subject: string;
  body: string;
};

const getErrorMessage = (data: ApiErrorResponse | null, fallback: string): string =>
  data?.error?.message ?? data?.message ?? fallback;

/** Gets a Slack authorization URL using the local bearer token. */
export const getSlackAuthorizationUrl = async (token: string): Promise<string> => {
  const response = await fetch(getBackendApiUrl("/auth/slack"), {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as SlackAuthorizationResponse | null;

  if (!response.ok || !data?.authorizationUrl) {
    throw new Error(getErrorMessage(data, "Unable to start Slack authorization."));
  }

  return data.authorizationUrl;
};

/** Fetches the user's Slack connection state without exposing webhook details. */
export const fetchSlackConnectionStatus = async (token: string): Promise<boolean> => {
  const response = await fetch(getBackendApiUrl("/auth/slack/status"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as ({ connected?: boolean } & ApiErrorResponse) | null;

  if (!response.ok || typeof data?.connected !== "boolean") {
    throw new Error(getErrorMessage(data, "Unable to check the Slack connection."));
  }

  return data.connected;
};

/** Removes the Slack webhook associated with the current authenticated user. */
export const disconnectSlack = async (token: string): Promise<void> => {
  const response = await fetch(getBackendApiUrl("/auth/slack"), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(getErrorMessage(data, "Unable to disconnect Slack."));
  }
};

const fetchEmails = async (path: string, token: string): Promise<EmailRecord[]> => {
  const response = await fetch(getBackendApiUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as EmailRecord[] | ApiErrorResponse | null;

  if (!response.ok || !Array.isArray(data)) {
    throw new Error(getErrorMessage(data as ApiErrorResponse | null, "Unable to load emails."));
  }

  return data;
};

/** Loads pending or sent emails belonging to the authenticated user. */
export const fetchEmailList = (kind: "scheduled" | "sent", token: string): Promise<EmailRecord[]> =>
  fetchEmails(`/campaigns/${kind}`, token);

/** Searches the authenticated user's indexed emails by recipient or subject. */
export const searchEmails = (query: string, token: string): Promise<EmailRecord[]> =>
  fetchEmails(`/campaigns/search?q=${encodeURIComponent(query)}`, token);

/** Loads the full message content for one sent email owned by the current user. */
export const fetchSentEmailDetail = async (emailId: string, token: string): Promise<SentEmailDetail> => {
  const response = await fetch(getBackendApiUrl(`/campaigns/sent/${encodeURIComponent(emailId)}`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as SentEmailDetail | ApiErrorResponse | null;

  if (!response.ok || !data || !("body" in data) || !("subject" in data)) {
    throw new Error(getErrorMessage(data as ApiErrorResponse | null, "Unable to load this sent email."));
  }

  return data;
};

export const getStoredToken = (): string | null => window.localStorage.getItem(SESSION_STORAGE_KEY);

export const storeToken = (token: string): void => window.localStorage.setItem(SESSION_STORAGE_KEY, token);

export const clearStoredToken = (): void => window.localStorage.removeItem(SESSION_STORAGE_KEY);
