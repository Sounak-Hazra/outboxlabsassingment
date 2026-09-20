import "dotenv/config";
import { setupElasticsearch } from "./lib/elasticSearch.js";
import { app } from "./app.js";
import "./services/emailWorker.js";

const port = Number(process.env.PORT) || 5000;
const server = app.listen(port, () => {
  console.info(`Server listening on port ${port}`);
});
await setupElasticsearch();
let isShuttingDown = false;

const shutdown = (signal: NodeJS.Signals): void => {
  if (isShuttingDown) return;

  isShuttingDown = true;
  console.info(`${signal} received; closing HTTP server.`);

  server.close((error) => {
    if (error) {
      console.error("Unable to close HTTP server cleanly.", error);
      process.exit(1);
    }

    process.exit(0);
  });

  setTimeout(() => {
    console.error("Graceful shutdown timed out; forcing exit.");
    process.exit(1);
  }, 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
