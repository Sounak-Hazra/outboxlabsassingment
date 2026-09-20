import { Queue } from "bullmq";

import { redisConnection } from "../config/redis.js";
import { AppError } from "../utils/appError.js";

export type EmailJobPayload = {
  scheduledEmailId: string;
  campaignId: string;
  userId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  hourlyLimit: number;
};

export type EmailJob = {
  name: "send-email";
  data: EmailJobPayload;
  opts: {
    delay: number;
  };
};

export const emailQueue = new Queue("email-queue", {
  connection: redisConnection,
});

export const addEmailJobs = async (jobs: EmailJob[]) => {
  return emailQueue.addBulk(jobs);
};

export const getEmailQueueStats = () =>
  emailQueue.getJobCounts("waiting", "active", "delayed", "completed", "failed", "paused");

export const pauseEmailQueue = () => emailQueue.pause();

export const resumeEmailQueue = () => emailQueue.resume();

export const retryEmailJob = async (jobId: string): Promise<void> => {
  const job = await emailQueue.getJob(jobId);

  if (!job) {
    throw new AppError("Queue job not found.", 404);
  }

  await job.retry();
};
