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

function remapFieldValues(
  aiValues: Record<string, string>,
  templateFields: { name: string; label: string; type: string }[]
): Record<string, string> {
  if (!templateFields.length) return aiValues;
  const result: Record<string, string> = {};
  const fieldNames = templateFields.map(f => f.name);

  for (const [aiKey, aiVal] of Object.entries(aiValues)) {
    if (!aiVal && aiVal !== "") { result[aiKey] = aiVal; continue; }
    // 1. Exact match
    if (fieldNames.includes(aiKey)) { result[aiKey] = aiVal; continue; }
    // 2. Case-insensitive exact match
    const ciMatch = fieldNames.find(n => n.toLowerCase() === aiKey.toLowerCase());
    if (ciMatch) { result[ciMatch] = aiVal; continue; }
    // 3. Substring: field name contains aiKey
    const subMatch = fieldNames.find(n =>
      n.toLowerCase().includes(aiKey.toLowerCase())
    );
    if (subMatch && !result[subMatch]) { result[subMatch] = aiVal; continue; }
    // 4. No match — keep original key
    result[aiKey] = aiVal;
  }
  return result;
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
    return NextResponse.json({
      type: "chat",
      message: "Bạn chưa có mẫu hợp đồng nào. Hãy upload file .docx lên phần **Templates** trước nhé!",
    });
  }

  // Build template context with fields
  const templatesWithFields = await Promise.all(
    dbTemplates.map(async (t) => {
      const tokens = await extractDocxTokens(t.fileUrl);
      const placeholders = t.placeholders as { name: string; label: string; type: string }[];
      const fields = placeholders.length
        ? placeholders
        : tokens.map((tok) => ({ name: tok, label: tok.replace(/_/g, " "), type: "text" }));
      return { id: t.id, name: t.name, category: t.category, description: t.description ?? "", fields };
    })
  );

  const templateContext = templatesWithFields
    .map((t) => {
      const fieldLines = t.fields.length > 0
        ? t.fields.map((f, i) => `    ${i + 1}. ${f.label} → field_name: "${f.name}" (${f.type})`).join("\n")
        : "    (không có trường cố định — AI fill thông minh)";
      return `Template: "${t.name}" | ID: ${t.id} | Loại: ${t.category}\n  Fields:\n${fieldLines}`;
    })
    .join("\n\n");

  const history_ = (history as { role: string; text: string }[]).map((m) => ({
    role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
    content: m.text ?? "",
  }));

  const today = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  const systemPrompt = `Bạn là trợ lý AI của "Contract Faster" — giúp người dùng Việt Nam tạo hợp đồng nhanh chóng. Hãy giao tiếp như một người bạn thông minh, tự nhiên, không cứng nhắc.
Hôm nay: ${today}.

## TEMPLATE HIỆN CÓ:
${templateContext}

---
## CÁCH HÀNH XỬ

Hãy đọc kỹ lịch sử hội thoại và phản hồi tự nhiên như ChatGPT. Bạn có thể:
- Trả lời câu hỏi bất kỳ về hợp đồng, pháp lý
- Tư vấn người dùng nên dùng template nào
- Tạo hợp đồng khi có đủ thông tin cơ bản
- Hỏi thêm khi thực sự cần — nhưng KHÔNG hỏi máy móc từng trường một

**Khi tạo hợp đồng:** Chọn template phù hợp nhất, điền fieldValues bằng ĐÚNG field_name trong template. Trường nào không có thông tin thì để "". Nếu người dùng không cung cấp một số thông tin (số tiền, ngày tháng...) mà bạn có thể ước tính hợp lý thì cứ điền — họ có thể chỉnh sau. Tất cả giá trị trong `fieldValues` phải là **chuỗi ký tự (string)**, không dùng số nguyên hay null — ví dụ: `"5000000"` thay vì `5000000`, `""` thay vì `null`.

**Khi nào dùng type nào:**
- **"chat"** — trả lời, hỏi thêm, tư vấn
- **"direct"** — tạo hợp đồng ngay (biết template + có thông tin các bên)
- **"form"** — khi user muốn tự điền form thủ công

---
## FORMAT JSON (bắt buộc, chọn 1):

{"type":"chat","message":"..."}

{"type":"direct","templateId":"ID","templateName":"Tên","fieldValues":{"field_name":"giá trị"},"message":"..."}

{"type":"form","templateId":"ID","templateName":"Tên","message":"..."}

Luôn trả JSON hợp lệ, luôn dùng tiếng Việt.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        ...history_,
        { role: "user", content: command },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    let result: Record<string, unknown>;
    try {
      result = JSON.parse(raw);
    } catch {
      return NextResponse.json({ type: "chat", message: raw });
    }

    if (result.type === "direct") {
      const chosenTemplate = templatesWithFields.find(t => t.id === result.templateId) ?? templatesWithFields[0];
      const remapped = remapFieldValues(
        (result.fieldValues ?? {}) as Record<string, string>,
        chosenTemplate?.fields ?? []
      );
      return NextResponse.json({
        type: "direct",
        templateId: result.templateId,
        templateName: result.templateName,
        fieldValues: remapped,
        message: result.message ?? "Đã tạo hợp đồng!",
      });
    }

    if (result.type === "form") {
      const chosen = templatesWithFields.find((t) => t.id === result.templateId) ?? templatesWithFields[0];
      return NextResponse.json({
        type: "form",
        templateId: chosen.id,
        templateName: result.templateName ?? chosen.name,
        fields: chosen.fields,
        prefilled: result.prefilled ?? {},
        message: result.message ?? `Điền thông tin để tạo ${chosen.name}:`,
      });
    }

    return NextResponse.json({
      type: "chat",
      message: (result.message as string) ?? "Bạn cần tôi giúp gì?",
    });
  } catch (err) {
    console.error("[smart-create]", err);
    return NextResponse.json({
      type: "chat",
      message: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.",
    });
  }
}
