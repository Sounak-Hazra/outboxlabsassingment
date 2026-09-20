import type { RequestHandler } from "express";
import { AppError } from "../../utils/appError.js";
import { getUserIdFromAccessToken } from "../../utils/jwt.js";

export const requireAuth: RequestHandler = (request, _response, next) => {
  const [scheme, token] = request.header("authorization")?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    return next(new AppError("Authentication is required.", 401));
  }

  try {
    request.userId = getUserIdFromAccessToken(token);
    return next();
  } catch (error) {
    return next(error);
  }
};
