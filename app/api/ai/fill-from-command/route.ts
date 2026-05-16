import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@/lib/openai";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { command, placeholders, templateName, history } = await req.json();

  if (!command || !placeholders) {
    return NextResponse.json({ error: "Missing command or placeholders" }, { status: 400 });
  }

  const placeholderList = placeholders
    .map((p: { name: string; label: string; type: string }) => `- ${p.name} (${p.label}, type: ${p.type})`)
    .join("\n");

  const systemPrompt = `You are a contract assistant for the SaaS platform "Contract Faster".
Your job: extract information from the user's natural language command and fill in the contract template fields.

Template: "${templateName}"
Fields to fill:
${placeholderList}

Rules:
1. Extract values from the user's command for as many fields as possible
2. For dates, format as YYYY-MM-DD
3. For numbers, return only the numeric value
4. If a field cannot be determined, return null for it
5. Respond with a JSON object: { "filled": { "field_name": "value_or_null", ... }, "message": "confirmation message in Vietnamese", "missing": ["field names still needed"] }
6. The message should be friendly, confirm what was filled, and ask for missing fields if any
7. Always respond in Vietnamese`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...(history ?? []).slice(-6),
    { role: "user", content: command },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content ?? "{}";
    const result = JSON.parse(content);

    return NextResponse.json({
      filled: result.filled ?? {},
      message: result.message ?? "Đã xử lý yêu cầu.",
      missing: result.missing ?? [],
    });
  } catch {
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
