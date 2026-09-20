export const CampaignStatus = {
  PROCESSING: "PROCESSING",
} as const;

export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const ScheduledEmailStatus = {
  PENDING: "PENDING",
  SENT: "SENT",
  FAILED: "FAILED",
  RESCHEDULED: "RESCHEDULED",
} as const;

export type ScheduledEmailStatus =
  (typeof ScheduledEmailStatus)[keyof typeof ScheduledEmailStatus];
