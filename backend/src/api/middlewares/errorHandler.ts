import type { ErrorRequestHandler } from "express";

type HttpError = Error & {
  statusCode?: number;
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  void next;

  const httpError = error as HttpError;
  const statusCode = httpError.statusCode ?? 500;
  const message = statusCode >= 500 ? "Internal server error" : httpError.message;

  if (statusCode >= 500) {
    console.error(error);
  }

  response.status(statusCode).json({
    success: false,
    error: {
      message,
    },
  });
};
