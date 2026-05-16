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

async function uploadFile(buffer: Buffer, filename: string): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`templates/${filename}`, buffer, { access: "public" });
    return blob.url;
  } else {
    const { writeFile, mkdir } = await import("fs/promises");
    const { join } = await import("path");
    const uploadDir = join(process.cwd(), "uploads", "templates");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);
    return `/uploads/templates/${filename}`;
  }
}

async function extractPlaceholders(buffer: Buffer): Promise<Array<{ name: string; label: string; type: string }>> {
  try {
    const { value: rawText } = await mammoth.extractRawText({ buffer });
    const tokenSet = new Set<string>();
    const tokenRegex = /\{\{([^}#/^@><!]+)\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = tokenRegex.exec(rawText)) !== null) {
      const tok = m[1].trim();
      if (tok && !tok.startsWith("#") && !tok.startsWith("/")) tokenSet.add(tok);
    }
    const tokens = Array.from(tokenSet);

    if (tokens.length > 0) {
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
        return tokens.map(tok => {
          const found = parsed.find(p => p.name === tok);
          return found ?? { name: tok, label: tok.replace(/_/g, " "), type: "text" };
        });
      }
    } else {
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
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error("[extractPlaceholders] error:", err);
  }
  return [];
}

// Single template upload
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureUser(session);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error("[POST /api/templates] formData error:", err);
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  // Bulk upload: multiple files
  const files = formData.getAll("file") as File[];
  const name = formData.get("name") as string | null;
  const category = (formData.get("category") as string) || "Khác";
  const language = (formData.get("language") as string) ?? "vi";

  if (files.length === 0) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // Bulk mode: multiple files, names auto-derived from filename
  if (files.length > 1 || !name) {
    const results: Array<{ success: boolean; name: string; error?: string; template?: object }> = [];

    for (const file of files) {
      if (!file.name.endsWith(".docx")) {
        results.push({ success: false, name: file.name, error: "Only .docx files are supported" });
        continue;
      }

      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const templateName = name || file.name.replace(/\.docx$/i, "").replace(/[-_]/g, " ");

        const [fileUrl, placeholders] = await Promise.all([
          uploadFile(buffer, filename),
          extractPlaceholders(buffer),
        ]);

        const template = await db.template.create({
          data: {
            name: templateName,
            category,
            language,
            fileUrl,
            placeholders,
            isPublic: false,
            userId: session.user.id,
          },
        });

        results.push({ success: true, name: templateName, template });
      } catch (err) {
        console.error(`[POST /api/templates] bulk error for ${file.name}:`, err);
        results.push({ success: false, name: file.name, error: String(err) });
      }
    }

    const allOk = results.every(r => r.success);
    return NextResponse.json({ bulk: true, results }, { status: allOk ? 201 : 207 });
  }

  // Single file upload
  const file = files[0];
  if (!name || !category) {
    return NextResponse.json({ error: "Missing required fields: name, category" }, { status: 400 });
  }
  if (!file.name.endsWith(".docx")) {
    return NextResponse.json({ error: "Only .docx files are supported" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  let fileUrl: string;
  try {
    fileUrl = await uploadFile(buffer, filename);
  } catch (err) {
    console.error("[POST /api/templates] upload error:", err);
    return NextResponse.json({ error: `File upload failed: ${String(err)}` }, { status: 500 });
  }

  const placeholders = await extractPlaceholders(buffer);

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
  } catch (err) {
    console.error("[POST /api/templates] DB error:", err);
    return NextResponse.json({ error: `Database error: ${String(err)}` }, { status: 500 });
  }
}
