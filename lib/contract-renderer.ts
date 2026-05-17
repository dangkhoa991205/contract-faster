// lib/contract-renderer.ts
import mammoth from "mammoth";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { openai } from "@/lib/openai";
import { convertToHtmlWithAlignment } from "@/lib/docx-html";
import { lookupField } from "@/lib/contract-normalizer";
import type { ContractFieldValues, ContractField, RenderResult } from "@/lib/contract-types";

/**
 * Render a DOCX buffer with field values → HTML.
 * Handles both {{TOKEN}} style and ……… style templates.
 * Never throws — falls back to unfilled HTML on any error.
 */
export async function renderContract(
  buffer: Buffer,
  fieldValues: ContractFieldValues,
  templateFields: ContractField[] = []
): Promise<RenderResult> {
  // Detect which style the template uses
  const { value: rawText } = await mammoth.extractRawText({ buffer });
  const hasTokens = /\{\{[^}]+\}\}/.test(rawText);

  if (hasTokens) {
    return renderTokenStyle(buffer, rawText, fieldValues, templateFields);
  } else {
    return renderDotsStyle(buffer, fieldValues);
  }
}

/** Render {{TOKEN}} style template using docxtemplater. */
async function renderTokenStyle(
  buffer: Buffer,
  rawText: string,
  fieldValues: ContractFieldValues,
  templateFields: ContractField[]
): Promise<RenderResult> {
  // Extract tokens present in the DOCX
  const tokenRegex = /\{\{([^}#/^@><!]+)\}\}/g;
  const docxTokens = new Set<string>();
  let tok: RegExpExecArray | null;
  while ((tok = tokenRegex.exec(rawText)) !== null) {
    const t = tok[1].trim();
    if (t && !t.startsWith("#") && !t.startsWith("/")) docxTokens.add(t);
  }

  // Build safeValues: each DOCX token → string value (case-insensitive lookup)
  const safeValues: ContractFieldValues = {};
  for (const token of docxTokens) {
    safeValues[token] = lookupField(token, fieldValues);
  }

  // Detect which required fields are missing
  const missingRequired = templateFields
    .filter(f => f.required && !String(safeValues[f.name] ?? "").trim())
    .map(f => f.label);

  // Render with docxtemplater
  let filledBuffer: Buffer | null = null;
  try {
    const zip = new PizZip(buffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
    });
    doc.render(safeValues);
    filledBuffer = doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
  } catch (err) {
    console.error("[renderer:docxtemplater]", err instanceof Error ? err.stack : String(err));
  }

  // Convert to HTML (filled DOCX, or original as fallback)
  try {
    const src = filledBuffer ?? buffer;
    const html = await convertToHtmlWithAlignment(src);
    return { html, missingRequired };
  } catch (err) {
    console.error("[renderer:mammoth]", err instanceof Error ? err.message : String(err));
  }

  // Last resort: plain mammoth without alignment
  const { value: html } = await mammoth.convertToHtml({ buffer });
  return { html, missingRequired };
}

/** Render ……… style template: convert to HTML then fill blanks by position using AI. */
async function renderDotsStyle(
  buffer: Buffer,
  fieldValues: ContractFieldValues
): Promise<RenderResult> {
  const docHtml = await convertToHtmlWithAlignment(buffer);

  // Match runs of 2+ dots or ellipsis chars — captures all blank patterns
  const blankPattern = /\.{2,}|…+/g;
  const blanks: { offset: number; len: number }[] = [];
  let bm: RegExpExecArray | null;
  const scanRegex = /\.{2,}|…+/g;
  while ((bm = scanRegex.exec(docHtml)) !== null) {
    blanks.push({ offset: bm.index, len: bm[0].length });
  }

  if (blanks.length === 0) return { html: docHtml, missingRequired: [] };

  const fieldList = Object.entries(fieldValues)
    .filter(([, v]) => v != null && String(v).trim())
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join("\n");

  if (!fieldList) return { html: docHtml, missingRequired: [] };

  // Build context snippets — 200 chars each side, strip HTML tags
  const stripHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const snippets = blanks.map((b, i) => {
    const before = stripHtml(docHtml.slice(Math.max(0, b.offset - 200), b.offset));
    const after = stripHtml(docHtml.slice(b.offset + b.len, Math.min(docHtml.length, b.offset + b.len + 200)));
    return `[${i}] ...${before} [___BLANK___] ${after}...`;
  }).join("\n\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Bạn điền thông tin vào các chỗ trống [___BLANK___] trong hợp đồng.

THÔNG TIN CÓ SẴN:
${fieldList}

QUY TẮC:
- Đọc kỹ ngữ cảnh TRƯỚC và SAU mỗi [___BLANK___] để biết ô đó cần điền gì
- Chỉ điền khi có thông tin phù hợp với ngữ cảnh (tên → tên người, địa chỉ → địa chỉ, STK → số tài khoản...)
- Không bịa thông tin, không điền nhầm trường
- Trả về JSON: {"fills":{"0":"giá_trị","1":"giá_trị",...}}
- Index không có thông tin phù hợp → bỏ qua (không đưa vào JSON)`,
        },
        { role: "user", content: snippets },
      ],
    });

    let fills: Record<string, string> = {};
    try {
      fills = (JSON.parse(completion.choices[0].message.content ?? "{}")).fills ?? {};
    } catch { /* keep blanks */ }

    let blankIdx = 0;
    const filledHtml = docHtml.replace(blankPattern, (match) => {
      const fill = fills[String(blankIdx++)];
      return fill ? `<strong>${fill}</strong>` : match;
    });

    return { html: filledHtml, missingRequired: [] };
  } catch (err) {
    console.error("[renderer:dotsStyle]", err instanceof Error ? err.message : String(err));
    return { html: docHtml, missingRequired: [] };
  }
}
