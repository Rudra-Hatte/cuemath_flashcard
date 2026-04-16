import express from "express";
import multer from "multer";
import { extractTextFromPdfBuffer } from "../services/pdfService.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const text = await extractTextFromPdfBuffer(req.file.buffer);
    return res.json({ text, chars: text.length });
  } catch (error) {
    return res.status(500).json({ error: "Failed to parse PDF", detail: error.message });
  }
});

export default router;
