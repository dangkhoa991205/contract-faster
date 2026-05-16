"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { TemplateCard } from "@/components/template-card";
import { Upload, X, FileText, Loader2 } from "lucide-react";

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
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
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

  function openModal() {
    setSelectedFile(null);
    setFormName("");
    setFormCategory("");
    setUploadError("");
    setShowModal(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!formName) {
      setFormName(file.name.replace(/\.docx$/i, "").replace(/_/g, " "));
    }
  }

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || !formName || !formCategory) return;

    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("name", formName);
    formData.append("category", formCategory);
    formData.append("language", "vi");

    const res = await fetch("/api/templates", { method: "POST", body: formData });
    if (res.ok) {
      const newTemplate = await res.json();
      setTemplates((prev) => [newTemplate, ...prev]);
      setShowModal(false);
    } else {
      const err = await res.json();
      setUploadError(err.error ?? "Upload thất bại. Vui lòng thử lại.");
    }
    setUploading(false);
  }

  function handleUseTemplate(id: string) {
    router.push(`/app/templates/${id}`);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}
            >
              Bước 1
            </span>
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: "#f1f1f3" }}>
            Chọn template hợp đồng
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            Upload file .docx của bạn — AI sẽ tự động nhận diện các trường cần điền
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg font-medium transition-colors"
          style={{ background: "#6366f1", color: "white" }}
        >
          <Upload className="w-4 h-4" />
          Upload Template
        </button>
      </div>

      {/* Steps indicator */}
      <div
        className="flex items-center gap-0 mb-8 rounded-xl p-5"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {[
          { step: 1, label: "Chọn template", active: true, done: false },
          { step: 2, label: "Điền thông tin", active: false, done: false },
          { step: 3, label: "Xuất hợp đồng", active: false, done: false },
        ].map((s, i) => (
          <div key={s.step} className="flex items-center flex-1">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                style={
                  s.active
                    ? { background: "#6366f1", color: "white" }
                    : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }
                }
              >
                {s.step}
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: s.active ? "#f1f1f3" : "rgba(255,255,255,0.3)" }}
              >
                {s.label}
              </span>
            </div>
            {i < 2 && (
              <div
                className="flex-1 h-px mx-4"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
        </div>
      ) : templates.length === 0 ? (
        <div
          className="rounded-xl px-8 py-16 text-center"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "2px dashed rgba(255,255,255,0.1)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(99,102,241,0.12)" }}
          >
            <FileText className="w-7 h-7" style={{ color: "#6366f1" }} />
          </div>
          <h3 className="font-semibold mb-2 text-lg" style={{ color: "#f1f1f3" }}>
            Chưa có template nào
          </h3>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>
            Upload file hợp đồng .docx của bạn. AI sẽ tự động phát hiện<br />
            các trường cần điền như tên, ngày tháng, số tiền,...
          </p>
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-lg font-medium"
            style={{ background: "#6366f1", color: "white" }}
          >
            <Upload className="w-4 h-4" />
            Upload template đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <TemplateCard key={t.id} {...t} onUse={handleUseTemplate} />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold" style={{ color: "#f1f1f3" }}>
                Upload Template
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File drop zone */}
              <div
                className="rounded-xl p-6 text-center cursor-pointer transition-colors"
                style={{
                  border: selectedFile
                    ? "2px solid rgba(99,102,241,0.5)"
                    : "2px dashed rgba(255,255,255,0.12)",
                  background: selectedFile
                    ? "rgba(99,102,241,0.06)"
                    : "rgba(255,255,255,0.02)",
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {selectedFile ? (
                  <div>
                    <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: "#6366f1" }} />
                    <p className="text-sm font-medium" style={{ color: "#f1f1f3" }}>
                      {selectedFile.name}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Click để đổi file
                    </p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                      Kéo thả hoặc click để chọn file
                    </p>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Chỉ hỗ trợ file .docx
                    </p>
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Tên template <span style={{ color: "#f87171" }}>*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: Hợp đồng dịch vụ freelance"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#f1f1f3",
                  }}
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Danh mục <span style={{ color: "#f87171" }}>*</span>
                </label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="VD: Dịch vụ, Thuê nhà, Lao động..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#f1f1f3",
                  }}
                  required
                />
              </div>

              {uploadError && (
                <p className="text-sm" style={{ color: "#f87171" }}>
                  {uploadError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile || !formName || !formCategory}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                  style={{ background: "#6366f1", color: "white" }}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    "Upload & Phân tích"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
