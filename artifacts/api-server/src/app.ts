import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { UPLOADS_DIR } from "./lib/uploads.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors());

// Serve uploaded PDFs at /api/pdfs/:filename
// Gelato fetches the PDF directly from this URL.
app.use("/api/pdfs", express.static(UPLOADS_DIR, { index: false }));

// Stripe webhooks require the raw body for signature verification.
// Apply express.raw() ONLY to the Stripe webhook path, before express.json().
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
