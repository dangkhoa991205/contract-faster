import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@/lib/openai";
import mammoth from "mammoth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const mime = file.type;
  const name = file.name;

  // DOCX
  if (name.endsWith(".docx") || mime.includes("word")) {
    try {
      const { value: text } = await mammoth.extractRawText({ buffer });
      return NextResponse.json({
        type: "docx",
        filename: name,
        content: text.slice(0, 4000),
        message: `📄 Đã đọc file **${name}**. Nội dung chính:\n\n${text.slice(0, 500)}...`,
      });
    } catch {
      return NextResponse.json({ error: "Cannot read DOCX" }, { status: 500 });
    }
  }

  // Image - use GPT-4o vision
  if (mime.startsWith("image/")) {
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mime};base64,${base64}`;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl } },
              { type: "text", text: "Hãy đọc và trích xuất toàn bộ nội dung văn bản trong ảnh này (OCR). Nếu là hợp đồng, hãy tóm tắt các thông tin chính: tên các bên, giá trị, thời hạn. Trả lời bằng tiếng Việt." },
            ],
          },
        ],
        max_tokens: 1500,
      });
      const desc = completion.choices[0].message.content ?? "";
      return NextResponse.json({
        type: "image",
        filename: name,
        content: desc,
        message: `🖼️ Đã phân tích ảnh **${name}**:\n\n${desc}`,
      });
    } catch (err) {
      console.error("[chat-upload]", err);
      return NextResponse.json({ error: "Cannot analyze image" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unsupported file type. Supported: DOCX, JPG, PNG, WEBP" }, { status: 400 });
}
