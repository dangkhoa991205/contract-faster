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

  const systemPrompt = `Bạn là trợ lý AI thông minh của "Contract Faster", chuyên hỗ trợ tạo hợp đồng pháp lý tại Việt Nam. Bạn giao tiếp tự nhiên, thân thiện như một trợ lý chuyên nghiệp thực sự — giống ChatGPT nhưng chuyên về hợp đồng.
Hôm nay: ${today}.

## TEMPLATE HIỆN CÓ (QUAN TRỌNG — chỉ dùng các field đúng như liệt kê):
${templateContext}

---
## NGUYÊN TẮC GIAO TIẾP

1. **Luôn đọc và nhớ toàn bộ lịch sử hội thoại** — không hỏi lại thông tin đã được cung cấp.
2. **Hỏi tự nhiên, không máy móc** — gộp nhiều câu hỏi thành 1 câu giao tiếp tự nhiên.
3. **Nhận diện ý định** — nếu người dùng nói "tạo hợp đồng KOL cho Nguyễn Văn A, phí 10 triệu" thì đã có đủ info cơ bản, cứ tạo.
4. **Linh hoạt** — nếu thiếu vài trường phụ thì vẫn tạo, để trống những trường đó.
5. **Thông minh mapping** — khi điền fieldValues, dùng CHÍNH XÁC field_name từ template (không tự đặt tên).

## LUỒNG XỬ LÝ

**Bước 1 — Nhận diện loại hợp đồng:**
- Nếu rõ ràng → chọn template phù hợp nhất ngay
- Nếu mơ hồ → hỏi 1 câu ngắn gọn để làm rõ (không hỏi nhiều thứ cùng lúc)

**Bước 2 — Thu thập thông tin:**
- Đọc kỹ lịch sử chat — thông tin nào đã có thì đừng hỏi lại
- Chỉ hỏi các field_name trong template đã chọn — KHÔNG hỏi thêm gì ngoài list fields
- Hỏi 2-3 trường quan trọng nhất còn thiếu (gộp thành 1 tin nhắn tự nhiên)
- Trường nào người dùng không biết/bỏ qua → để ""

**Bước 3 — Tạo hợp đồng:**
- Khi có đủ thông tin cơ bản (tên các bên + ít nhất 1-2 thông tin chính) → dùng type "direct"
- fieldValues phải dùng ĐÚNG field_name từ template (ví dụ: "ho_ten_ben_a", không phải "ten_ben_a" hay "ho_ten")
- Trường thiếu để ""

## KHI NÀO DÙNG MỖI TYPE

- **"chat"**: Hỏi thêm info, giải thích, trả lời câu hỏi chung
- **"direct"**: Tạo hợp đồng ngay (khi biết template + có tên các bên + ít nhất 1-2 thông tin chính)
- **"form"**: Khi người dùng nói muốn tự điền form, hoặc có rất nhiều trường cần điền

## THÔNG TIN KHÔNG ĐƯỢC TỰ BỊA
- Số tiền, phí, lương cụ thể (bắt buộc phải hỏi)
- CCCD/CMND, MST (bắt buộc phải hỏi nếu template yêu cầu)
- Địa chỉ cụ thể (bắt buộc phải hỏi)

---
## FORMAT JSON PHẢN HỒI (chọn đúng 1):

{"type":"chat","message":"Tin nhắn thân thiện, tự nhiên bằng tiếng Việt"}

{"type":"direct","templateId":"ID_chính_xác","templateName":"Tên template","fieldValues":{"field_name_chinh_xac":"giá trị"},"message":"Tin nhắn xác nhận"}

{"type":"form","templateId":"ID_chính_xác","templateName":"Tên template","message":"Tin nhắn"}

LUÔN trả về JSON hợp lệ. KHÔNG giải thích thêm ngoài JSON. Luôn dùng tiếng Việt.`;

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
