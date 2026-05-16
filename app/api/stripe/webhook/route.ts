import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import Stripe from "stripe";
type Plan = "FREE" | "SOLO" | "TEAM" | "ENTERPRISE";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const PRICE_TO_PLAN: Record<string, Plan> = {
    [process.env.STRIPE_PRICE_SOLO ?? ""]: "SOLO",
    [process.env.STRIPE_PRICE_TEAM ?? ""]: "TEAM",
    [process.env.STRIPE_PRICE_ENTERPRISE ?? ""]: "ENTERPRISE",
  };
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
    const sub = event.data.object as Stripe.Subscription & { current_period_end: number };
    const priceId = sub.items.data[0].price.id;
    const plan = PRICE_TO_PLAN[priceId] ?? "FREE";

    const customer = await stripe.customers.retrieve(sub.customer as string);
    if (customer.deleted) return NextResponse.json({ ok: true });

    const user = await db.user.findFirst({
      where: { stripeCustomerId: sub.customer as string },
    });
    if (!user) return NextResponse.json({ ok: true });

    await db.user.update({ where: { id: user.id }, data: { plan } });
    await db.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stripeSubId: sub.id,
        plan,
        status: sub.status,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      },
      update: {
        stripeSubId: sub.id,
        plan,
        status: sub.status,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      },
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const user = await db.user.findFirst({
      where: { stripeCustomerId: sub.customer as string },
    });
    if (user) {
      await db.user.update({ where: { id: user.id }, data: { plan: "FREE" } });
    }
  }

  return NextResponse.json({ ok: true });
}
