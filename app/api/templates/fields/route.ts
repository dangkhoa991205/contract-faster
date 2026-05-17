import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { openai } from "@/lib/openai";
import mammoth from "mammoth";
import { readDocxBuffer } from "@/lib/read-file";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { templateId } = await req.json();
  const template = await db.template.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If DB has placeholders already, return them
  const stored = template.placeholders as { name: string; label: string; type: string }[];
  if (stored?.length > 0) return NextResponse.json({ fields: stored });

  // Otherwise extract from DOCX via AI
  try {
    const buffer = await readDocxBuffer(template.fileUrl);
    const { value: rawText } = await mammoth.extractRawText({ buffer });

    // Check for {{}} tokens first
    const tokenRegex = /\{\{([^}#/^@><!]+)\}\}/g;
    const tokens: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = tokenRegex.exec(rawText)) !== null) {
      const tok = m[1].trim();
      if (tok && !tok.startsWith("#") && !tok.startsWith("/")) tokens.push(tok);
    }

    if (tokens.length > 0) {
      const completion = await openai.chat.completions.create({
        model: "cx/gpt-5.5",
        temperature: 0,
        messages: [
          { role: "system", content: `Return JSON array of fields with Vietnamese labels. Format: [{"name":"EXACT_VAR","label":"Nhãn tiếng Việt","type":"text|date|number|email"}]. Return ONLY the array.` },
          { role: "user", content: `Fields: ${tokens.join(", ")}` },
        ],
      });
      const content = completion.choices[0].message.content ?? "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) return NextResponse.json({ fields: JSON.parse(jsonMatch[0]) });
    }

    // No {{}} — ask AI to identify fill-in fields from the raw text
    const completion = await openai.chat.completions.create({
      model: "cx/gpt-5.5",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `Đây là nội dung hợp đồng mẫu tiếng Việt. Các chỗ trống được ký hiệu bằng "………." hoặc dấu chấm lửng.
Hãy liệt kê các trường thông tin cần điền dưới dạng JSON array.
Format: [{"name":"ten_truong","label":"Nhãn tiếng Việt","type":"text|date|number"}]
Chỉ liệt kê các trường QUAN TRỌNG (tên, ngày, địa chỉ, số tiền...), tối đa 15 trường. Trả về ONLY JSON array.`,
        },
        { role: "user", content: rawText.slice(0, 4000) },
      ],
    });
    const content = completion.choices[0].message.content ?? "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const fields = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Save back to DB for next time
    await db.template.update({ where: { id: templateId }, data: { placeholders: fields } });

    return NextResponse.json({ fields });
  } catch (err) {
    console.error("[fields]", err);
    return NextResponse.json({ fields: [] });
  }
}
