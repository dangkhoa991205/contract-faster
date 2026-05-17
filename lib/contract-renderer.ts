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

  // Match runs of 2+ dots or ellipsis chars
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

  // Build FULL document text with each blank marked as [BLANK_N]
  // This lets AI see the entire contract structure — no context confusion
  const stripHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  let markedText = "";
  let lastPos = 0;
  let idx = 0;
  for (const b of blanks) {
    markedText += stripHtml(docHtml.slice(lastPos, b.offset));
    markedText += `[BLANK_${idx++}]`;
    lastPos = b.offset + b.len;
  }
  markedText += stripHtml(docHtml.slice(lastPos));

  // Truncate if extremely long (GPT-4o handles 128K but keep cost reasonable)
  const docText = markedText.length > 8000
    ? markedText.slice(0, 8000) + "...[truncated]"
    : markedText;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Bạn điền thông tin vào hợp đồng. Các chỗ trống được đánh dấu [BLANK_N].

THÔNG TIN CÓ SẴN:
${fieldList}

Đọc toàn bộ văn bản hợp đồng bên dưới, hiểu ngữ cảnh từng [BLANK_N], rồi điền đúng thông tin.

QUY TẮC QUAN TRỌNG:
- Ô "Ông/bà", "họ tên" → điền tên người
- Ô "Hộ khẩu thường trú", "địa chỉ" → điền địa chỉ nhà/nơi ở (KHÔNG điền website/link)
- Ô "Website", "fanpage", "địa chỉ website" → điền URL/link
- Ô "STK", "số tài khoản" → điền dãy số tài khoản ngân hàng
- Ô "Chủ tài khoản" → điền tên chủ tài khoản (tên người hoặc công ty)
- Ô "Ngân hàng" → điền tên ngân hàng
- Ô "do ... cấp" → điền tên cơ quan cấp CMND/CCCD
- Ô "cấp ngày" → điền ngày cấp CMND/CCCD
- Không bịa thông tin, không điền nhầm loại
- BLANK không có dữ liệu phù hợp → bỏ qua
- Trả về JSON: {"fills":{"0":"giá_trị","1":"giá_trị",...}}`,
        },
        { role: "user", content: docText },
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
