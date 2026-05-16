import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

const useCredentials = authConfig.session?.strategy === "jwt";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Only use Prisma adapter when DATABASE_URL is set and not using JWT-only mode
  ...(process.env.DATABASE_URL && !useCredentials
    ? { adapter: PrismaAdapter(db) }
    : {}),
});
