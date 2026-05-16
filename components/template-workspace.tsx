"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Mic,
  MicOff,
  Download,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  FileText,
  Sparkles,
} from "lucide-react";

type Placeholder = { name: string; label: string; type: string };

type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; filled?: Record<string, string | null>; missing?: string[] };

type Props = {
  templateId: string;
  templateName: string;
  templateCategory: string;
  placeholders: Placeholder[];
};

export function TemplateWorkspace({ templateId, templateName, templateCategory, placeholders }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Xin chào! Tôi đã sẵn sàng với template **${templateName}** (${templateCategory}).\n\nTemplate có **${placeholders.length} trường** cần điền. Bạn chỉ cần mô tả hợp đồng bằng lời nói — tôi sẽ tự động điền tất cả thông tin.\n\n**Ví dụ:** _"Tạo hợp đồng với công ty ABC, địa chỉ 123 Lê Lợi Q1, giá trị 50 triệu, thời hạn 3 tháng từ 1/6/2026"_`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [filledValues, setFilledValues] = useState<Record<string, string>>({});
  const [isListening, setIsListening] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFields, setShowFields] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build conversation history for AI context
  const getHistory = useCallback(() =>
    messages.map((m) => ({ role: m.role, content: m.content })),
    [messages]
  );

  async function sendCommand(text?: string) {
    const cmd = (text ?? input).trim();
    if (!cmd || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: cmd }]);
    setLoading(true);

    const res = await fetch("/api/ai/fill-from-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command: cmd,
        placeholders,
        templateName,
        history: getHistory(),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      // Merge newly filled values
      const newFilled: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.filled ?? {})) {
        if (v !== null && v !== undefined && String(v).trim() !== "") {
          newFilled[k] = String(v);
        }
      }
      setFilledValues((prev) => ({ ...prev, ...newFilled }));
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          filled: data.filled,
          missing: data.missing,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại." },
      ]);
    }
    setLoading(false);
  }

  function toggleVoice() {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Trình duyệt không hỗ trợ nhận diện giọng nói. Vui lòng dùng Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "vi-VN";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      // Auto-send after voice
      setTimeout(() => sendCommand(transcript), 100);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  async function handleExport() {
    setExporting(true);
    const title = `HĐ ${templateName} - ${new Date().toLocaleDateString("vi-VN")}`;

    const createRes = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, templateId, fieldValues: filledValues }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      alert(err.error ?? "Lỗi khi tạo hợp đồng");
      setExporting(false);
      return;
    }

    const contract = await createRes.json();
    const exportRes = await fetch(`/api/contracts/${contract.id}/export`, { method: "POST" });

    if (exportRes.ok) {
      const blob = await exportRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      router.push("/app/contracts");
    } else {
      alert("Lỗi khi xuất file");
    }
    setExporting(false);
  }

  const filledCount = placeholders.filter((p) => filledValues[p.name]?.trim()).length;
  const allFilled = filledCount === placeholders.length && placeholders.length > 0;

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: "#080810" }}
    >
      {/* Top bar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#0a0a15" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/app/templates")}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.2)" }}
          >
            <FileText className="w-4 h-4" style={{ color: "#a5b4fc" }} />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: "#f1f1f3" }}>
              {templateName}
            </div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              {templateCategory} · {filledCount}/{placeholders.length} trường đã điền
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFields((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: showFields ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.05)",
              color: showFields ? "#a5b4fc" : "rgba(255,255,255,0.4)",
              border: `1px solid ${showFields ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.07)"}`,
            }}
          >
            {showFields ? "Ẩn fields" : "Xem fields"}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || filledCount === 0}
            className="flex items-center gap-2 text-sm px-4 py-1.5 rounded-lg font-medium transition-opacity disabled:opacity-40"
            style={{ background: allFilled ? "#6366f1" : "rgba(99,102,241,0.4)", color: "white" }}
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {exporting ? "Đang xuất..." : "Xuất .docx"}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-auto px-6 py-5 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2.5 mt-0.5"
                    style={{ background: "rgba(99,102,241,0.2)" }}
                  >
                    <Sparkles className="w-3.5 h-3.5" style={{ color: "#a5b4fc" }} />
                  </div>
                )}
                <div className="max-w-[75%]">
                  <div
                    className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                    style={
                      msg.role === "user"
                        ? { background: "#6366f1", color: "white", borderBottomRightRadius: 4 }
                        : {
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.85)",
                            borderBottomLeftRadius: 4,
                          }
                    }
                  >
                    <MessageContent content={msg.content} />
                  </div>

                  {/* Filled fields summary (assistant messages only) */}
                  {msg.role === "assistant" && msg.filled && Object.keys(msg.filled).length > 0 && (
                    <div
                      className="mt-2 rounded-xl p-3 text-xs space-y-1"
                      style={{
                        background: "rgba(99,102,241,0.07)",
                        border: "1px solid rgba(99,102,241,0.2)",
                      }}
                    >
                      {Object.entries(msg.filled)
                        .filter(([, v]) => v !== null)
                        .map(([k, v]) => {
                          const ph = placeholders.find((p) => p.name === k);
                          return (
                            <div key={k} className="flex items-center gap-2">
                              <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: "#4ade80" }} />
                              <span style={{ color: "rgba(255,255,255,0.5)" }}>{ph?.label ?? k}:</span>
                              <span style={{ color: "#a5b4fc" }}>{String(v)}</span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2.5"
                  style={{ background: "rgba(99,102,241,0.2)" }}
                >
                  <Sparkles className="w-3.5 h-3.5" style={{ color: "#a5b4fc" }} />
                </div>
                <div
                  className="rounded-2xl px-4 py-3 flex items-center gap-2"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#a5b4fc" }} />
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Đang xử lý...
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div
            className="flex-shrink-0 px-5 py-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="flex items-end gap-2 rounded-2xl px-4 py-3"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <textarea
                className="flex-1 bg-transparent text-sm resize-none outline-none leading-relaxed"
                style={{ color: "#f1f1f3", maxHeight: 120, minHeight: 24 }}
                placeholder='Ra lệnh bằng ngôn ngữ tự nhiên... VD: "Tạo hợp đồng với công ty ABC, giá 50 triệu"'
                value={input}
                rows={1}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendCommand();
                  }
                }}
              />
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={toggleVoice}
                  className="p-2 rounded-xl transition-colors"
                  style={{
                    background: isListening ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)",
                    color: isListening ? "#f87171" : "rgba(255,255,255,0.4)",
                    border: isListening ? "1px solid rgba(239,68,68,0.3)" : "1px solid transparent",
                  }}
                  title="Nhận diện giọng nói"
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => sendCommand()}
                  disabled={loading || !input.trim()}
                  className="p-2 rounded-xl transition-opacity disabled:opacity-40"
                  style={{ background: "#6366f1", color: "white" }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs mt-2 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
              Enter để gửi · Shift+Enter xuống dòng · Nhấn mic để nói
            </p>
          </div>
        </div>

        {/* Fields panel */}
        {showFields && (
          <div
            className="w-72 flex-shrink-0 flex flex-col overflow-hidden"
            style={{ borderLeft: "1px solid rgba(255,255,255,0.07)", background: "#0a0a15" }}
          >
            <div
              className="flex-shrink-0 px-4 py-3.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Thông tin hợp đồng
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}
                >
                  {filledCount}/{placeholders.length}
                </span>
              </div>

              {/* Progress bar */}
              <div
                className="mt-2.5 h-1 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${placeholders.length ? (filledCount / placeholders.length) * 100 : 0}%`,
                    background: allFilled ? "#4ade80" : "#6366f1",
                  }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-3 space-y-2">
              {placeholders.map((p) => {
                const val = filledValues[p.name];
                const filled = !!val?.trim();
                return (
                  <div
                    key={p.name}
                    className="rounded-xl p-3 transition-colors"
                    style={{
                      background: filled ? "rgba(99,102,241,0.07)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${filled ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {filled ? (
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#4ade80" }} />
                      ) : (
                        <Circle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
                      )}
                      <span className="text-xs font-medium truncate" style={{ color: filled ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)" }}>
                        {p.label}
                      </span>
                    </div>
                    <input
                      type={p.type === "date" ? "date" : p.type === "number" ? "number" : "text"}
                      className="w-full bg-transparent text-xs outline-none"
                      style={{ color: filled ? "#a5b4fc" : "rgba(255,255,255,0.25)" }}
                      value={val ?? ""}
                      placeholder="Chưa điền..."
                      onChange={(e) =>
                        setFilledValues((prev) => ({ ...prev, [p.name]: e.target.value }))
                      }
                    />
                  </div>
                );
              })}
            </div>

            {allFilled && (
              <div className="flex-shrink-0 p-3">
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: "#6366f1", color: "white" }}
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {exporting ? "Đang xuất..." : "Xuất hợp đồng"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Render markdown-lite: **bold**, _italic_, newlines
function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*|_[^_]+_|\n)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("_") && part.endsWith("_")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        if (part === "\n") return <br key={i} />;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
