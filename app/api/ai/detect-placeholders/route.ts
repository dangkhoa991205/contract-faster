import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@/lib/openai";
import mammoth from "mammoth";
import { readDocxBuffer } from "@/lib/read-file";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileUrl } = await req.json();
  if (!fileUrl) {
    return NextResponse.json({ error: "fileUrl is required" }, { status: 400 });
  }

  const buffer = await readDocxBuffer(fileUrl);

  const { value: text } = await mammoth.extractRawText({ buffer });

  const completion = await openai.chat.completions.create({
    model: "cx/gpt-5.5",
    messages: [
      {
        role: "system",
        content: `You are a contract analysis assistant. Extract all placeholder fields from this contract template.
Placeholders can be: {{FIELD_NAME}}, [Field Name], underscores like ____________, or any obvious fill-in-the-blank spots.
Return ONLY a JSON array in this exact format:
[{"name": "FIELD_NAME_SNAKE_CASE", "label": "Human readable label in Vietnamese", "type": "text|date|number|email"}]
No explanation, just the JSON array.`,
      },
      {
        role: "user",
        content: text.slice(0, 8000),
      },
    ],
    temperature: 0,
  });

  let placeholders: Array<{ name: string; label: string; type: string }> = [];
  try {
    const content = completion.choices[0].message.content ?? "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      placeholders = JSON.parse(jsonMatch[0]);
    }
  } catch {
    placeholders = [];
  }

  return NextResponse.json({ placeholders });
}
