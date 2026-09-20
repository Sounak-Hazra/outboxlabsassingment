import jwt, { type JwtPayload } from "jsonwebtoken";

import { AppError } from "./appError.js";
import { getRequiredEnv } from "./env.js";

type AppTokenPayload = JwtPayload & {
  userId?: unknown;
  purpose?: unknown;
};

const jwtSecret = (): string => getRequiredEnv("JWT_SECRET");

export const createAccessToken = (userId: string): string =>
  jwt.sign({ userId }, jwtSecret(), { expiresIn: "1h" });

export const getUserIdFromAccessToken = (token: string): string => {
  try {
    const payload = jwt.verify(token, jwtSecret()) as AppTokenPayload;

    if (typeof payload.userId !== "string") {
      throw new AppError("Invalid authentication token.", 401);
    }

    return payload.userId;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Invalid or expired authentication token.", 401);
  }
};

export const createSlackOAuthState = (userId: string): string =>
  jwt.sign({ purpose: "slack-oauth", userId }, jwtSecret(), { expiresIn: "10m" });

export const getUserIdFromSlackOAuthState = (state: string): string => {
  try {
    const payload = jwt.verify(state, jwtSecret()) as AppTokenPayload;

    if (payload.purpose !== "slack-oauth" || typeof payload.userId !== "string") {
      throw new AppError("Slack OAuth state is invalid.", 401);
    }

    return payload.userId;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Slack OAuth state is invalid or expired.", 401);
  }
};
