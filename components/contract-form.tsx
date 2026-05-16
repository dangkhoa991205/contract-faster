"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2, Download } from "lucide-react";

type Placeholder = { name: string; label: string; type: string };

type ContractFormProps = {
  templateId: string;
  templateName: string;
  placeholders: Placeholder[];
};

export function ContractForm({
  templateId,
  templateName,
  placeholders,
}: ContractFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(`HĐ ${templateName} - ${new Date().toLocaleDateString("vi-VN")}`);
  const [values, setValues] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});
  const [loadingSuggest, setLoadingSuggest] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function fetchSuggestion(field: Placeholder) {
    setLoadingSuggest(field.name);
    const res = await fetch("/api/ai/smart-fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldName: field.name,
        fieldLabel: field.label,
        fieldType: field.type,
        templateName,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setSuggestions((prev) => ({ ...prev, [field.name]: data.suggestion }));
    }
    setLoadingSuggest(null);
  }

  async function handleExport() {
    setSubmitting(true);

    const createRes = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, templateId, fieldValues: values }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      alert(err.error ?? "Lỗi khi tạo hợp đồng");
      setSubmitting(false);
      return;
    }

    const contract = await createRes.json();

    const exportRes = await fetch(`/api/contracts/${contract.id}/export`, {
      method: "POST",
    });

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

    setSubmitting(false);
  }

  const filledCount = placeholders.filter((p) => values[p.name]?.trim()).length;
  const progress = placeholders.length > 0 ? (filledCount / placeholders.length) * 100 : 0;

  return (
    <div className="flex-1 overflow-auto p-6" style={{ background: "#080810" }}>
      <div className="max-w-xl mx-auto">
        {/* Progress */}
        {placeholders.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Tiến độ điền thông tin
              </span>
              <span className="text-xs font-medium" style={{ color: "#a5b4fc" }}>
                {filledCount}/{placeholders.length} trường
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: "#6366f1" }}
              />
            </div>
          </div>
        )}

        {/* Contract title */}
        <div className="mb-6">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
            TIÊU ĐỀ HỢP ĐỒNG
          </label>
          <input
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#f1f1f3",
            }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
          />
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {placeholders.map((field) => (
            <div
              key={field.name}
              className="rounded-xl p-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
                  {field.label}
                </label>
                <button
                  type="button"
                  onClick={() => fetchSuggestion(field)}
                  disabled={loadingSuggest === field.name}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    background: "rgba(99,102,241,0.12)",
                    color: "#a5b4fc",
                    border: "1px solid rgba(99,102,241,0.2)",
                  }}
                >
                  {loadingSuggest === field.name ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3" />
                  )}
                  AI gợi ý
                </button>
              </div>
              <input
                type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: values[field.name]
                    ? "1px solid rgba(99,102,241,0.4)"
                    : "1px solid rgba(255,255,255,0.08)",
                  color: "#f1f1f3",
                }}
                value={values[field.name] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                }
                placeholder={
                  suggestions[field.name]
                    ? `Gợi ý: ${suggestions[field.name]}`
                    : `Nhập ${field.label.toLowerCase()}...`
                }
              />
              {suggestions[field.name] && !values[field.name] && (
                <button
                  type="button"
                  onClick={() =>
                    setValues((prev) => ({ ...prev, [field.name]: suggestions[field.name] }))
                  }
                  className="mt-2 text-xs hover:underline"
                  style={{ color: "#a5b4fc" }}
                >
                  Dùng gợi ý: &ldquo;{suggestions[field.name]}&rdquo;
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={submitting}
          className="mt-6 w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{ background: "#6366f1", color: "white" }}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang xuất hợp đồng...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Xuất hợp đồng (.docx)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
