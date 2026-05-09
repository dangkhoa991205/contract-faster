"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

type AiChatSidebarProps = {
  contractId?: string;
  templateName: string;
  placeholderCount: number;
};

export function AiChatSidebar({
  contractId,
  templateName,
  placeholderCount,
}: AiChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Tôi đã nhận diện **${placeholderCount} trường** cần điền trong template "${templateName}". Hãy điền vào form bên trái. Bạn có thể hỏi tôi về bất kỳ điều khoản nào trong hợp đồng!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractId,
        message: input,
        templateName,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại." },
      ]);
    }
    setLoading(false);
  }

  return (
    <div className="w-80 flex-shrink-0 border-l border-zinc-200 bg-zinc-50 flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-200 bg-white">
        <div className="font-medium text-sm text-zinc-900">AI Assistant</div>
        <div className="text-xs text-zinc-500">Hỏi về điều khoản hợp đồng</div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              msg.role === "user"
                ? "bg-indigo-600 text-white ml-4"
                : "bg-white border border-zinc-200 text-zinc-700"
            )}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
          </div>
        )}
      </div>

      <div className="p-3 border-t border-zinc-200 bg-white">
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Hỏi về hợp đồng..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-zinc-400 mt-2">
          * AI không thay thế tư vấn pháp lý chính thức
        </p>
      </div>
    </div>
  );
}
