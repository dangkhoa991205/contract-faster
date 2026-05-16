import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { ContractForm } from "@/components/contract-form";
import { AiChatSidebar } from "@/components/ai-chat-sidebar";
import { redirect } from "next/navigation";

type SearchParams = Promise<{ templateId?: string }>;

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAuth();
  const { templateId } = await searchParams;

  if (!templateId) redirect("/app/templates");

  let template = null;
  try {
    template = await db.template.findFirst({ where: { id: templateId } });
  } catch {
    // DB not connected
  }

  if (!template) redirect("/app/templates");

  const placeholders = (template.placeholders as Array<{
    name: string;
    label: string;
    type: string;
  }>) ?? [];

  return (
    <div className="flex flex-col h-full" style={{ background: "#080810" }}>
      {/* Step header */}
      <div
        className="flex-shrink-0 px-6 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-6">
          {[
            { step: 1, label: "Chọn template", done: true },
            { step: 2, label: "Điền thông tin", active: true },
            { step: 3, label: "Xuất hợp đồng", done: false },
          ].map((s, i) => (
            <div key={s.step} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                style={
                  s.done
                    ? { background: "rgba(99,102,241,0.3)", color: "#a5b4fc" }
                    : (s as { active?: boolean }).active
                    ? { background: "#6366f1", color: "white" }
                    : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }
                }
              >
                {s.done ? "✓" : s.step}
              </div>
              <span
                className="text-sm font-medium"
                style={{
                  color: s.done
                    ? "#a5b4fc"
                    : (s as { active?: boolean }).active
                    ? "#f1f1f3"
                    : "rgba(255,255,255,0.25)",
                }}
              >
                {s.label}
              </span>
              {i < 2 && (
                <div className="w-8 h-px ml-1" style={{ background: "rgba(255,255,255,0.08)" }} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            Template: <span style={{ color: "#a5b4fc" }}>{template.name}</span>
            {" · "}
            {placeholders.length} trường cần điền
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <ContractForm
          templateId={templateId}
          templateName={template.name}
          placeholders={placeholders}
        />
        <AiChatSidebar
          templateName={template.name}
          placeholderCount={placeholders.length}
        />
      </div>
    </div>
  );
}
