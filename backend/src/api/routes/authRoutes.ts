import { Router } from "express";

import { disconnectSlack, getCurrentUser, getSlackStatus, googleCallback, slackAuth, slackCallback } from "../controllers/authController.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { passport } from "../../config/passport.js";

export const authRouter = Router();

authRouter.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
authRouter.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  googleCallback,
);
authRouter.get("/me", requireAuth, getCurrentUser);
authRouter.get("/slack/status", requireAuth, getSlackStatus);
authRouter.get("/slack", requireAuth, slackAuth);
authRouter.delete("/slack", requireAuth, disconnectSlack);
authRouter.get("/slack/callback", slackCallback);
