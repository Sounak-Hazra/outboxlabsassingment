import { Router } from "express";
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { emailQueue } from "../../services/queueService.js";
import {
  getQueueStats,
  pauseQueue,
  resumeQueue,
  retryQueueJob,
} from "../controllers/queueController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export const queueRouter = Router();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/api/queue/ui"); 

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter: serverAdapter,
});

queueRouter.use("/ui", serverAdapter.getRouter());

queueRouter.use(requireAuth);
queueRouter.get("/stats", getQueueStats);
queueRouter.post("/pause", pauseQueue);
queueRouter.post("/resume", resumeQueue);
queueRouter.post("/:jobId/retry", retryQueueJob);