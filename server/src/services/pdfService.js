import pdfParse from "pdf-parse";

export async function extractTextFromPdfBuffer(buffer) {
  const parsed = await pdfParse(buffer);
  return (parsed.text || "").replace(/\s+/g, " ").trim();
}
