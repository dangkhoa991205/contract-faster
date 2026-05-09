import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await db.template.findMany({
    where: {
      OR: [{ isPublic: true }, { userId: session.user.id }],
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const { writeFile, mkdir } = await import("fs/promises");
  const { join } = await import("path");
  const uploadDir = join(process.cwd(), "uploads", "templates");
  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const filepath = join(uploadDir, filename);
  await writeFile(filepath, Buffer.from(bytes));

  const fileUrl = `/uploads/templates/${filename}`;

  let placeholders: Array<{ name: string; label: string; type: string }> = [];
  try {
    const detectRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/ai/detect-placeholders`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl }),
      }
    );
    if (detectRes.ok) {
      const data = await detectRes.json();
      placeholders = data.placeholders ?? [];
    }
  } catch {
    // Non-fatal: template saved without placeholders, user can retry
  }

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
}
