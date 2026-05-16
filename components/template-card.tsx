import { FileText } from "lucide-react";

type Placeholder = { name: string; label: string; type: string };

type TemplateCardProps = {
  id: string;
  name: string;
  category: string;
  language: string;
  placeholders: Placeholder[];
  isPublic: boolean;
  onUse: (id: string) => void;
};

export function TemplateCard({
  id,
  name,
  category,
  language,
  placeholders,
  isPublic,
  onUse,
}: TemplateCardProps) {
  return (
    <div
      className="rounded-xl p-5 transition-all"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(99,102,241,0.4)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.08)";
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(99,102,241,0.15)" }}
        >
          <FileText className="w-5 h-5" style={{ color: "#6366f1" }} />
        </div>
        <div className="flex gap-1.5">
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
          >
            {language === "vi" ? "Tiếng Việt" : "English"}
          </span>
          {isPublic && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}
            >
              Miễn phí
            </span>
          )}
        </div>
      </div>
      <h3 className="font-medium mb-1" style={{ color: "#f1f1f3" }}>
        {name}
      </h3>
      <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
        {category} · {placeholders.length} trường cần điền
      </p>
      <button
        onClick={() => onUse(id)}
        className="w-full text-sm py-2 rounded-lg transition-colors font-medium"
        style={{ background: "#6366f1", color: "white" }}
      >
        Mở workspace →
      </button>
    </div>
  );
}
