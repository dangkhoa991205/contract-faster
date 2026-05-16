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
      const fieldStr = t.fields.map((f) => `${f.name} (${f.label})`).join(", ") || "không có trường cố định";
      return `- Template: "${t.name}" | ID: ${t.id} | Loại: ${t.category} | Trường: [${fieldStr}]`;
    })
    .join("\n");

  const history_ = (history as { role: string; text: string }[]).map((m) => ({
    role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
    content: m.text ?? "",
  }));

  const today = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  const systemPrompt = `Bạn là trợ lý AI của "Contract Faster" — giúp người dùng tạo hợp đồng bằng cách trò chuyện tự nhiên.
Hôm nay: ${today}.

DANH SÁCH TEMPLATE HIỆN CÓ:
${templateContext}

---
## CÁCH HOẠT ĐỘNG

Bạn phải hành xử như một trợ lý thông minh, KHÔNG tự động tạo hợp đồng ngay khi chưa đủ thông tin.

### Khi người dùng nói mơ hồ (ví dụ: "tạo hợp đồng giúp tôi", "làm hợp đồng đi", "tôi cần hợp đồng"):
→ Dùng type "chat", HỎI họ muốn loại hợp đồng gì và với ai. Ví dụ:
  "Bạn muốn tạo loại hợp đồng gì? Ví dụ: hợp đồng KOL/influencer, nhân viên marketing, dịch vụ với khách hàng, hay loại khác?"

### Khi người dùng đã cho biết loại hợp đồng nhưng CHƯA đủ thông tin cần thiết:
→ Dùng type "chat", hỏi từng điểm còn thiếu một cách tự nhiên.
→ CHỈ hỏi các trường THỰC TẾ có trong template đó (xem danh sách Trường: [...]).
→ KHÔNG tự thêm yêu cầu ngoài template như CCCD, địa điểm ký, điều khoản... trừ khi field đó thực sự tồn tại trong template.
→ Hỏi tối đa 2-3 trường cùng lúc, không hỏi tất cả một lần.

### Khi đã có ĐỦ thông tin để tạo hợp đồng (biết template phù hợp + các thông tin chính):
→ Dùng type "direct" để tạo ngay. Thông tin nào không có thì để "".

### Khi người dùng YÊU CẦU tự điền form:
→ Dùng type "form".

---
## THÔNG TIN ĐỦ ĐỂ TẠO là:
- Biết được loại hợp đồng → chọn được template
- Có thông tin cho ít nhất 50% số field quan trọng của template đó
- Các field còn thiếu sẽ để trống (""), docxtemplater sẽ để chỗ trống trong hợp đồng

## KHI NGƯỜI DÙNG HỎI "CẦN THÔNG TIN GÌ":
→ Liệt kê ĐÚNG các field của template phù hợp nhất, dùng tên label tiếng Việt
→ KHÔNG thêm yêu cầu ngoài danh sách field của template

## THÔNG TIN KHÔNG ĐƯỢC TỰ BỊA:
- Số tiền, giá trị hợp đồng (phải hỏi)
- CCCD/CMND, MST (phải hỏi)
- Địa chỉ cụ thể (phải hỏi)
- Điều khoản pháp lý đặc biệt (chỉ dùng điều khoản từ template)

---
## FORMAT PHẢN HỒI — trả về JSON theo đúng 1 trong 3 dạng:

Dạng 1 — Hỏi thêm hoặc trả lời:
{"type":"chat","message":"nội dung thân thiện, ngắn gọn"}

Dạng 2 — Tạo hợp đồng ngay (khi đủ thông tin):
{"type":"direct","templateId":"ID_template","templateName":"tên template","fieldValues":{"field_name":"giá trị"},"message":"Tôi đã tạo hợp đồng ... cho bạn!"}

Dạng 3 — Hiện form để điền:
{"type":"form","templateId":"ID_template","templateName":"tên","message":"nội dung"}

Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn. KHÔNG giải thích JSON.`;

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
      return NextResponse.json({
        type: "direct",
        templateId: result.templateId,
        templateName: result.templateName,
        fieldValues: result.fieldValues ?? {},
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
