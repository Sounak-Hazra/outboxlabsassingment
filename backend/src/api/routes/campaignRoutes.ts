import { Router } from "express";
import multer from "multer";

import { 
  uploadCampaign, 
  searchEmails,
  getScheduledEmails,
  getSentEmails,
  getSentEmailDetail,
} from "../controllers/campaignController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const campaignRouter = Router();

campaignRouter.post("/schedule", requireAuth, upload.single("leads"), uploadCampaign);
campaignRouter.get("/search", requireAuth, searchEmails);
campaignRouter.get("/scheduled", requireAuth, getScheduledEmails);
campaignRouter.get("/sent", requireAuth, getSentEmails);
campaignRouter.get("/sent/:emailId", requireAuth, getSentEmailDetail);
