import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { openai } from "@/lib/openai";
import mammoth from "mammoth";
import { readDocxBuffer } from "@/lib/read-file";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { convertToHtmlWithAlignment } from "@/lib/docx-html";

/**
 * Smart fill for ……… style contracts.
 * Instead of giving the whole HTML to AI (which risks structure changes),
 * we ask AI to return a mapping of {position_index: value} for each blank,
 * then we do the replacement ourselves — structure is 100% preserved.
 */
async function fillDotsStyle(
  docHtml: string,
  fieldValues: Record<string, string>
): Promise<string> {
  // Find all ……… patterns (various lengths of dots/ellipsis)
  const blankPattern = /\.{3,}|…{2,}|(?:\.\.\.+)/g;
  const blanks: { index: number; match: string; offset: number }[] = [];
  let m: RegExpExecArray | null;
  const tempHtml = docHtml;
  while ((m = blankPattern.exec(tempHtml)) !== null) {
    blanks.push({ index: blanks.length, match: m[0], offset: m.index });
  }

  if (blanks.length === 0) return docHtml;

  // Build context snippets for AI to understand what each blank represents
  const snippets = blanks.map((b, i) => {
    const start = Math.max(0, b.offset - 80);
    const end = Math.min(docHtml.length, b.offset + 80);
    const ctx = docHtml.slice(start, end).replace(/<[^>]+>/g, "").trim();
    return `[${i}] context: "${ctx}"`;
  }).join("\n");

  const fieldList = Object.entries(fieldValues)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  // Ask AI ONLY to return index→value mapping, never touch HTML
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Bạn nhận danh sách chỗ trống trong hợp đồng (kèm ngữ cảnh) và thông tin cần điền.
Trả về JSON: {"fills": {"0": "giá_trị", "1": "giá_trị", ...}}
Chỉ điền những index có thông tin phù hợp. Index không có thông tin → bỏ qua (không đưa vào JSON).
Không giải thích gì thêm, chỉ trả JSON.

Thông tin:
${fieldList}`,
      },
      { role: "user", content: snippets },
    ],
  });

  let fills: Record<string, string> = {};
  try {
    const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
    fills = parsed.fills ?? {};
  } catch { /* keep blanks as is */ }

  // Replace blanks in HTML by position — preserves ALL tags and attributes
  let blankIdx = 0;
  const result = docHtml.replace(blankPattern, (match) => {
    const fill = fills[String(blankIdx++)];
    return fill ? `<strong>${fill}</strong>` : match;
  });

  return result;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { templateId, fieldValues } = await req.json();

  const template = await db.template.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const buffer = await readDocxBuffer(template.fileUrl);

  try {
    const { value: rawText } = await mammoth.extractRawText({ buffer });
    const hasTokens = /\{\{[^}]+\}\}/.test(rawText);

    if (hasTokens) {
      // {{TOKEN}} style — docxtemplater fills DOCX, then mammoth converts → structure fully preserved
      const tokenRegex = /\{\{([^}#/^@><!]+)\}\}/g;
      const docxTokens = new Set<string>();
      let tok: RegExpExecArray | null;
      while ((tok = tokenRegex.exec(rawText)) !== null) {
        const t = tok[1].trim();
        if (t && !t.startsWith("#") && !t.startsWith("/")) docxTokens.add(t);
      }

      const incoming = fieldValues as Record<string, string | null>;
      const safeValues: Record<string, string> = {};
      for (const token of docxTokens) {
        const tokenLower = token.toLowerCase();
        const match = Object.entries(incoming).find(
          ([k]) => k === token || k.toLowerCase() === tokenLower
        );
        safeValues[token] = match ? (match[1] ?? "") : "";
      }
      for (const [k, v] of Object.entries(incoming)) {
        if (!(k in safeValues)) safeValues[k] = v ?? "";
      }

      try {
        const zip = new PizZip(buffer);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          nullGetter: () => "",
          delimiters: { start: "{{", end: "}}" },
        });
        doc.render(safeValues);
        const filled = doc.getZip().generate({ type: "nodebuffer" });
        const html = await convertToHtmlWithAlignment(filled);
        if (html) return NextResponse.json({ html });
      } catch (docxErr) {
        console.error("[generate] docxtemplater error, falling back to raw mammoth:", docxErr);
      }
      // Fallback: convert original DOCX to HTML without filling (better than empty)
      const html = await convertToHtmlWithAlignment(buffer);
      return NextResponse.json({ html });
    }

    // ……… style — convert DOCX→HTML (preserves all structure/alignment), then fill blanks by position
    const docHtml = await convertToHtmlWithAlignment(buffer);
    const filledHtml = await fillDotsStyle(docHtml, fieldValues as Record<string, string>);
    return NextResponse.json({ html: filledHtml });

  } catch (err) {
    console.error("[generate]", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
