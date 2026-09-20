import type { RequestHandler } from "express";

import { prisma } from "../../lib/prisma.js";
import { addEmailJobs } from "../../services/queueService.js";
import { AppError } from "../../utils/appError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { parseEmailCsv } from "../../utils/csv.js";
import { validateCampaignInput } from "../validators/campaignValidator.js";
import { esClient } from "../../lib/elasticSearch.js";

export const uploadCampaign: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.file) throw new AppError("A CSV file is required in the 'leads' field.");
  if (!request.userId) throw new AppError("Authenticated user is required.", 401);

  const input = validateCampaignInput(request.body);
  const emails = await parseEmailCsv(request.file.buffer);
  if (emails.length === 0) throw new AppError("The CSV must contain at least one valid 'email' column.");

  const campaign = await prisma.campaign.create({
    data: {
      userId: request.userId,
      subject: input.subject,
      body: input.body,
      hourlyLimit: input.hourlyLimit,
      delayMs: input.delayMs,
    },
  });

  const MIN_PROVIDER_DELAY_MS = 2000;
  const effectiveDelayMs = Math.max(MIN_PROVIDER_DELAY_MS, input.delayMs);

  const scheduledEmails = await prisma.scheduledEmail.createManyAndReturn({
    data: emails.map((recipientEmail, index) => ({
      campaignId: campaign.id,
      recipientEmail,
      scheduledTime: new Date(input.startTime.getTime() + index * effectiveDelayMs),
      status: "PENDING",
    })),
  });

  // const scheduledEmails = await prisma.scheduledEmail.createManyAndReturn({
  //   data: emails.map((recipientEmail, index) => ({
  //     campaignId: campaign.id,
  //     recipientEmail,
  //     scheduledTime: new Date(input.startTime.getTime() + index * input.delayMs),
  //     status: "PENDING",
  //   })),
  // });

  const now = Date.now();
  await addEmailJobs(
    scheduledEmails.map((email) => ({
      name: "send-email",
      data: {
        scheduledEmailId: email.id,
        campaignId: campaign.id,
        userId: campaign.userId,
        from: input.from,
        to: email.recipientEmail,
        subject: campaign.subject,
        body: campaign.body,
        hourlyLimit: campaign.hourlyLimit,
      },
      opts: { delay: Math.max(0, email.scheduledTime.getTime() - now) },
    })),
  );

  const esOperations = scheduledEmails.flatMap((email) => [
    { index: { _index: "emails", _id: email.id } },
    {
      id: email.id,
      campaignId: campaign.id,
      userId: request.userId,
      recipientEmail: email.recipientEmail,
      subject: campaign.subject,
      status: email.status,
      scheduledTime: email.scheduledTime,
    },
  ]);

  await esClient.bulk({ refresh: true, operations: esOperations });

  response.status(201).json({
    message: "Campaign scheduled successfully",
    campaignId: campaign.id,
    scheduledEmailCount: scheduledEmails.length,
  });
});

export const searchEmails: RequestHandler = asyncHandler(async (request, response) => {
  const { q } = request.query;
  const userId = request.userId;

  if (!q || typeof q !== "string") {
    response.status(200).json([]);
    return;
  }

  const result = await esClient.search({
    index: "emails",
    query: {
      bool: {
        must: [
          { term: { userId } },
          {
            multi_match: {
              query: q,
              fields: ["recipientEmail", "subject"],
              fuzziness: "AUTO",
            },
          },
        ],
      },
    },
  });

  const emails = result.hits.hits.map((hit) => hit._source);

  response.status(200).json(emails);
});


export const getScheduledEmails: RequestHandler = asyncHandler(async (request, response) => {
  const emails = await prisma.scheduledEmail.findMany({
    where: {
      campaign: { userId: request.userId },
      status: "PENDING"
    },
    orderBy: { scheduledTime: "desc" },
    select: {
      id: true, campaignId: true, recipientEmail: true, status: true, scheduledTime: true, sentAt: true,
      campaign: { select: { subject: true, body: true } },
    },
  });
  response.status(200).json(emails.map(({ campaign, ...email }) => ({ ...email, subject: campaign.subject, body: campaign.body })));
});

export const getSentEmails: RequestHandler = asyncHandler(async (request, response) => {
  const emails = await prisma.scheduledEmail.findMany({
    where: {
      campaign: { userId: request.userId },
      status: "SENT"
    },
    orderBy: { scheduledTime: "desc" },
    select: {
      id: true, campaignId: true, recipientEmail: true, status: true, scheduledTime: true, sentAt: true,
      campaign: { select: { subject: true, body: true } },
    },
  });
  response.status(200).json(emails.map(({ campaign, ...email }) => ({ ...email, subject: campaign.subject, body: campaign.body })));
});

export const getSentEmailDetail: RequestHandler = asyncHandler(async (request, response) => {
  const emailId = typeof request.params.emailId === "string" ? request.params.emailId : undefined;
  if (!emailId) throw new AppError("Sent email ID is required.");

  const email = await prisma.scheduledEmail.findFirst({
    where: {
      id: emailId,
      status: "SENT",
      campaign: { userId: request.userId },
    },
    select: {
      id: true,
      recipientEmail: true,
      scheduledTime: true,
      sentAt: true,
      status: true,
      campaign: { select: { subject: true, body: true } },
    },
  });

  if (!email) throw new AppError("Sent email not found.", 404);

  response.json({
    id: email.id,
    recipientEmail: email.recipientEmail,
    scheduledTime: email.scheduledTime,
    sentAt: email.sentAt,
    status: email.status,
    subject: email.campaign.subject,
    body: email.campaign.body,
  });
});
