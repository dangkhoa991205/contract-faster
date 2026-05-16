import { NextResponse } from "next/server";
import mammoth from "mammoth";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readDocxBuffer } from "@/lib/read-file";
import { normalizeFieldValues, lookupField } from "@/lib/contract-normalizer";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const contract = await db.contract.findFirst({
    where: { id, userId: session.user.id },
    include: { template: true },
  });

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  try {
    const templateBuffer = await readDocxBuffer(contract.template.fileUrl);

    // Extract raw text to detect template style and tokens
    const { value: rawText } = await mammoth.extractRawText({ buffer: templateBuffer });

    // Extract {{TOKEN}} style tokens from DOCX
    const tokenRegex = /\{\{([^}#/^@><!]+)\}\}/g;
    const docxTokens = new Set<string>();
    let tok: RegExpExecArray | null;
    while ((tok = tokenRegex.exec(rawText)) !== null) {
      const t = tok[1].trim();
      if (t && !t.startsWith("#") && !t.startsWith("/")) docxTokens.add(t);
    }

    // Dots-style templates not supported in export
    if (docxTokens.size === 0) {
      return NextResponse.json(
        { error: "This template uses dots/blanks style which is not supported for direct export. Please use the preview feature instead." },
        { status: 400 }
      );
    }

    // Normalize field values: handles null, coerces to string, formats Vietnamese numbers
    const normalized = normalizeFieldValues(
      (contract.fieldValues ?? {}) as Record<string, any>
    );

    // Build safeValues: each DOCX token → string value (case-insensitive lookup)
    const safeValues: Record<string, string> = {};
    for (const token of docxTokens) {
      safeValues[token] = lookupField(token, normalized);
    }

    // Render with docxtemplater
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
    });
    doc.render(safeValues);

    const outputBuffer = doc
      .getZip()
      .generate({ type: "nodebuffer", compression: "DEFLATE" });

    return new NextResponse(outputBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${contract.title.replace(/[^a-zA-Z0-9]/g, "_")}.docx"`,
      },
    });
  } catch (err) {
    console.error("[export]", err);
    return NextResponse.json({ error: "Export failed: " + String(err) }, { status: 500 });
  }
}
