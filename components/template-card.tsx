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
    <div className="bg-white border border-zinc-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex gap-1.5">
          <span className="text-xs px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full">
            {language === "vi" ? "Tiếng Việt" : "English"}
          </span>
          {isPublic && (
            <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
              Miễn phí
            </span>
          )}
        </div>
      </div>
      <h3 className="font-medium text-zinc-900 mb-1">{name}</h3>
      <p className="text-xs text-zinc-500 mb-4">
        {category} · {placeholders.length} trường cần điền
      </p>
      <button
        onClick={() => onUse(id)}
        className="w-full text-sm bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Dùng template này
      </button>
    </div>
  );
}
