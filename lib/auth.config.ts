import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-compatible config (no Prisma, no Node.js-only modules)
export const authConfig = {
  providers: [Google({})],
  pages: { signIn: "/auth/login" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAppRoute = nextUrl.pathname.startsWith("/app");
      const isAuthRoute = nextUrl.pathname.startsWith("/auth");

      if (isAppRoute && !isLoggedIn) {
        return Response.redirect(new URL("/auth/login", nextUrl));
      }
      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL("/app", nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
