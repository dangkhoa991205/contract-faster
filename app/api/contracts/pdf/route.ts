import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readDocxBuffer } from "@/lib/read-file";
import { renderContract } from "@/lib/contract-renderer";
import { normalizeFieldValues } from "@/lib/contract-normalizer";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { templateId, fieldValues, contractName } = await req.json();

  const template = await db.template.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  try {
    const buffer = await readDocxBuffer(template.fileUrl);
    const normalizedValues = normalizeFieldValues(fieldValues ?? {});
    const { html } = await renderContract(buffer, normalizedValues);

    // Return a full HTML page styled for print/PDF
    const name = contractName ?? template.name;
    const printHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Hợp đồng</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { margin: 15mm 20mm; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 13pt;
      line-height: 1.6;
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

    return new NextResponse(printHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err) {
    console.error("PDF error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
