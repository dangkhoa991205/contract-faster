import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { db } from "@/lib/db";
import { getQuotaLimits } from "@/lib/quota";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contractId, message, templateName } = await req.json();
  if (!message || !templateName) {
    return NextResponse.json({ error: "Missing message or templateName" }, { status: 400 });
  }

  // Mock mode when no OpenAI key
  if (!process.env.OPENAI_API_KEY) {
    const mockReplies = [
      `Đây là chế độ demo — chưa kết nối OpenAI. Câu hỏi của bạn: "${message}"\n\nTrong template "${templateName}", bạn có thể tham khảo các điều khoản tiêu chuẩn. ⚠️ Đây chỉ là gợi ý tham khảo, không thay thế tư vấn pháp lý chính thức.`,
    ];
    return NextResponse.json({ reply: mockReplies[0] });
  }

  let user;
  try {
    user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  } catch {
    return NextResponse.json({ reply: "Xin lỗi, không thể kết nối database." });
  }

  const quota = getQuotaLimits(user.plan);
  if (quota.aiChatsPerDay === 0) {
    return NextResponse.json(
      { error: "AI chat requires a paid plan" },
      { status: 403 }
    );
  }

  let chatSession = contractId
    ? await db.aiChat.findFirst({ where: { contractId } })
    : null;

  const messages = (chatSession?.messages as Array<{ role: string; content: string }>) ?? [];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Bạn là trợ lý pháp lý thông minh, hỗ trợ soạn thảo và giải thích hợp đồng "${templateName}".
Trả lời bằng tiếng Việt hoặc tiếng Anh tùy theo ngôn ngữ của câu hỏi.
Cuối mỗi câu trả lời về vấn đề pháp lý, thêm dòng: "⚠️ Đây chỉ là gợi ý tham khảo, không thay thế tư vấn pháp lý chính thức."`,
      },
      ...messages.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ],
    temperature: 0.5,
    max_tokens: 500,
  });

  const reply = completion.choices[0].message.content ?? "Xin lỗi, không thể trả lời lúc này.";

  const updatedMessages = [
    ...messages,
    { role: "user", content: message, timestamp: Date.now() },
    { role: "assistant", content: reply, timestamp: Date.now() },
  ];

  if (chatSession) {
    await db.aiChat.update({
      where: { id: chatSession.id },
      data: { messages: updatedMessages },
    });
  } else if (contractId) {
    await db.aiChat.create({
      data: { contractId, messages: updatedMessages },
    });
  }

  return NextResponse.json({ reply });
}
