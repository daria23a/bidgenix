import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// Accepts a multipart upload (field name "file") and returns extracted plain
// text. Supports PDF, DOCX and .txt/.md. Parsing runs fully locally — no
// external service required.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    const blob = file as File;
    const name = (blob.name || "").toLowerCase();
    const buf = Buffer.from(await blob.arrayBuffer());

    let text = "";
    if (name.endsWith(".pdf") || blob.type === "application/pdf") {
      // unpdf is a modern, serverless-friendly PDF text extractor (bundled pdf.js).
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text: pdfText } = await extractText(pdf, { mergePages: true });
      text = Array.isArray(pdfText) ? pdfText.join("\n") : pdfText;
    } else if (
      name.endsWith(".docx") ||
      blob.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: buf });
      text = result.value;
    } else if (name.endsWith(".txt") || name.endsWith(".md") || blob.type.startsWith("text/")) {
      text = buf.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Upload PDF, DOCX, or TXT." },
        { status: 415 },
      );
    }

    text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    return NextResponse.json({ text, filename: blob.name, chars: text.length });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "upload parse failed" },
      { status: 500 },
    );
  }
}
