import cors from "cors";
import express from "express";
import helmet from "helmet";
import passport from "passport";

import { errorHandler } from "./api/middlewares/errorHandler.js";
import { apiRouter } from "./api/routes/index.js";
import "./config/passport.js";

export const app = express();

app.use(helmet({
    contentSecurityPolicy: false, 
  }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "OK", timestamp: Date.now() });
});

app.use("/api", apiRouter);

app.use(errorHandler);
