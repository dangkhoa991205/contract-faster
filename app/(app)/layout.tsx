import { AppSidebar } from "@/components/app-sidebar";
import { requireAuth } from "@/lib/auth-utils";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <AppSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
