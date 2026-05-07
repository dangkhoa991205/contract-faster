# Auto-Contract SaaS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multilingual SaaS platform where freelancers and SMBs generate professional contracts from templates using AI assistance, then export as DOCX.

**Architecture:** Template-First with AI Assistance. Users upload/select a `.docx` template → AI detects placeholders → User fills a dynamic form with AI suggestions → AI chat sidebar for clause questions → Export completed DOCX. NextAuth v5 for Google OAuth, Prisma + PostgreSQL for data, Stripe for billing, OpenAI GPT-4o for AI features.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma 7, PostgreSQL, NextAuth v5 beta, Stripe v22, OpenAI SDK, docxtemplater + pizzip + mammoth, shadcn/ui (BaseUI), Tailwind CSS 4, Jest, Playwright.

**Next.js 16 gotchas:**
- `cookies()`, `headers()` must be `await`-ed
- Route handlers are NOT cached by default
- Auth checks must be inside every Route Handler and Server Action — not just UI
- Use `'use server'` for Server Actions, `'use client'` for interactive components

---

## File Structure

```
prisma/
  schema.prisma              # DB models

lib/
  db.ts                      # Prisma client singleton
  auth.ts                    # NextAuth config
  auth-utils.ts              # getSession(), requireAuth() helpers
  utils.ts                   # cn() classname helper
  openai.ts                  # OpenAI client singleton
  quota.ts                   # Plan quota checks

app/
  globals.css                # Tailwind base styles
  layout.tsx                 # Root layout (fonts, providers)
  page.tsx                   # Landing page
  pricing/
    page.tsx                 # Pricing page
  auth/
    login/
      page.tsx               # Login page
  api/
    auth/
      [...nextauth]/
        route.ts             # NextAuth handler
    templates/
      route.ts               # GET (list) + POST (upload)
    contracts/
      route.ts               # GET (list) + POST (create)
      [id]/
        export/
          route.ts           # POST export DOCX
    ai/
      detect-placeholders/
        route.ts
      smart-fill/
        route.ts
      chat/
        route.ts
    stripe/
      checkout/
        route.ts
      webhook/
        route.ts
    user/
      usage/
        route.ts
  (app)/
    layout.tsx               # App shell (sidebar + nav)
    page.tsx                 # Dashboard
    templates/
      page.tsx               # Template library
    contracts/
      page.tsx               # Contract list
      new/
        page.tsx             # Contract editor
    settings/
      page.tsx               # Settings + billing

components/
  ui/                        # shadcn primitives (button, input, etc.)
  app-sidebar.tsx            # Sidebar navigation
  contract-form.tsx          # Dynamic form for filling placeholders
  ai-chat-sidebar.tsx        # AI chat panel
  template-card.tsx          # Template display card

__tests__/
  lib/
    quota.test.ts
    auth-utils.test.ts
  api/
    templates.test.ts
    contracts.test.ts
    ai.test.ts
  components/
    contract-form.test.tsx

uploads/
  templates/                 # Uploaded .docx template files
  contracts/                 # Generated .docx output files
```

---

## Task 1: Prisma Schema + DB Setup

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db.ts`

- [ ] **Step 1: Create Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id               String        @id @default(cuid())
  email            String        @unique
  name             String?
  image            String?
  plan             Plan          @default(FREE)
  stripeCustomerId String?
  contracts        Contract[]
  templates        Template[]
  subscription     Subscription?
  teamMemberships  TeamMember[]
  createdAt        DateTime      @default(now())
  accounts         Account[]
  sessions         Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Template {
  id           String     @id @default(cuid())
  name         String
  category     String
  language     String     @default("vi")
  fileUrl      String
  placeholders Json       @default("[]")
  isPublic     Boolean    @default(false)
  userId       String?
  user         User?      @relation(fields: [userId], references: [id], onDelete: SetNull)
  contracts    Contract[]
  createdAt    DateTime   @default(now())
}

model Contract {
  id          String         @id @default(cuid())
  title       String
  templateId  String
  template    Template       @relation(fields: [templateId], references: [id])
  userId      String
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  fieldValues Json           @default("{}")
  outputUrl   String?
  status      ContractStatus @default(DRAFT)
  aiChats     AiChat[]
  createdAt   DateTime       @default(now())
}

model Subscription {
  id               String   @id @default(cuid())
  userId           String   @unique
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  stripeSubId      String
  plan             Plan
  status           String
  currentPeriodEnd DateTime
}

model Team {
  id        String       @id @default(cuid())
  name      String
  ownerId   String
  members   TeamMember[]
  createdAt DateTime     @default(now())
}

model TeamMember {
  id     String @id @default(cuid())
  teamId String
  team   Team   @relation(fields: [teamId], references: [id], onDelete: Cascade)
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   String @default("member")

  @@unique([teamId, userId])
}

model AiChat {
  id         String   @id @default(cuid())
  contractId String
  contract   Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)
  messages   Json     @default("[]")
  createdAt  DateTime @default(now())
}

enum Plan {
  FREE
  SOLO
  TEAM
  ENTERPRISE
}

enum ContractStatus {
  DRAFT
  COMPLETED
}
```

- [ ] **Step 2: Create Prisma client singleton**

Create `lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration created and applied. Prisma client generated.

- [ ] **Step 4: Verify schema compiles**

```bash
npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma lib/db.ts
git commit -m "feat: add Prisma schema and db client"
```

---

## Task 2: Auth Setup (NextAuth v5 + Google OAuth)

**Files:**
- Create: `lib/auth.ts`
- Create: `lib/auth-utils.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/auth/login/page.tsx`
- Create: `middleware.ts`

- [ ] **Step 1: Write auth-utils test**

Create `__tests__/lib/auth-utils.test.ts`:

```typescript
import { getQuotaLimits } from "@/lib/quota";

describe("getQuotaLimits", () => {
  it("returns 3 contracts for FREE plan", () => {
    expect(getQuotaLimits("FREE").contracts).toBe(3);
  });

  it("returns 50 contracts for SOLO plan", () => {
    expect(getQuotaLimits("SOLO").contracts).toBe(50);
  });

  it("returns Infinity for TEAM plan", () => {
    expect(getQuotaLimits("TEAM").contracts).toBe(Infinity);
  });

  it("returns Infinity for ENTERPRISE plan", () => {
    expect(getQuotaLimits("ENTERPRISE").contracts).toBe(Infinity);
  });

  it("returns 20 AI chat messages per day for SOLO", () => {
    expect(getQuotaLimits("SOLO").aiChatsPerDay).toBe(20);
  });

  it("returns Infinity AI chat messages for TEAM", () => {
    expect(getQuotaLimits("TEAM").aiChatsPerDay).toBe(Infinity);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest __tests__/lib/auth-utils.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/quota'`

- [ ] **Step 3: Create quota helper**

Create `lib/quota.ts`:

```typescript
import { Plan } from "@prisma/client";

type QuotaLimits = {
  contracts: number;
  aiChatsPerDay: number;
};

export function getQuotaLimits(plan: Plan): QuotaLimits {
  switch (plan) {
    case "FREE":
      return { contracts: 3, aiChatsPerDay: 0 };
    case "SOLO":
      return { contracts: 50, aiChatsPerDay: 20 };
    case "TEAM":
      return { contracts: Infinity, aiChatsPerDay: Infinity };
    case "ENTERPRISE":
      return { contracts: Infinity, aiChatsPerDay: Infinity };
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest __tests__/lib/auth-utils.test.ts
```

Expected: PASS — 6 tests passed

- [ ] **Step 5: Create NextAuth config**

Create `lib/auth.ts`:

```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
});
```

- [ ] **Step 6: Create NextAuth route handler**

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 7: Create auth-utils helper**

Create `lib/auth-utils.ts`:

```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }
  return session;
}

export async function getSession() {
  return auth();
}
```

- [ ] **Step 8: Create login page**

Create `app/auth/login/page.tsx`:

```typescript
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">
          Đăng nhập
        </h1>
        <p className="text-zinc-500 text-sm mb-6">
          Tiếp tục với tài khoản Google của bạn
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/app" });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Đăng nhập với Google
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Create middleware for route protection**

Create `middleware.ts` at project root:

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAppRoute = req.nextUrl.pathname.startsWith("/app");
  const isApiRoute = req.nextUrl.pathname.startsWith("/api");
  const isAuthRoute = req.nextUrl.pathname.startsWith("/auth");

  if (isAppRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", req.nextUrl));
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/app", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
```

- [ ] **Step 10: Extend NextAuth types**

Create `types/next-auth.d.ts`:

```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
```

- [ ] **Step 11: Commit**

```bash
git add lib/auth.ts lib/auth-utils.ts lib/quota.ts app/api/auth middleware.ts app/auth types __tests__/lib/auth-utils.test.ts
git commit -m "feat: add NextAuth v5 Google OAuth + middleware + quota helper"
```

---

## Task 3: App Shell (Layout + Sidebar + Dashboard)

**Files:**
- Create: `lib/utils.ts`
- Modify: `app/layout.tsx`
- Create: `app/(app)/layout.tsx`
- Create: `components/app-sidebar.tsx`
- Create: `app/(app)/page.tsx`

- [ ] **Step 1: Create cn() utility**

Create `lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Update root layout metadata**

Edit `app/layout.tsx` — replace the title and description:

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ContractAI — Tạo hợp đồng thông minh",
  description:
    "Tạo hợp đồng chuyên nghiệp trong vài phút với sự hỗ trợ của AI",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Create sidebar component**

Create `components/app-sidebar.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/templates", label: "Templates", icon: FileText },
  { href: "/app/contracts", label: "Hợp đồng", icon: ScrollText },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 border-r border-zinc-200 bg-white flex flex-col min-h-screen">
      <div className="px-4 py-5 border-b border-zinc-100">
        <span className="font-semibold text-zinc-900 text-base">
          ContractAI
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-indigo-50 text-indigo-700"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 4: Create app layout**

Create `app/(app)/layout.tsx`:

```typescript
import { AppSidebar } from "@/components/app-sidebar";
import { requireAuth } from "@/lib/auth-utils";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <AppSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Create dashboard page**

Create `app/(app)/page.tsx`:

```typescript
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
```

- [ ] **Step 6: Commit**

```bash
git add lib/utils.ts app/layout.tsx app/\(app\) components/app-sidebar.tsx
git commit -m "feat: add app shell with sidebar and dashboard"
```

---

## Task 4: Template API + Upload

**Files:**
- Create: `app/api/templates/route.ts`
- Create: `app/api/ai/detect-placeholders/route.ts`
- Create: `lib/openai.ts`
- Create: `__tests__/api/templates.test.ts`

- [ ] **Step 1: Create OpenAI client singleton**

Create `lib/openai.ts`:

```typescript
import OpenAI from "openai";

const globalForOpenAI = globalThis as unknown as { openai: OpenAI };

export const openai =
  globalForOpenAI.openai ||
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = openai;
```

- [ ] **Step 2: Write template API test**

Create `__tests__/api/templates.test.ts`:

```typescript
import { GET } from "@/app/api/templates/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

jest.mock("@/lib/auth");
jest.mock("@/lib/db", () => ({
  db: {
    template: {
      findMany: jest.fn(),
    },
  },
}));

const mockAuth = auth as jest.Mock;
const mockFindMany = db.template.findMany as jest.Mock;

describe("GET /api/templates", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://localhost/api/templates"));
    expect(res.status).toBe(401);
  });

  it("returns templates list when authenticated", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user-1" } });
    mockFindMany.mockResolvedValueOnce([
      { id: "t1", name: "Template 1", category: "Dịch vụ", isPublic: true },
    ]);
    const res = await GET(new Request("http://localhost/api/templates"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Template 1");
  });
});
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
npx jest __tests__/api/templates.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/templates/route'`

- [ ] **Step 4: Create templates route handler**

Create `app/api/templates/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await db.template.findMany({
    where: {
      OR: [{ isPublic: true }, { userId: session.user.id }],
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const language = (formData.get("language") as string) ?? "vi";

  if (!file || !name || !category) {
    return NextResponse.json(
      { error: "Missing required fields: file, name, category" },
      { status: 400 }
    );
  }

  if (!file.name.endsWith(".docx")) {
    return NextResponse.json(
      { error: "Only .docx files are supported" },
      { status: 400 }
    );
  }

  // Save file to local uploads
  const { writeFile, mkdir } = await import("fs/promises");
  const { join } = await import("path");
  const uploadDir = join(process.cwd(), "uploads", "templates");
  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const filepath = join(uploadDir, filename);
  await writeFile(filepath, Buffer.from(bytes));

  const fileUrl = `/uploads/templates/${filename}`;

  // Detect placeholders via OpenAI
  let placeholders: Array<{ name: string; label: string; type: string }> = [];
  try {
    const detectRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/ai/detect-placeholders`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl }),
      }
    );
    if (detectRes.ok) {
      const data = await detectRes.json();
      placeholders = data.placeholders ?? [];
    }
  } catch {
    // Non-fatal: template saved without placeholders, user can retry
  }

  const template = await db.template.create({
    data: {
      name,
      category,
      language,
      fileUrl,
      placeholders,
      isPublic: false,
      userId: session.user.id,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npx jest __tests__/api/templates.test.ts
```

Expected: PASS — 2 tests passed

- [ ] **Step 6: Create placeholder detection route**

Create `app/api/ai/detect-placeholders/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@/lib/openai";
import mammoth from "mammoth";
import { readFile } from "fs/promises";
import { join } from "path";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileUrl } = await req.json();
  if (!fileUrl) {
    return NextResponse.json({ error: "fileUrl is required" }, { status: 400 });
  }

  // Read file from local storage
  const filePath = join(process.cwd(), fileUrl.replace(/^\//, ""));
  const buffer = await readFile(filePath);

  // Extract text using mammoth
  const { value: text } = await mammoth.extractRawText({ buffer });

  // Ask GPT-4o to detect placeholders
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a contract analysis assistant. Extract all placeholder fields from this contract template. 
Placeholders can be: {{FIELD_NAME}}, [Field Name], underscores like ____________, or any obvious fill-in-the-blank spots.
Return ONLY a JSON array in this exact format:
[{"name": "FIELD_NAME_SNAKE_CASE", "label": "Human readable label in Vietnamese", "type": "text|date|number|email"}]
No explanation, just the JSON array.`,
      },
      {
        role: "user",
        content: text.slice(0, 8000), // Limit to 8k chars
      },
    ],
    temperature: 0,
  });

  let placeholders: Array<{ name: string; label: string; type: string }> = [];
  try {
    const content = completion.choices[0].message.content ?? "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      placeholders = JSON.parse(jsonMatch[0]);
    }
  } catch {
    placeholders = [];
  }

  return NextResponse.json({ placeholders });
}
```

- [ ] **Step 7: Create uploads directory and add to .gitignore**

```bash
mkdir -p uploads/templates uploads/contracts
echo "uploads/" >> .gitignore
```

- [ ] **Step 8: Commit**

```bash
git add app/api/templates lib/openai.ts app/api/ai/detect-placeholders __tests__/api/templates.test.ts .gitignore
git commit -m "feat: add template upload API with AI placeholder detection"
```

---

## Task 5: Template Library UI

**Files:**
- Create: `components/template-card.tsx`
- Create: `app/(app)/templates/page.tsx`

- [ ] **Step 1: Create template card component**

Create `components/template-card.tsx`:

```typescript
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Placeholder = { name: string; label: string; type: string };

type TemplateCardProps = {
  id: string;
  name: string;
  category: string;
  language: string;
  placeholders: Placeholder[];
  isPublic: boolean;
  onUse: (id: string) => void;
};

export function TemplateCard({
  id,
  name,
  category,
  language,
  placeholders,
  isPublic,
  onUse,
}: TemplateCardProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex gap-1.5">
          <span className="text-xs px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full">
            {language === "vi" ? "Tiếng Việt" : "English"}
          </span>
          {isPublic && (
            <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
              Miễn phí
            </span>
          )}
        </div>
      </div>
      <h3 className="font-medium text-zinc-900 mb-1">{name}</h3>
      <p className="text-xs text-zinc-500 mb-4">
        {category} · {placeholders.length} trường cần điền
      </p>
      <button
        onClick={() => onUse(id)}
        className="w-full text-sm bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Dùng template này
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create templates page**

Create `app/(app)/templates/page.tsx`:

```typescript
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { TemplateCard } from "@/components/template-card";
import { Upload } from "lucide-react";

type Placeholder = { name: string; label: string; type: string };
type Template = {
  id: string;
  name: string;
  category: string;
  language: string;
  placeholders: Placeholder[];
  isPublic: boolean;
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = prompt("Tên template:");
    const category = prompt("Danh mục (VD: Dịch vụ, Thuê nhà, Lao động):");
    if (!name || !category) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("category", category);
    formData.append("language", "vi");

    const res = await fetch("/api/templates", { method: "POST", body: formData });
    if (res.ok) {
      const newTemplate = await res.json();
      setTemplates((prev) => [newTemplate, ...prev]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleUseTemplate(id: string) {
    router.push(`/app/contracts/new?templateId=${id}`);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Templates</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Chọn template có sẵn hoặc upload template của bạn
          </p>
        </div>
        <label
          className={`flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          <Upload className="w-4 h-4" />
          {uploading ? "Đang xử lý..." : "Upload Template"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={handleUpload}
          />
        </label>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-400">Đang tải...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          Chưa có template nào. Upload template .docx của bạn để bắt đầu.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <TemplateCard key={t.id} {...t} onUse={handleUseTemplate} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/template-card.tsx app/\(app\)/templates
git commit -m "feat: add template library page with upload"
```

---

## Task 6: Contract API + DOCX Export

**Files:**
- Create: `app/api/contracts/route.ts`
- Create: `app/api/contracts/[id]/export/route.ts`
- Create: `__tests__/api/contracts.test.ts`

- [ ] **Step 1: Write contract API tests**

Create `__tests__/api/contracts.test.ts`:

```typescript
import { GET, POST } from "@/app/api/contracts/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

jest.mock("@/lib/auth");
jest.mock("@/lib/db", () => ({
  db: {
    contract: { findMany: jest.fn(), create: jest.fn(), count: jest.fn() },
    user: { findUniqueOrThrow: jest.fn() },
    template: { findUniqueOrThrow: jest.fn() },
  },
}));

const mockAuth = auth as jest.Mock;

describe("GET /api/contracts", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://localhost/api/contracts"));
    expect(res.status).toBe(401);
  });

  it("returns contracts list", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1" } });
    (db.contract.findMany as jest.Mock).mockResolvedValueOnce([
      { id: "c1", title: "HĐ Test" },
    ]);
    const res = await GET(new Request("http://localhost/api/contracts"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data[0].title).toBe("HĐ Test");
  });
});

describe("POST /api/contracts", () => {
  it("returns 400 when missing fields", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1" } });
    const res = await POST(
      new Request("http://localhost/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest __tests__/api/contracts.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/contracts/route'`

- [ ] **Step 3: Create contracts route handler**

Create `app/api/contracts/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
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

  const body = await req.json();
  const { title, templateId, fieldValues } = body;

  if (!title || !templateId || !fieldValues) {
    return NextResponse.json(
      { error: "Missing required fields: title, templateId, fieldValues" },
      { status: 400 }
    );
  }

  // Check quota
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });
  const quota = getQuotaLimits(user.plan);
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
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest __tests__/api/contracts.test.ts
```

Expected: PASS — 3 tests passed

- [ ] **Step 5: Create export route handler**

Create `app/api/contracts/[id]/export/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const contract = await db.contract.findFirst({
    where: { id, userId: session.user.id },
    include: { template: true },
  });

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  const templatePath = join(
    process.cwd(),
    contract.template.fileUrl.replace(/^\//, "")
  );
  const templateBuffer = await readFile(templatePath);

  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(contract.fieldValues as Record<string, string>);

  const outputBuffer = doc
    .getZip()
    .generate({ type: "nodebuffer", compression: "DEFLATE" });

  const outputDir = join(process.cwd(), "uploads", "contracts");
  await mkdir(outputDir, { recursive: true });

  const filename = `contract-${id}-${Date.now()}.docx`;
  const outputPath = join(outputDir, filename);
  await writeFile(outputPath, outputBuffer);

  const outputUrl = `/uploads/contracts/${filename}`;

  await db.contract.update({
    where: { id },
    data: { outputUrl, status: "COMPLETED" },
  });

  return new NextResponse(outputBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${contract.title.replace(/[^a-zA-Z0-9]/g, "_")}.docx"`,
    },
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/contracts __tests__/api/contracts.test.ts
git commit -m "feat: add contracts API with quota check and DOCX export"
```

---

## Task 7: Contract Editor UI

**Files:**
- Create: `components/contract-form.tsx`
- Create: `components/ai-chat-sidebar.tsx`
- Create: `app/(app)/contracts/new/page.tsx`
- Create: `app/(app)/contracts/page.tsx`

- [ ] **Step 1: Create contract form component**

Create `components/contract-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Placeholder = { name: string; label: string; type: string };

type ContractFormProps = {
  templateId: string;
  templateName: string;
  placeholders: Placeholder[];
};

export function ContractForm({
  templateId,
  templateName,
  placeholders,
}: ContractFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(`HĐ ${templateName} - ${new Date().toLocaleDateString("vi-VN")}`);
  const [values, setValues] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});
  const [loadingSuggest, setLoadingSuggest] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function fetchSuggestion(field: Placeholder) {
    setLoadingSuggest(field.name);
    const res = await fetch("/api/ai/smart-fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldName: field.name,
        fieldLabel: field.label,
        fieldType: field.type,
        templateName,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setSuggestions((prev) => ({ ...prev, [field.name]: data.suggestion }));
    }
    setLoadingSuggest(null);
  }

  async function handleExport() {
    setSubmitting(true);

    // Create contract
    const createRes = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, templateId, fieldValues: values }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      alert(err.error ?? "Lỗi khi tạo hợp đồng");
      setSubmitting(false);
      return;
    }

    const contract = await createRes.json();

    // Export DOCX
    const exportRes = await fetch(`/api/contracts/${contract.id}/export`, {
      method: "POST",
    });

    if (exportRes.ok) {
      const blob = await exportRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      router.push("/app/contracts");
    } else {
      alert("Lỗi khi xuất file");
    }

    setSubmitting(false);
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-5">
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Tiêu đề hợp đồng
        </label>
        <input
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {placeholders.map((field) => (
          <div key={field.name}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-zinc-700">
                {field.label}
              </label>
              <button
                type="button"
                onClick={() => fetchSuggestion(field)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                disabled={loadingSuggest === field.name}
              >
                {loadingSuggest === field.name ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Wand2 className="w-3 h-3" />
                )}
                AI gợi ý
              </button>
            </div>
            <input
              type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={values[field.name] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
              }
              placeholder={suggestions[field.name] ?? `Nhập ${field.label.toLowerCase()}...`}
            />
            {suggestions[field.name] && !values[field.name] && (
              <button
                type="button"
                onClick={() =>
                  setValues((prev) => ({
                    ...prev,
                    [field.name]: suggestions[field.name],
                  }))
                }
                className="mt-1 text-xs text-indigo-600 hover:underline"
              >
                💡 Dùng gợi ý: "{suggestions[field.name]}"
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleExport}
        disabled={submitting}
        className={cn(
          "mt-8 w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors",
          submitting
            ? "bg-indigo-400 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700"
        )}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang xuất...
          </span>
        ) : (
          "Xuất hợp đồng (.docx)"
        )}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create AI chat sidebar**

Create `components/ai-chat-sidebar.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

type AiChatSidebarProps = {
  contractId?: string;
  templateName: string;
  placeholderCount: number;
};

export function AiChatSidebar({
  contractId,
  templateName,
  placeholderCount,
}: AiChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Tôi đã nhận diện **${placeholderCount} trường** cần điền trong template "${templateName}". Hãy điền vào form bên trái. Bạn có thể hỏi tôi về bất kỳ điều khoản nào trong hợp đồng!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractId,
        message: input,
        templateName,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại." },
      ]);
    }
    setLoading(false);
  }

  return (
    <div className="w-80 flex-shrink-0 border-l border-zinc-200 bg-zinc-50 flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-200 bg-white">
        <div className="font-medium text-sm text-zinc-900">🤖 AI Assistant</div>
        <div className="text-xs text-zinc-500">Hỏi về điều khoản hợp đồng</div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              msg.role === "user"
                ? "bg-indigo-600 text-white ml-4"
                : "bg-white border border-zinc-200 text-zinc-700"
            )}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
          </div>
        )}
      </div>

      <div className="p-3 border-t border-zinc-200 bg-white">
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Hỏi về hợp đồng..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-zinc-400 mt-2">
          * AI không thay thế tư vấn pháp lý chính thức
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create contract editor page**

Create `app/(app)/contracts/new/page.tsx`:

```typescript
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { ContractForm } from "@/components/contract-form";
import { AiChatSidebar } from "@/components/ai-chat-sidebar";
import { redirect } from "next/navigation";

type SearchParams = Promise<{ templateId?: string }>;

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAuth();
  const { templateId } = await searchParams;

  if (!templateId) {
    redirect("/app/templates");
  }

  const template = await db.template.findFirst({
    where: { id: templateId },
  });

  if (!template) {
    redirect("/app/templates");
  }

  const placeholders = (template.placeholders as Array<{
    name: string;
    label: string;
    type: string;
  }>) ?? [];

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 bg-white">
          <h1 className="text-lg font-semibold text-zinc-900">
            Tạo hợp đồng mới
          </h1>
          <p className="text-sm text-zinc-500">
            Template: {template.name} · {placeholders.length} trường cần điền
          </p>
        </div>
        <ContractForm
          templateId={templateId}
          templateName={template.name}
          placeholders={placeholders}
        />
      </div>
      <AiChatSidebar
        templateName={template.name}
        placeholderCount={placeholders.length}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create contracts list page**

Create `app/(app)/contracts/page.tsx`:

```typescript
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import Link from "next/link";
import { FileDown } from "lucide-react";

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
              {contracts.map((c) => (
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
```

- [ ] **Step 5: Commit**

```bash
git add components/contract-form.tsx components/ai-chat-sidebar.tsx app/\(app\)/contracts
git commit -m "feat: add contract editor and contracts list UI"
```

---

## Task 8: AI Routes (Smart Fill + Chat)

**Files:**
- Create: `app/api/ai/smart-fill/route.ts`
- Create: `app/api/ai/chat/route.ts`
- Create: `__tests__/api/ai.test.ts`

- [ ] **Step 1: Write AI API tests**

Create `__tests__/api/ai.test.ts`:

```typescript
import { POST as smartFillPOST } from "@/app/api/ai/smart-fill/route";
import { POST as chatPOST } from "@/app/api/ai/chat/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

jest.mock("@/lib/auth");
jest.mock("@/lib/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "50 triệu VND" } }],
        }),
      },
    },
  },
}));
jest.mock("@/lib/db", () => ({
  db: {
    user: { findUniqueOrThrow: jest.fn() },
    aiChat: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    contract: { findFirst: jest.fn() },
  },
}));

const mockAuth = auth as jest.Mock;

describe("POST /api/ai/smart-fill", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await smartFillPOST(
      new Request("http://localhost/api/ai/smart-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldName: "GIA_TRI", fieldLabel: "Giá trị", fieldType: "number", templateName: "HĐ dịch vụ" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns suggestion when authenticated", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1" } });
    (db.user.findUniqueOrThrow as jest.Mock).mockResolvedValueOnce({ plan: "SOLO" });
    const res = await smartFillPOST(
      new Request("http://localhost/api/ai/smart-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldName: "GIA_TRI", fieldLabel: "Giá trị", fieldType: "number", templateName: "HĐ dịch vụ" }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.suggestion).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest __tests__/api/ai.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/ai/smart-fill/route'`

- [ ] **Step 3: Create smart-fill route**

Create `app/api/ai/smart-fill/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fieldName, fieldLabel, fieldType, templateName } = await req.json();
  if (!fieldName || !fieldLabel || !templateName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  if (user.plan === "FREE") {
    return NextResponse.json(
      { error: "AI features require a paid plan" },
      { status: 403 }
    );
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Bạn là trợ lý hợp đồng thông minh. Hãy gợi ý một giá trị hợp lý cho trường "${fieldLabel}" (kiểu: ${fieldType}) trong hợp đồng "${templateName}". 
Chỉ trả về giá trị gợi ý, không giải thích. Tối đa 50 từ.`,
      },
      {
        role: "user",
        content: `Gợi ý giá trị cho trường: ${fieldLabel}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 100,
  });

  const suggestion = completion.choices[0].message.content?.trim() ?? "";

  return NextResponse.json({ suggestion });
}
```

- [ ] **Step 4: Create chat route**

Create `app/api/ai/chat/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { db } from "@/lib/db";
import { getQuotaLimits } from "@/lib/quota";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contractId, message, templateName } = await req.json();
  if (!message || !templateName) {
    return NextResponse.json({ error: "Missing message or templateName" }, { status: 400 });
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  const quota = getQuotaLimits(user.plan);
  if (quota.aiChatsPerDay === 0) {
    return NextResponse.json(
      { error: "AI chat requires a paid plan" },
      { status: 403 }
    );
  }

  // Get or create AI chat session
  let chatSession = contractId
    ? await db.aiChat.findFirst({ where: { contractId } })
    : null;

  const messages = (chatSession?.messages as Array<{ role: string; content: string }>) ?? [];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Bạn là trợ lý pháp lý thông minh, hỗ trợ soạn thảo và giải thích hợp đồng "${templateName}". 
Trả lời bằng tiếng Việt hoặc tiếng Anh tùy theo ngôn ngữ của câu hỏi.
Cuối mỗi câu trả lời về vấn đề pháp lý, thêm dòng: "⚠️ Đây chỉ là gợi ý tham khảo, không thay thế tư vấn pháp lý chính thức."`,
      },
      ...messages.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ],
    temperature: 0.5,
    max_tokens: 500,
  });

  const reply = completion.choices[0].message.content ?? "Xin lỗi, không thể trả lời lúc này.";

  // Save chat history
  const updatedMessages = [
    ...messages,
    { role: "user", content: message, timestamp: Date.now() },
    { role: "assistant", content: reply, timestamp: Date.now() },
  ];

  if (chatSession) {
    await db.aiChat.update({
      where: { id: chatSession.id },
      data: { messages: updatedMessages },
    });
  } else if (contractId) {
    await db.aiChat.create({
      data: { contractId, messages: updatedMessages },
    });
  }

  return NextResponse.json({ reply });
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx jest __tests__/api/ai.test.ts
```

Expected: PASS — 2 tests passed

- [ ] **Step 6: Commit**

```bash
git add app/api/ai/smart-fill app/api/ai/chat __tests__/api/ai.test.ts
git commit -m "feat: add AI smart-fill and contract chat API routes"
```

---

## Task 9: Stripe Billing

**Files:**
- Create: `app/api/stripe/checkout/route.ts`
- Create: `app/api/stripe/webhook/route.ts`
- Create: `app/api/user/usage/route.ts`
- Create: `app/(app)/settings/page.tsx`

- [ ] **Step 1: Create Stripe checkout route**

Create `app/api/stripe/checkout/route.ts`:

```typescript
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
```

- [ ] **Step 2: Create Stripe webhook route**

Create `app/api/stripe/webhook/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import Stripe from "stripe";
import { Plan } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_TO_PLAN: Record<string, Plan> = {
  [process.env.STRIPE_PRICE_SOLO!]: "SOLO",
  [process.env.STRIPE_PRICE_TEAM!]: "TEAM",
  [process.env.STRIPE_PRICE_ENTERPRISE!]: "ENTERPRISE",
};

export async function POST(req: Request) {
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
    const sub = event.data.object as Stripe.Subscription;
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
```

- [ ] **Step 3: Create usage API**

Create `app/api/user/usage/route.ts`:

```typescript
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
```

- [ ] **Step 4: Create settings page**

Create `app/(app)/settings/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";

type Usage = {
  plan: string;
  contractsUsed: number;
  contractsLimit: number | null;
  aiChatsPerDay: number | null;
  subscription: { currentPeriodEnd: string } | null;
};

const PLANS = [
  { key: "SOLO", name: "Solo", price: "$9/tháng", features: ["50 hợp đồng/tháng", "AI gợi ý cơ bản", "Xuất DOCX"] },
  { key: "TEAM", name: "Team", price: "$29/tháng", features: ["Không giới hạn", "AI Chat đầy đủ", "Tối đa 10 thành viên"] },
  { key: "ENTERPRISE", name: "Enterprise", price: "$99/tháng", features: ["Không giới hạn", "Custom template library", "Hỗ trợ ưu tiên"] },
];

export default function SettingsPage() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user/usage")
      .then((r) => r.json())
      .then(setUsage);
  }, []);

  async function handleUpgrade(plan: string) {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Settings & Billing</h1>

      {usage && (
        <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-8">
          <h2 className="font-medium text-zinc-900 mb-4">Gói hiện tại: <span className="text-indigo-600">{usage.plan}</span></h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-zinc-500">Hợp đồng đã tạo</div>
              <div className="font-medium">{usage.contractsUsed} / {usage.contractsLimit ?? "∞"}</div>
            </div>
            <div>
              <div className="text-zinc-500">AI Chat mỗi ngày</div>
              <div className="font-medium">{usage.aiChatsPerDay ?? "∞"}</div>
            </div>
            {usage.subscription && (
              <div>
                <div className="text-zinc-500">Gia hạn vào</div>
                <div className="font-medium">
                  {new Date(usage.subscription.currentPeriodEnd).toLocaleDateString("vi-VN")}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <h2 className="font-medium text-zinc-900 mb-4">Nâng cấp gói</h2>
      <div className="grid grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <div key={plan.key} className="border border-zinc-200 rounded-xl p-5">
            <div className="font-semibold text-zinc-900 mb-1">{plan.name}</div>
            <div className="text-indigo-600 font-bold mb-3">{plan.price}</div>
            <ul className="text-sm text-zinc-600 space-y-1 mb-4">
              {plan.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade(plan.key)}
              disabled={loading || usage?.plan === plan.key}
              className="w-full py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {usage?.plan === plan.key ? "Gói hiện tại" : "Nâng cấp"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/stripe app/api/user app/\(app\)/settings
git commit -m "feat: add Stripe billing, webhook, usage API, and settings page"
```

---

## Task 10: Landing Page

**Files:**
- Modify: `app/page.tsx`
- Create: `app/pricing/page.tsx`

- [ ] **Step 1: Update landing page**

Replace `app/page.tsx`:

```typescript
import Link from "next/link";
import { FileText, Wand2, Download, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-zinc-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="font-semibold text-zinc-900">ContractAI</span>
        <div className="flex items-center gap-6 text-sm text-zinc-600">
          <Link href="/pricing" className="hover:text-zinc-900">Pricing</Link>
          <Link
            href="/auth/login"
            className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Bắt đầu miễn phí
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-block text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full mb-6">
          🤖 Powered by GPT-4o
        </div>
        <h1 className="text-5xl font-bold text-zinc-900 leading-tight mb-6">
          Tạo hợp đồng chuyên nghiệp<br />
          <span className="text-indigo-600">trong vài phút</span>
        </h1>
        <p className="text-xl text-zinc-500 mb-10 max-w-2xl mx-auto">
          Upload template Word, AI tự động nhận diện và điền thông tin, xuất hợp đồng hoàn chỉnh.
          Dành cho freelancer và doanh nghiệp vừa và nhỏ.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/auth/login"
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Dùng miễn phí <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pricing"
            className="text-zinc-600 px-6 py-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors"
          >
            Xem pricing
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-3 gap-8">
          {[
            {
              icon: FileText,
              title: "Template Library",
              desc: "50+ mẫu hợp đồng phổ biến cho dịch vụ, thuê nhà, lao động và nhiều hơn nữa.",
            },
            {
              icon: Wand2,
              title: "AI Smart Fill",
              desc: "GPT-4o tự động nhận diện placeholder và gợi ý giá trị thông minh cho từng trường.",
            },
            {
              icon: Download,
              title: "Xuất ngay",
              desc: "Tải về file Word (.docx) hoàn chỉnh, sẵn sàng để ký kết và lưu trữ.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-zinc-900 mb-2">{title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-20 text-center px-6">
        <h2 className="text-3xl font-bold text-white mb-4">
          Bắt đầu tạo hợp đồng ngay hôm nay
        </h2>
        <p className="text-indigo-200 mb-8">Miễn phí 3 hợp đồng đầu tiên. Không cần thẻ tín dụng.</p>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 bg-white text-indigo-600 font-medium px-8 py-3 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          Tạo tài khoản miễn phí <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create pricing page**

Create `app/pricing/page.tsx`:

```typescript
"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

const PLANS = [
  {
    key: "FREE",
    name: "Free",
    price: "$0",
    period: "mãi mãi",
    features: ["3 hợp đồng", "Template có sẵn", "Xuất DOCX"],
    cta: "Bắt đầu miễn phí",
    href: "/auth/login",
    highlighted: false,
  },
  {
    key: "SOLO",
    name: "Solo",
    price: "$9",
    period: "tháng",
    features: ["50 hợp đồng/tháng", "Upload template riêng", "AI Smart Fill", "AI Chat 20 msg/ngày", "Xuất DOCX"],
    cta: "Chọn Solo",
    href: null,
    highlighted: false,
  },
  {
    key: "TEAM",
    name: "Team",
    price: "$29",
    period: "tháng",
    features: ["Không giới hạn hợp đồng", "Chia sẻ template trong team", "AI Chat không giới hạn", "Tối đa 10 thành viên", "Đa ngôn ngữ"],
    cta: "Chọn Team",
    href: null,
    highlighted: true,
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    price: "$99",
    period: "tháng",
    features: ["Không giới hạn mọi thứ", "Custom template library", "Thành viên không giới hạn", "Priority support"],
    cta: "Chọn Enterprise",
    href: null,
    highlighted: false,
  },
];

export default function PricingPage() {
  const router = useRouter();

  async function handleSelect(planKey: string, href: string | null) {
    if (href) {
      router.push(href);
      return;
    }
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planKey }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      router.push("/auth/login");
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-zinc-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="font-semibold text-zinc-900">ContractAI</Link>
        <Link href="/auth/login" className="text-sm text-indigo-600 hover:underline">
          Đăng nhập
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold text-center text-zinc-900 mb-4">Pricing</h1>
        <p className="text-center text-zinc-500 mb-12">
          Bắt đầu miễn phí, nâng cấp khi bạn cần.
        </p>

        <div className="grid grid-cols-4 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`rounded-2xl border p-6 flex flex-col ${
                plan.highlighted
                  ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-400"
                  : "border-zinc-200 bg-white"
              }`}
            >
              {plan.highlighted && (
                <div className="text-xs font-medium text-indigo-600 mb-2">⭐ Phổ biến nhất</div>
              )}
              <div className="font-bold text-lg text-zinc-900 mb-1">{plan.name}</div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-zinc-900">{plan.price}</span>
                <span className="text-zinc-500 text-sm">/{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                    <Check className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSelect(plan.key, plan.href)}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  plan.highlighted
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx app/pricing
git commit -m "feat: add landing page and pricing page"
```

---

## Task 11: Jest Config + Final Test Run

**Files:**
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

- [ ] **Step 1: Create Jest config**

Create `jest.config.ts`:

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFilesAfterFramework: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
  },
};

export default config;
```

- [ ] **Step 2: Create Jest setup**

Create `jest.setup.ts`:

```typescript
import "@testing-library/jest-dom";
```

- [ ] **Step 3: Run all tests**

```bash
npx jest --passWithNoTests
```

Expected: All tests pass.

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add jest.config.ts jest.setup.ts
git commit -m "chore: add Jest config and run all tests green"
```

---

## Task 12: E2E Smoke Test (Playwright)

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/smoke.spec.ts`

- [ ] **Step 1: Create Playwright config**

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: Create smoke test**

Create `e2e/smoke.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Tạo hợp đồng chuyên nghiệp")).toBeVisible();
});

test("pricing page loads", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("Pricing")).toBeVisible();
  await expect(page.getByText("Solo")).toBeVisible();
  await expect(page.getByText("Team")).toBeVisible();
});

test("unauthenticated user redirects to login from /app", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/auth\/login/);
});

test("login page has Google sign in button", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByText("Đăng nhập với Google")).toBeVisible();
});
```

- [ ] **Step 3: Commit**

```bash
git add playwright.config.ts e2e/
git commit -m "test: add Playwright smoke tests"
```

---

## Self-Review Checklist

After completing all tasks, verify:

- [ ] All API routes check auth and return 401 when unauthenticated
- [ ] Quota checks work: FREE users can't create more than 3 contracts
- [ ] Template upload saves file to `uploads/templates/` and calls AI detection
- [ ] Contract export generates a real DOCX using docxtemplater
- [ ] Stripe webhook correctly updates user plan after payment
- [ ] TypeScript compiles with no errors: `npx tsc --noEmit`
- [ ] All Jest tests pass: `npx jest`
- [ ] Smoke tests pass: `npx playwright test`
