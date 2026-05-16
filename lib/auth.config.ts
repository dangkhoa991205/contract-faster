import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

// Edge-compatible config (no Prisma, no Node.js-only modules)
export const authConfig = {
  providers: [
    Google({}),
    // Test credentials — remove in production
    Credentials({
      name: "Test Account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        // Accept any email + password "test123" for local testing
        if (credentials.password !== "test123") return null;
        return {
          id: `test-${credentials.email}`,
          email: credentials.email as string,
          name: (credentials.email as string).split("@")[0],
          image: null,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
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
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token?.id) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
