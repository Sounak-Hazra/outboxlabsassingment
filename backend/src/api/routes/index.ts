import { Router } from "express";

import { authRouter } from "./authRoutes.js";
import { campaignRouter } from "./campaignRoutes.js";
import { queueRouter } from "./queueRoutes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/campaigns", campaignRouter);
apiRouter.use("/queue", queueRouter);
