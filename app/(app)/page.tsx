import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getQuotaLimits } from "@/lib/quota";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  const [user, contractCount, recentContracts] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.contract.count({ where: { userId } }),
    db.contract.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { template: { select: { name: true, category: true } } },
    }),
  ]);

  const quota = getQuotaLimits(user.plan);
  const remaining =
    quota.contracts === Infinity ? "∞" : quota.contracts - contractCount;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Chào, {user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Gói hiện tại: <span className="font-medium">{user.plan}</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Hợp đồng tháng này" value={contractCount} />
        <StatCard label="Còn lại trong tháng" value={remaining} />
        <StatCard label="Gói hiện tại" value={user.plan} />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="font-medium text-zinc-900">Hợp đồng gần đây</h2>
          <Link
            href="/app/contracts/new"
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Tạo mới
          </Link>
        </div>
        {recentContracts.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-400 text-sm">
            Chưa có hợp đồng nào.{" "}
            <Link href="/app/contracts/new" className="text-indigo-600 hover:underline">
              Tạo hợp đồng đầu tiên
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500 text-xs border-b border-zinc-100">
                <th className="px-6 py-3 font-medium">Tên hợp đồng</th>
                <th className="px-6 py-3 font-medium">Template</th>
                <th className="px-6 py-3 font-medium">Ngày tạo</th>
                <th className="px-6 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {recentContracts.map((c) => (
                <tr key={c.id} className="border-b border-zinc-50 last:border-0">
                  <td className="px-6 py-3 font-medium text-zinc-900">{c.title}</td>
                  <td className="px-6 py-3 text-zinc-500">{c.template.category}</td>
                  <td className="px-6 py-3 text-zinc-500">
                    {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/app/contracts/${c.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      Xem
                    </Link>
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

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 px-6 py-5">
      <div className="text-2xl font-bold text-indigo-600">{value}</div>
      <div className="text-sm text-zinc-500 mt-1">{label}</div>
    </div>
  );
}
