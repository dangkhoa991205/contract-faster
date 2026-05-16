import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import mammoth from "mammoth";
import { convertToHtmlWithAlignment } from "@/lib/docx-html";
import { readDocxBuffer } from "@/lib/read-file";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { templateId, fieldValues } = await req.json();

  const template = await db.template.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  try {
    const buffer = await readDocxBuffer(template.fileUrl);

    // Fill placeholders with docxtemplater (same engine as export — handles {{FIELD}} correctly)
    const zip = new PizZip(buffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "___________",
    });

    // Extract actual {{TOKEN}} names from DOCX raw text
    const { extractRawText } = await import("mammoth");
    const { value: rawText } = await extractRawText({ buffer });
    const tokenRegex = /\{\{([^}#/^@><!]+)\}\}/g;
    const docxTokens = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = tokenRegex.exec(rawText)) !== null) {
      const tok = m[1].trim();
      if (tok && !tok.startsWith("#") && !tok.startsWith("/")) docxTokens.add(tok);
    }

    // Build safeValues: match incoming keys to actual DOCX tokens (case-insensitive)
    const safeValues: Record<string, string> = {};
    const incoming = fieldValues as Record<string, string | null>;
    for (const token of docxTokens) {
      const tokenLower = token.toLowerCase();
      const match = Object.entries(incoming).find(
        ([k]) => k === token || k.toLowerCase() === tokenLower
      );
      safeValues[token] = match ? (match[1] ?? "") : "";
    }
    // Also pass through any keys not matched by token scan (fallback)
    for (const [k, v] of Object.entries(incoming)) {
      if (!(k in safeValues)) safeValues[k] = v ?? "";
    }

    console.log("[preview] docxTokens:", [...docxTokens], "filled:", Object.keys(safeValues).filter(k => safeValues[k]));
    doc.render(safeValues);

    const filledBuffer = doc.getZip().generate({ type: "nodebuffer" });

    // Convert filled DOCX → HTML (with alignment preserved)
    const html = await convertToHtmlWithAlignment(filledBuffer);

    return NextResponse.json({ html, name: template.name });
  } catch (err) {
    console.error("Preview error:", err);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}
