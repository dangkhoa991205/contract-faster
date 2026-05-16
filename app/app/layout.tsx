import { AppSidebar } from "@/components/app-sidebar";
import { requireAuth } from "@/lib/auth-utils";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f8fafc" }}>
      <main className="flex-1 overflow-auto flex flex-col">{children}</main>
    </div>
  );
}
