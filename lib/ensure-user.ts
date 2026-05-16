import { db } from "@/lib/db";
import type { Session } from "next-auth";

export async function ensureUser(session: Session) {
  const { id, email, name, image } = session.user;
  if (!id || !email) return;

  await db.user.upsert({
    where: { id },
    update: { email, name: name ?? undefined, image: image ?? undefined },
    create: { id, email, name: name ?? undefined, image: image ?? undefined },
  });
}
