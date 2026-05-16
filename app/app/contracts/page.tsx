import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import Link from "next/link";
import { FileDown } from "lucide-react";

type ContractRow = {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  outputUrl: string | null;
  template: { name: string; category: string };
};

export default async function ContractsPage() {
  const session = await requireAuth();

  let contracts: ContractRow[] = [];
  try {
    contracts = await db.contract.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { template: { select: { name: true, category: true } } },
    });
  } catch {
    // DB not connected
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "#f1f1f3" }}>
          Hợp đồng của tôi
        </h1>
        <Link
          href="/app/templates"
          className="text-sm px-4 py-2 rounded-lg transition-colors"
          style={{ background: "#6366f1", color: "white" }}
        >
          + Tạo hợp đồng mới
        </Link>
      </div>

      <div
        className="rounded-xl"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {contracts.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            Chưa có hợp đồng nào.{" "}
            <Link href="/app/templates" style={{ color: "#6366f1" }} className="hover:underline">
              Tạo hợp đồng đầu tiên
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left text-xs"
                style={{
                  color: "rgba(255,255,255,0.3)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <th className="px-6 py-3 font-medium">Tên hợp đồng</th>
                <th className="px-6 py-3 font-medium">Template</th>
                <th className="px-6 py-3 font-medium">Trạng thái</th>
                <th className="px-6 py-3 font-medium">Ngày tạo</th>
                <th className="px-6 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <td className="px-6 py-3 font-medium" style={{ color: "#f1f1f3" }}>
                    {c.title}
                  </td>
                  <td className="px-6 py-3" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {c.template.category}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={
                        c.status === "COMPLETED"
                          ? { background: "rgba(34,197,94,0.15)", color: "#4ade80" }
                          : { background: "rgba(234,179,8,0.15)", color: "#facc15" }
                      }
                    >
                      {c.status === "COMPLETED" ? "Hoàn thành" : "Nháp"}
                    </span>
                  </td>
                  <td className="px-6 py-3" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-6 py-3">
                    {c.outputUrl && (
                      <a
                        href={`/api/contracts/${c.id}/export`}
                        className="flex items-center gap-1 hover:underline"
                        style={{ color: "#6366f1" }}
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        Tải về
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
