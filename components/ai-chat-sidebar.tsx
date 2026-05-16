"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot } from "lucide-react";

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
      content: `Tôi đã nhận diện **${placeholderCount} trường** cần điền trong template "${templateName}". Hãy điền vào form bên trái hoặc dùng nút "AI gợi ý" cho từng trường. Bạn có thể hỏi tôi về bất kỳ điều khoản nào trong hợp đồng!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractId, message: input, templateName }),
    });

    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại." },
      ]);
    }
    setLoading(false);
  }

  return (
    <div
      className="w-80 flex-shrink-0 flex flex-col"
      style={{
        borderLeft: "1px solid rgba(255,255,255,0.07)",
        background: "#0a0a15",
      }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 py-3.5 flex items-center gap-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(99,102,241,0.2)" }}
        >
          <Bot className="w-4 h-4" style={{ color: "#a5b4fc" }} />
        </div>
        <div>
          <div className="text-sm font-medium" style={{ color: "#f1f1f3" }}>
            AI Assistant
          </div>
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            Hỏi về điều khoản hợp đồng
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
              msg.role === "user" ? "ml-6" : "mr-2"
            }`}
            style={
              msg.role === "user"
                ? { background: "#6366f1", color: "white" }
                : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.8)",
                  }
            }
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div
            className="rounded-xl px-3.5 py-2.5 mr-2 flex items-center gap-2"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#a5b4fc" }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Đang xử lý...
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex-shrink-0 p-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 text-sm rounded-lg outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
              color: "#f1f1f3",
            }}
            placeholder="Hỏi về hợp đồng..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="p-2 rounded-lg transition-opacity disabled:opacity-40"
            style={{ background: "#6366f1", color: "white" }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
          * AI không thay thế tư vấn pháp lý chính thức
        </p>
      </div>
    </div>
  );
}
