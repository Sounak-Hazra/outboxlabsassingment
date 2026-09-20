import { AppError } from "../../utils/appError.js";

type CampaignRequestBody = {
  from?: unknown;
  subject?: unknown;
  body?: unknown;
  hourly_limit?: unknown;
  delay_ms?: unknown;
  start_time?: unknown;
};

export type ValidatedCampaignInput = {
  from: string;
  subject: string;
  body: string;
  hourlyLimit: number;
  delayMs: number;
  startTime: Date;
};

// An email address may optionally include a display name, e.g. "Acme <hello@acme.test>".
// Newlines are rejected to prevent SMTP header injection through Nodemailer's `from` field.
const validateFromAddress = (value: unknown): string => {
  const from = requireText(value, "from");

  if (/\r|\n/.test(from)) {
    throw new AppError("from must not contain line breaks.");
  }

  const address = from.match(/<([^<>]+)>$/)?.[1] ?? from;
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)) {
    throw new AppError("from must be a valid email address or display-name address.");
  }

  return from;
};

const requireText = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`${field} is required.`);
  }

  return value.trim();
};

const parseNonNegativeInteger = (value: unknown, field: string): number => {
  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new AppError(`${field} must be a non-negative integer.`);
  }

  return parsed;
};

export const validateCampaignInput = (body: unknown): ValidatedCampaignInput => {
  const { from, subject, body: campaignBody, hourly_limit, delay_ms, start_time } =
    body as CampaignRequestBody;
  const startTime = new Date(String(start_time));

  if (Number.isNaN(startTime.getTime())) {
    throw new AppError("start_time must be a valid date.");
  }

  return {
    from: validateFromAddress(from),
    subject: requireText(subject, "subject"),
    body: requireText(campaignBody, "body"),
    hourlyLimit: parseNonNegativeInteger(hourly_limit, "hourly_limit"),
    delayMs: parseNonNegativeInteger(delay_ms, "delay_ms"),
    startTime,
  };
};
