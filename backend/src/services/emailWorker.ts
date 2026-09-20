import { DelayedError, Worker, type Job } from "bullmq";

import { redisConnection } from "../config/redis.js";
import { prisma } from "../lib/prisma.js";
import { transporter } from "./emailService.js";
import { esClient } from "../lib/elasticSearch.js";
import type { EmailJobPayload } from "./queueService.js";

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "5", 10);

export const emailWorker = new Worker<EmailJobPayload>(
  "email-queue",
  async (job: Job<EmailJobPayload>) => {
    // Extract the dynamic hourlyLimit from the job payload
    const { scheduledEmailId, campaignId, userId, from, to, subject, body, hourlyLimit } = job.data;

    const scheduledEmail = await prisma.scheduledEmail.findUnique({
      where: { id: scheduledEmailId },
    });

    if (!scheduledEmail || scheduledEmail.status === "SENT") {
      console.log(`Job ${job.id}: Email already sent or deleted. Skipping.`);
      return;
    }

    const currentHourString = new Date().toISOString().slice(0, 13);
    const rateLimitKey = `rate_limit:${userId}:${campaignId}:${currentHourString}`;

    const currentCount = await redisConnection.incr(rateLimitKey);
    if (currentCount === 1) {
      await redisConnection.expire(rateLimitKey, 3600);
    }

    if (currentCount > hourlyLimit) {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setUTCMinutes(0, 0, 0);
      nextHour.setUTCHours(now.getUTCHours() + 1);
      const delayUntilNextHour = nextHour.getTime() - now.getTime();

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { slackWebhookUrl: true },
      });
      const slackWebhookUrl = user?.slackWebhookUrl;
      console.log(slackWebhookUrl)
      const alertKey = `rate_limit_alert:${userId}:${campaignId}:${currentHourString}`;
      const alertReserved = slackWebhookUrl
        ? await redisConnection.set(alertKey, "sent", "EX", Math.max(1, Math.ceil(delayUntilNextHour / 1_000)), "NX")
        : null;

      console.log(alertReserved)
      if (alertReserved && slackWebhookUrl) {
        console.log("here comming")
        try {
          const slackResponse = await fetch(slackWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: `Rate Limit Alert!`,
            }),
          });

          if (!slackResponse.ok) {
            const responseText = await slackResponse.text();
            throw new Error(`Slack returned ${slackResponse.status}: ${responseText || slackResponse.statusText}`);
          }
        } catch (error) {
          await redisConnection.del(alertKey);
          console.error(`Failed to send Slack alert for user ${userId}:`, error);
        }
      }

      await job.moveToDelayed(Date.now() + delayUntilNextHour, job.token);
      throw new DelayedError();
    }

    await transporter.sendMail({
      from,
      to,
      subject,
      text: body,
    });

    await prisma.scheduledEmail.update({
      where: { id: scheduledEmailId },
      data: { status: "SENT", sentAt: new Date() },
    });

    try {
      await esClient.update({
        index: "emails",
        id: scheduledEmailId,
        doc: {
          status: "SENT",
          sentAt: new Date(),
        },
      });
    } catch (esError) {
      console.error(`Failed to update Elasticsearch for job ${job.id}:`, esError);
    }
  },
  {
    connection: redisConnection,
    concurrency: CONCURRENCY,
  }
);

emailWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed. Email sent to ${job.data.to}`);
});

emailWorker.on("failed", async (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);

  if (job?.data?.scheduledEmailId) {
    try {
      await prisma.scheduledEmail.update({
        where: { id: job.data.scheduledEmailId },
        data: { status: "FAILED" },
      });
      await esClient.update({
        index: "emails",
        id: job.data.scheduledEmailId,
        doc: { status: "FAILED" },
      });
    } catch (dbError) {
      console.error(`Failed to update FAILED status for job ${job?.id}:`, dbError);
    }
  }
});
