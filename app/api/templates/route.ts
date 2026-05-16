import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import mammoth from "mammoth";
import { openai } from "@/lib/openai";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const templates = await db.template.findMany({
      where: { OR: [{ isPublic: true }, { userId: session.user.id }] },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureUser(session);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const language = (formData.get("language") as string) ?? "vi";

  if (!file || !name || !category) {
    return NextResponse.json(
      { error: "Missing required fields: file, name, category" },
      { status: 400 }
    );
  }

  if (!file.name.endsWith(".docx")) {
    return NextResponse.json(
      { error: "Only .docx files are supported" },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  let fileUrl: string;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Vercel Blob (production)
    const { put } = await import("@vercel/blob");
    const blob = await put(`templates/${filename}`, buffer, { access: "public" });
    fileUrl = blob.url;
  } else {
    // Local filesystem (development)
    const { writeFile, mkdir } = await import("fs/promises");
    const { join } = await import("path");
    const uploadDir = join(process.cwd(), "uploads", "templates");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);
    fileUrl = `/uploads/templates/${filename}`;
  }

  // Extract actual {{FIELD_NAME}} placeholders directly from DOCX raw text
  let placeholders: Array<{ name: string; label: string; type: string }> = [];
  try {
    const { value: rawText } = await mammoth.extractRawText({ buffer });

    // Step 1: find all {{...}} tokens directly — these are the exact names docxtemplater uses
    const tokenSet = new Set<string>();
    const tokenRegex = /\{\{([^}#/^@><!]+)\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = tokenRegex.exec(rawText)) !== null) {
      const tok = m[1].trim();
      if (tok && !tok.startsWith("#") && !tok.startsWith("/")) tokenSet.add(tok);
    }
    const tokens = Array.from(tokenSet);

    if (tokens.length > 0) {
      // Step 2: ask AI to generate Vietnamese labels for each exact field name
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `Given these contract field variable names, return a JSON array with Vietnamese labels and types.
Format: [{"name":"EXACT_VAR_NAME","label":"Nhãn tiếng Việt","type":"text|date|number|email"}]
Return ONLY the JSON array, no explanation.`,
          },
          { role: "user", content: `Field names: ${tokens.join(", ")}` },
        ],
      });
      const content = completion.choices[0].message.content ?? "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed: Array<{ name: string; label: string; type: string }> = JSON.parse(jsonMatch[0]);
        // Ensure the name field exactly matches the token from DOCX
        placeholders = tokens.map(tok => {
          const found = parsed.find(p => p.name === tok);
          return found ?? { name: tok, label: tok.replace(/_/g, " "), type: "text" };
        });
      }
    } else {
      // Fallback: no {{}} tokens found — ask AI to detect fill-in spots
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `Extract fill-in-the-blank fields from this contract. Return ONLY JSON array:
[{"name":"FIELD_NAME","label":"Nhãn tiếng Việt","type":"text|date|number|email"}]`,
          },
          { role: "user", content: rawText.slice(0, 6000) },
        ],
      });
      const content = completion.choices[0].message.content ?? "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) placeholders = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Non-fatal: save without placeholders
  }

  try {
    const template = await db.template.create({
      data: {
        name,
        category,
        language,
        fileUrl,
        placeholders,
        isPublic: false,
        userId: session.user.id,
      },
    });
    return NextResponse.json(template, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Database error — template not saved" }, { status: 500 });
  }
}
