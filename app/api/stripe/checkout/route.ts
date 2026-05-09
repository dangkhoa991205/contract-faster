import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_MAP: Record<string, string> = {
  SOLO: process.env.STRIPE_PRICE_SOLO!,
  TEAM: process.env.STRIPE_PRICE_TEAM!,
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE!,
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await req.json();
  const priceId = PRICE_MAP[plan];
  if (!priceId) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: user.name ?? undefined,
    });
    customerId = customer.id;
    await db.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/settings?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
