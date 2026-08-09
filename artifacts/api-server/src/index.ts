import app from "./app.js";
import { logger } from "./lib/logger.js";
import { startGelatoRetryWorker } from "./routes/orders.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Start the durable Gelato retry worker.
  // It reschedules 'processing' orders whose Gelato submission failed transiently
  // (e.g. network timeout after Stripe webhook), self-healing without operator action.
  startGelatoRetryWorker();
  logger.info("Gelato retry worker started (5-minute interval)");
});
