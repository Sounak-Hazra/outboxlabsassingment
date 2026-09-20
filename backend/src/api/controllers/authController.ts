import type { RequestHandler } from "express";

import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AppError } from "../../utils/appError.js";
import { getRequiredEnv } from "../../utils/env.js";
import {
  createAccessToken,
  createSlackOAuthState,
  getUserIdFromSlackOAuthState,
} from "../../utils/jwt.js";
import { buildDashboardUrl } from "../../utils/urls.js";

type AuthenticatedUser = { id: string };
type SlackOAuthResponse = {
  ok: boolean;
  error?: string;
  incoming_webhook?: { url?: string };
};

type SlackAuthorizationResponse = { authorizationUrl: string };

const createSlackAuthorizationUrl = (userId: string): string => {
  const url = new URL("https://slack.com/oauth/v2/authorize");

  url.searchParams.set("client_id", getRequiredEnv("SLACK_CLIENT_ID"));
  url.searchParams.set("scope", "incoming-webhook");
  url.searchParams.set("redirect_uri", getRequiredEnv("SLACK_REDIRECT_URI"));
  url.searchParams.set("state", createSlackOAuthState(userId));
  return url.toString();
};

const exchangeSlackCode = async (code: string): Promise<string> => {
  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getRequiredEnv("SLACK_CLIENT_ID"),
      client_secret: getRequiredEnv("SLACK_CLIENT_SECRET"),
      code,
      redirect_uri: getRequiredEnv("SLACK_REDIRECT_URI"),
    }).toString(),
  });

  if (!response.ok) throw new AppError("Failed to communicate with Slack API.", 502);

  const payload = (await response.json()) as SlackOAuthResponse;
  const webhookUrl = payload.incoming_webhook?.url;

  if (!payload.ok || !webhookUrl) {
    throw new AppError(`Slack authorization failed: ${payload.error ?? "webhook unavailable"}.`);
  }

  return webhookUrl;
};

export const googleCallback: RequestHandler = asyncHandler(async (request, response) => {
  const user = request.user as AuthenticatedUser | undefined;
  if (!user?.id) throw new AppError("Google authentication did not return a valid user.", 401);

  response.redirect(buildDashboardUrl({ token: createAccessToken(user.id) }));
});

/** Returns the authenticated user's profile for the frontend session. */
export const getCurrentUser: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.userId) throw new AppError("Authentication is required.", 401);

  const user = await prisma.user.findUnique({
    where: { id: request.userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      slackWebhookUrl: true,
    },
  });

  if (!user) throw new AppError("User not found.", 404);

  response.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    slackConnected: Boolean(user.slackWebhookUrl),
  });
});

export const slackAuth: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.userId) throw new AppError("Authenticated user is required.", 401);

  const authorizationUrl = createSlackAuthorizationUrl(request.userId);

  if (request.get("accept")?.includes("application/json")) {
    response.json({ authorizationUrl } satisfies SlackAuthorizationResponse);
    return;
  }

  response.redirect(authorizationUrl);
});

export const getSlackStatus: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.userId) throw new AppError("Authenticated user is required.", 401);

  const user = await prisma.user.findUnique({
    where: { id: request.userId },
    select: { slackWebhookUrl: true },
  });

  if (!user) throw new AppError("User not found.", 404);

  response.json({ connected: Boolean(user.slackWebhookUrl) });
});

export const disconnectSlack: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.userId) throw new AppError("Authenticated user is required.", 401);

  await prisma.user.update({
    where: { id: request.userId },
    data: { slackWebhookUrl: null },
  });

  response.status(204).send();
});

export const slackCallback: RequestHandler = async (request, response) => {
  try {
    const code = typeof request.query.code === "string" ? request.query.code : undefined;
    const state = typeof request.query.state === "string" ? request.query.state : undefined;
    if (!code || !state) throw new AppError("Slack OAuth code and state are required.");

    const userId = getUserIdFromSlackOAuthState(state);
    const slackWebhookUrl = await exchangeSlackCode(code);

    await prisma.user.update({ where: { id: userId }, data: { slackWebhookUrl } });
    response.redirect(buildDashboardUrl({ slack: "connected" }));
  } catch (error) {
    console.error("Slack OAuth callback failed:", error);
    response.redirect(buildDashboardUrl({ slack: "error", error: "Slack authorization failed. Please try again." }));
  }
};
