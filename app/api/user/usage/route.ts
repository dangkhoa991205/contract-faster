import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getQuotaLimits } from "@/lib/quota";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: { subscription: true },
  });

  const quota = getQuotaLimits(user.plan);
  const contractCount = await db.contract.count({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    plan: user.plan,
    contractsUsed: contractCount,
    contractsLimit: quota.contracts === Infinity ? null : quota.contracts,
    aiChatsPerDay: quota.aiChatsPerDay === Infinity ? null : quota.aiChatsPerDay,
    subscription: user.subscription,
  });
}
