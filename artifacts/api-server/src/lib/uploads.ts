import path from "path";
import { mkdirSync } from "fs";
import multer from "multer";

/**
 * Directory where uploaded PDFs are stored.
 * Served publicly at /api/pdfs/:filename so Gelato can fetch them.
 * process.cwd() is artifacts/api-server/ when the server runs.
 */
export const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure the directory exists at startup (synchronous is fine here).
mkdirSync(UPLOADS_DIR, { recursive: true });

/**
 * Multer middleware configured for PDF uploads.
 * Files are held in memory so the route handler can write them by orderId
 * only after all auth/state checks pass — rejected requests never hit disk.
 * Max 50 MB — well above any realistic book PDF.
 */
export const uploadPdfMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"));
    }
  },
});
