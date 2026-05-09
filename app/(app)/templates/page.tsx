"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { TemplateCard } from "@/components/template-card";
import { Upload } from "lucide-react";

type Placeholder = { name: string; label: string; type: string };
type Template = {
  id: string;
  name: string;
  category: string;
  language: string;
  placeholders: Placeholder[];
  isPublic: boolean;
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = prompt("Tên template:");
    const category = prompt("Danh mục (VD: Dịch vụ, Thuê nhà, Lao động):");
    if (!name || !category) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("category", category);
    formData.append("language", "vi");

    const res = await fetch("/api/templates", { method: "POST", body: formData });
    if (res.ok) {
      const newTemplate = await res.json();
      setTemplates((prev) => [newTemplate, ...prev]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleUseTemplate(id: string) {
    router.push(`/app/contracts/new?templateId=${id}`);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Templates</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Chọn template có sẵn hoặc upload template của bạn
          </p>
        </div>
        <label
          className={`flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          <Upload className="w-4 h-4" />
          {uploading ? "Đang xử lý..." : "Upload Template"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={handleUpload}
          />
        </label>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-400">Đang tải...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          Chưa có template nào. Upload template .docx của bạn để bắt đầu.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <TemplateCard key={t.id} {...t} onUse={handleUseTemplate} />
          ))}
        </div>
      )}
    </div>
  );
}
