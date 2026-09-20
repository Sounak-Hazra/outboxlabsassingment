import type { RequestHandler } from "express";

import {
  getEmailQueueStats,
  pauseEmailQueue,
  resumeEmailQueue,
  retryEmailJob,
} from "../../services/queueService.js";
import { AppError } from "../../utils/appError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const getQueueStats: RequestHandler = asyncHandler(async (_request, response) => {
  response.json({ queue: "email-queue", ...(await getEmailQueueStats()) });
});

export const pauseQueue: RequestHandler = asyncHandler(async (_request, response) => {
  await pauseEmailQueue();
  response.json({ queue: "email-queue", status: "paused" });
});

export const resumeQueue: RequestHandler = asyncHandler(async (_request, response) => {
  await resumeEmailQueue();
  response.json({ queue: "email-queue", status: "running" });
});

export const retryQueueJob: RequestHandler = asyncHandler(async (request, response) => {
  const { jobId } = request.params;
  if (typeof jobId !== "string") throw new AppError("A valid job ID is required.");

  await retryEmailJob(jobId);
  response.json({ jobId, status: "retrying" });
});
