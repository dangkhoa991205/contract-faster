import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { getQuotaLimits } from "@/lib/quota";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contracts = await db.contract.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { template: { select: { name: true, category: true } } },
  });

  return NextResponse.json(contracts);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureUser(session);

  const body = await req.json();
  const { title, templateId, fieldValues } = body;

  if (!title || !templateId || !fieldValues) {
    return NextResponse.json(
      { error: "Missing required fields: title, templateId, fieldValues" },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  const quota = getQuotaLimits(user?.plan ?? "FREE");
  if (quota.contracts !== Infinity) {
    const count = await db.contract.count({ where: { userId: session.user.id } });
    if (count >= quota.contracts) {
      return NextResponse.json(
        { error: "Quota exceeded. Please upgrade your plan." },
        { status: 403 }
      );
    }
  }

  const contract = await db.contract.create({
    data: {
      title,
      templateId,
      userId: session.user.id,
      fieldValues,
      status: "DRAFT",
    },
  });

  return NextResponse.json(contract, { status: 201 });
}
