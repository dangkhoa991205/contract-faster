import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { openai } from "@/lib/openai";
import mammoth from "mammoth";
import { convertToHtmlWithAlignment } from "@/lib/docx-html";
import { readDocxBuffer } from "@/lib/read-file";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { templateId, fieldValues, contractName } = await req.json();

  const template = await db.template.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  try {
    const buffer = await readDocxBuffer(template.fileUrl);

    const { value: rawText } = await mammoth.extractRawText({ buffer });
    const hasTokens = /\{\{[^}]+\}\}/.test(rawText);

    let html: string;

    if (hasTokens) {
      // {{TOKEN}} style — fill with docxtemplater (structure fully preserved)
      const tokenRegex = /\{\{([^}#/^@><!]+)\}\}/g;
      const docxTokens = new Set<string>();
      let m: RegExpExecArray | null;
      while ((m = tokenRegex.exec(rawText)) !== null) {
        const tok = m[1].trim();
        if (tok && !tok.startsWith("#") && !tok.startsWith("/")) docxTokens.add(tok);
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

      const zip = new PizZip(buffer);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => "___________" });
      doc.render(safeValues);
      const filledBuffer = doc.getZip().generate({ type: "nodebuffer" });
      html = await convertToHtmlWithAlignment(filledBuffer);
    } else {
      // ……… style — convert DOCX→HTML then fill blanks by position (structure fully preserved)
      const docHtml = await convertToHtmlWithAlignment(buffer);

      const blankPattern = /\.{3,}|…{2,}/g;
      const blanks: { offset: number }[] = [];
      let bm: RegExpExecArray | null;
      const tmp = docHtml;
      while ((bm = blankPattern.exec(tmp)) !== null) blanks.push({ offset: bm.index });

      let filledHtml = docHtml;
      if (blanks.length > 0) {
        const snippets = blanks.map((b, i) => {
          const ctx = docHtml.slice(Math.max(0, b.offset - 80), b.offset + 80).replace(/<[^>]+>/g, "").trim();
          return `[${i}] "${ctx}"`;
        }).join("\n");

        const fieldList = Object.entries(fieldValues as Record<string, string>)
          .filter(([, v]) => v?.trim()).map(([k, v]) => `${k}: ${v}`).join("\n");

        const fc = await openai.chat.completions.create({
          model: "gpt-4o", temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `Danh sách chỗ trống trong hợp đồng (kèm ngữ cảnh) và thông tin cần điền.\nTrả về JSON: {"fills":{"0":"giá_trị","1":"giá_trị",...}}\nChỉ điền index có thông tin phù hợp. Không giải thích.\n\nThông tin:\n${fieldList}` },
            { role: "user", content: snippets },
          ],
        });
        let fills: Record<string, string> = {};
        try { fills = (JSON.parse(fc.choices[0].message.content ?? "{}")).fills ?? {}; } catch { /* ignore */ }

        let bIdx = 0;
        filledHtml = docHtml.replace(blankPattern, (match) => {
          const fill = fills[String(bIdx++)];
          return fill ? `<strong>${fill}</strong>` : match;
        });
      }
      html = filledHtml;
    }

    // Return a full HTML page styled for print/PDF
    const name = contractName ?? template.name;
    const printHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>${name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 13pt;
      line-height: 1.8;
      color: #000;
      background: white;
      padding: 0;
    }
    .page {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm 25mm 25mm;
      min-height: 297mm;
    }
    h1, h2, h3 { font-weight: bold; margin: 14pt 0 8pt; }
    p { margin-bottom: 8pt; }
    p:not([style*="text-align"]) { text-align: justify; }
    table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
    td, th { border: 1px solid #333; padding: 6pt 10pt; }
    @media print {
      body { padding: 0; }
      .page { padding: 15mm 20mm; }
      @page { size: A4; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="page">${html}</div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

    return new Response(printHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${name}.html"`,
      },
    });
  } catch (err) {
    console.error("PDF error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
