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

  if (!templateId) {
    redirect("/app/templates");
  }

  const template = await db.template.findFirst({
    where: { id: templateId },
  });

  if (!template) {
    redirect("/app/templates");
  }

  const placeholders = (template.placeholders as Array<{
    name: string;
    label: string;
    type: string;
  }>) ?? [];

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 bg-white">
          <h1 className="text-lg font-semibold text-zinc-900">
            Tạo hợp đồng mới
          </h1>
          <p className="text-sm text-zinc-500">
            Template: {template.name} · {placeholders.length} trường cần điền
          </p>
        </div>
        <ContractForm
          templateId={templateId}
          templateName={template.name}
          placeholders={placeholders}
        />
      </div>
      <AiChatSidebar
        templateName={template.name}
        placeholderCount={placeholders.length}
      />
    </div>
  );
}
