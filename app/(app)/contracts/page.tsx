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

  const contracts = await db.contract.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { template: { select: { name: true, category: true } } },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Hợp đồng của tôi</h1>
        <Link
          href="/app/templates"
          className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Tạo hợp đồng mới
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200">
        {contracts.length === 0 ? (
          <div className="px-6 py-16 text-center text-zinc-400 text-sm">
            Chưa có hợp đồng nào.{" "}
            <Link href="/app/templates" className="text-indigo-600 hover:underline">
              Tạo hợp đồng đầu tiên
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500 text-xs border-b border-zinc-100">
                <th className="px-6 py-3 font-medium">Tên hợp đồng</th>
                <th className="px-6 py-3 font-medium">Template</th>
                <th className="px-6 py-3 font-medium">Trạng thái</th>
                <th className="px-6 py-3 font-medium">Ngày tạo</th>
                <th className="px-6 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {(contracts as ContractRow[]).map((c) => (
                <tr key={c.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50">
                  <td className="px-6 py-3 font-medium text-zinc-900">{c.title}</td>
                  <td className="px-6 py-3 text-zinc-500">{c.template.category}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.status === "COMPLETED"
                        ? "bg-green-50 text-green-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}>
                      {c.status === "COMPLETED" ? "Hoàn thành" : "Nháp"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-zinc-500">
                    {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-6 py-3">
                    {c.outputUrl && (
                      <a
                        href={`/api/contracts/${c.id}/export`}
                        className="flex items-center gap-1 text-indigo-600 hover:underline"
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
