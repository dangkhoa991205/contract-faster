"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-5">
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Tiêu đề hợp đồng
        </label>
        <input
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {placeholders.map((field) => (
          <div key={field.name}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-zinc-700">
                {field.label}
              </label>
              <button
                type="button"
                onClick={() => fetchSuggestion(field)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                disabled={loadingSuggest === field.name}
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
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={values[field.name] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
              }
              placeholder={suggestions[field.name] ?? `Nhập ${field.label.toLowerCase()}...`}
            />
            {suggestions[field.name] && !values[field.name] && (
              <button
                type="button"
                onClick={() =>
                  setValues((prev) => ({
                    ...prev,
                    [field.name]: suggestions[field.name],
                  }))
                }
                className="mt-1 text-xs text-indigo-600 hover:underline"
              >
                Dùng gợi ý: "{suggestions[field.name]}"
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleExport}
        disabled={submitting}
        className={cn(
          "mt-8 w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors",
          submitting
            ? "bg-indigo-400 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700"
        )}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang xuất...
          </span>
        ) : (
          "Xuất hợp đồng (.docx)"
        )}
      </button>
    </div>
  );
}
