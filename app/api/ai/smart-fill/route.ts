import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fieldName, fieldLabel, fieldType, templateName } = await req.json();
  if (!fieldName || !fieldLabel || !templateName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Mock mode when no OpenAI key
  if (!process.env.OPENAI_API_KEY) {
    const mockSuggestions: Record<string, string> = {
      date: new Date().toLocaleDateString("vi-VN"),
      number: "10,000,000",
      email: "contact@example.com",
      text: `[Gợi ý mẫu cho ${fieldLabel}]`,
    };
    return NextResponse.json({ suggestion: mockSuggestions[fieldType ?? "text"] ?? `Mẫu: ${fieldLabel}` });
  }

  let user;
  try {
    user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  } catch {
    return NextResponse.json({ suggestion: `[Gợi ý: ${fieldLabel}]` });
  }

  if (user.plan === "FREE") {
    return NextResponse.json(
      { error: "AI features require a paid plan" },
      { status: 403 }
    );
  }

  const completion = await openai.chat.completions.create({
    model: "cx/gpt-5.5",
    messages: [
      {
        role: "system",
        content: `Bạn là trợ lý hợp đồng thông minh. Hãy gợi ý một giá trị hợp lý cho trường "${fieldLabel}" (kiểu: ${fieldType}) trong hợp đồng "${templateName}".
Chỉ trả về giá trị gợi ý, không giải thích. Tối đa 50 từ.`,
      },
      {
        role: "user",
        content: `Gợi ý giá trị cho trường: ${fieldLabel}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 100,
  });

  const suggestion = completion.choices[0].message.content?.trim() ?? "";

  return NextResponse.json({ suggestion });
}
