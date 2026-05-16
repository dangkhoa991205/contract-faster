import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { openai } from "@/lib/openai";
import mammoth from "mammoth";
import { readDocxBuffer } from "@/lib/read-file";

async function extractDocxTokens(fileUrl: string): Promise<string[]> {
  try {
    const buffer = await readDocxBuffer(fileUrl);
    const { value: rawText } = await mammoth.extractRawText({ buffer });
    const tokenRegex = /\{\{([^}#/^@><!]+)\}\}/g;
    const tokens = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = tokenRegex.exec(rawText)) !== null) {
      const tok = m[1].trim();
      if (tok && !tok.startsWith("#") && !tok.startsWith("/")) tokens.add(tok);
    }
    return [...tokens];
  } catch {
    return [];
  }
}

async function resolveFields(
  templateId: string,
  tokens: string[],
  placeholders: { name: string; label: string; type: string }[],
  fileUrl: string
): Promise<{ name: string; label: string; type: string }[]> {
  if (placeholders.length) return placeholders;
  if (tokens.length) return tokens.map(t => ({ name: t, label: t.replace(/_/g, " "), type: "text" }));
  try {
    const buf = await readDocxBuffer(fileUrl);
    const { value: raw } = await mammoth.extractRawText({ buffer: buf });
    const fc = await openai.chat.completions.create({
      model: "gpt-4o-mini", temperature: 0,
      messages: [
        { role: "system", content: `List fillable fields. Return JSON array only: [{"name":"snake_case","label":"Nhãn tiếng Việt","type":"text|date|number"}]. Max 15.` },
        { role: "user", content: raw.slice(0, 3000) },
      ],
    });
    const match = (fc.choices[0].message.content ?? "").match(/\[[\s\S]*\]/);
    if (match) {
      const fields = JSON.parse(match[0]);
      await db.template.update({ where: { id: templateId }, data: { placeholders: fields } });
      return fields;
    }
  } catch { /* ignore */ }
  return [];
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { command, history = [] } = await req.json();
  if (!command) return NextResponse.json({ error: "Missing command" }, { status: 400 });

  const dbTemplates = await db.template.findMany({
    where: { OR: [{ isPublic: true }, { userId: session.user.id }] },
    orderBy: { createdAt: "desc" },
  });

  if (!dbTemplates.length) {
    return NextResponse.json({ type: "chat", message: "Bạn chưa có mẫu hợp đồng nào. Vào **Templates** để upload file .docx trước nhé!" });
  }

  const templatesWithMeta = await Promise.all(
    dbTemplates.map(async (t) => {
      const tokens = await extractDocxTokens(t.fileUrl);
      const placeholders = t.placeholders as { name: string; label: string; type: string }[];
      const fields = placeholders.length ? placeholders : tokens.map(tok => ({ name: tok, label: tok.replace(/_/g, " "), type: "text" }));
      return { id: t.id, name: t.name, category: t.category, tokens, placeholders, fields };
    })
  );

  const templateContext = templatesWithMeta.map(t => {
    const fieldStr = t.fields.map(f => `${f.name}="${f.label}"`).join(", ") || "(tự detect)";
    return `ID="${t.id}" name="${t.name}" category="${t.category}" fields=[${fieldStr}]`;
  }).join("\n");

  const history_ = (history as { role: string; text: string }[]).map(m => ({
    role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
    content: m.text ?? "",
  }));

  const today = new Date().toLocaleDateString("vi-VN");

  const systemPrompt = `Bạn là AI assistant của "Contract Faster". Ngày hôm nay: ${today}.

Mẫu hợp đồng hiện có:
${templateContext}

---
CÁCH PHẢN HỒI — trả về JSON theo 1 trong 3 dạng:

{"type":"chat","message":"nội dung trả lời"}

{"type":"direct","templateId":"id","templateName":"tên","fieldValues":{"field":"value"},"message":"thông báo ngắn"}

{"type":"form","templateId":"id","templateName":"tên","prefilled":{"field":"value"},"message":"nội dung"}

---
NGUYÊN TẮC HOẠT ĐỘNG:

Khi người dùng yêu cầu tạo hợp đồng (dù chỉ nói "tạo đi", "làm hợp đồng", "tạo hợp đồng KOL"...):
→ LUÔN dùng "direct", chọn template phù hợp nhất, extract mọi thông tin có trong câu/lịch sử chat, điền vào fieldValues. Trường nào không có info thì để "". KHÔNG hỏi thêm, KHÔNG show form, cứ tạo luôn.

Chỉ dùng "form" khi người dùng YÊU CẦU TRỰC TIẾP muốn tự điền form ("cho tôi form", "tôi muốn điền tay"...).

Dùng "chat" cho: hỏi thăm, tư vấn, hỏi về dịch vụ, không liên quan hợp đồng.

Ngày ký mặc định = hôm nay. Tên công ty/bên nếu không biết để "".
Luôn thân thiện, ngắn gọn, tự nhiên.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        ...history_,
        { role: "user", content: command },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    let result: Record<string, unknown>;
    try { result = JSON.parse(raw); } catch { return NextResponse.json({ type: "chat", message: raw }); }

    if (result.type === "direct") {
      return NextResponse.json({
        type: "direct",
        templateId: result.templateId,
        templateName: result.templateName,
        fieldValues: result.fieldValues ?? {},
        message: result.message ?? "Đang tạo hợp đồng...",
      });
    }

    if (result.type === "form") {
      const chosen = templatesWithMeta.find(t => t.id === result.templateId) ?? templatesWithMeta[0];
      const fields = await resolveFields(chosen.id, chosen.tokens, chosen.placeholders, chosen.id);
      return NextResponse.json({
        type: "form",
        templateId: chosen.id,
        templateName: result.templateName ?? chosen.name,
        fields,
        prefilled: result.prefilled ?? {},
        message: result.message ?? `Điền thông tin để tạo ${chosen.name}:`,
      });
    }

    return NextResponse.json({ type: "chat", message: (result.message as string) ?? "Bạn cần tôi giúp gì?" });

  } catch (err) {
    console.error("[smart-create]", err);
    return NextResponse.json({ type: "chat", message: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại." });
  }
}
