import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readDocxBuffer } from "@/lib/read-file";
import { renderContract } from "@/lib/contract-renderer";
import { normalizeFieldValues } from "@/lib/contract-normalizer";
import type { ContractField } from "@/lib/contract-types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { templateId, fieldValues } = await req.json();

  const template = await db.template.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  try {
    const buffer = await readDocxBuffer(template.fileUrl);
    const normalizedValues = normalizeFieldValues(fieldValues ?? {});
    const templateFields = (template.placeholders ?? []) as ContractField[];

    const { html, missingRequired } = await renderContract(
      buffer,
      normalizedValues,
      templateFields
    );

    return NextResponse.json({ html, missingRequired });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
