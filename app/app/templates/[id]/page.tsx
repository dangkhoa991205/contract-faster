import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { TemplateWorkspace } from "@/components/template-workspace";

type Props = { params: Promise<{ id: string }> };

export default async function TemplateWorkspacePage({ params }: Props) {
  await requireAuth();
  const { id } = await params;

  let template = null;
  try {
    template = await db.template.findFirst({ where: { id } });
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
    <TemplateWorkspace
      templateId={template.id}
      templateName={template.name}
      templateCategory={template.category}
      placeholders={placeholders}
    />
  );
}
