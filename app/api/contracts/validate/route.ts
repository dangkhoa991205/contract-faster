import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { templateId, fieldValues } = await req.json() as {
    templateId: string;
    fieldValues: Record<string, string>;
  };

  const template = await db.template.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const placeholders = template.placeholders as Array<{
    name: string; label: string; type: string; required: boolean;
  }>;

  const missing = placeholders
    .filter(p => p.required && !fieldValues[p.name]?.trim())
    .map(p => ({ name: p.name, label: p.label }));

  return NextResponse.json({ valid: missing.length === 0, missing });
}
