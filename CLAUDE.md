@AGENTS.md

# Contract Faster — Project Overview

## Brand
- **Product name**: Contract Faster
- **Tagline**: Generate contracts in seconds, not hours
- **Logo**: ⚡ lightning bolt + "Contract Faster" wordmark
- **Target users**: Freelancers + SMBs (Vietnamese market primary)

## Design System (white/light theme)
- **Theme**: Clean white SaaS, light blue accents
- **Colors**: `--blue: #3b6bff`, `--teal: #06b6d4`, `--ink: #0b1120`, `--bg: #f4f6fb`
- **Gradient**: `linear-gradient(135deg, #3b6bff, #06b6d4)` used on all CTAs, strips, badges
- **Typography**: Display — Sora 700/800; Body — Inter 400/500/600
- **Nav**: Horizontal top nav, no sidebar. Logo | Templates | Tạo hợp đồng | Hợp đồng của tôi | Upgrade Pro | avatar

## Tech Stack
- **Framework**: Next.js 16 (App Router, Server Components)
- **Database**: PostgreSQL + Prisma 7
  - Prisma 7 breaking change: `url` lives in `prisma.config.ts` via `defineConfig()`, NOT in `schema.prisma`
- **Auth**: NextAuth v5 beta + PrismaAdapter + Google OAuth
- **AI**: OpenAI GPT-4o
- **DOCX**: docxtemplater + pizzip + mammoth
- **Billing**: Stripe (FREE / SOLO $9 / TEAM $29 / ENTERPRISE $99)
- **Styling**: Tailwind CSS 4 + shadcn/ui + inline `<style>` blocks in page components

## Authentication Architecture
- `lib/auth.config.ts` — Edge-safe config (no Prisma), used by middleware
- `lib/auth.ts` — Full NextAuth config with PrismaAdapter + Google OAuth provider
- `lib/ensure-user.ts` — Upsert user row on credentials login (NextAuth doesn't auto-create)
- `middleware.ts` — Edge middleware using `auth.config.ts` (NOT `auth.ts`) to avoid Prisma in edge runtime
- `app/auth/login/page.tsx` — Login page (Google OAuth button)
- Session: JWT strategy, user.id injected via callbacks

## Database Schema (Prisma)
```prisma
model User {
  id            String     @id @default(cuid())
  email         String     @unique
  name          String?
  image         String?
  plan          String     @default("FREE")      // FREE | SOLO | TEAM | ENTERPRISE
  stripeCustomerId String?
  createdAt     DateTime   @default(now())
  templates     Template[]
  contracts     Contract[]
}

model Template {
  id           String   @id @default(cuid())
  name         String
  category     String
  language     String   @default("vi")
  fileUrl      String                            // /uploads/templates/filename.docx
  placeholders Json     @default("[]")           // [{name, label, type}] — extracted from {{}} tokens
  isPublic     Boolean  @default(false)
  userId       String
  user         User     @relation(...)
  createdAt    DateTime @default(now())
}

model Contract {
  id          String   @id @default(cuid())
  title       String
  templateId  String
  fieldValues Json     @default("{}")
  userId      String
  user        User     @relation(...)
  createdAt   DateTime @default(now())
}
```

## Plans & Quotas
| Plan | Contracts/month | AI chats/day |
|------|----------------|--------------|
| FREE | 3 | 0 |
| SOLO | 50 | 20 |
| TEAM | ∞ | ∞ |
| ENTERPRISE | ∞ | ∞ |

## Key Files
- `prisma/schema.prisma` — DB schema (no `url` field — Prisma 7)
- `prisma.config.ts` — Prisma 7 datasource URL config
- `lib/auth.config.ts` — Edge-safe NextAuth config (no Prisma)
- `lib/auth.ts` — Full NextAuth v5 config with PrismaAdapter
- `lib/db.ts` — PrismaClient singleton
- `lib/quota.ts` — Plan quota limits
- `lib/openai.ts` — Lazy OpenAI singleton (proxy pattern)
- `lib/ensure-user.ts` — Upsert user for credentials login
- `app/app/page.tsx` — **Main app UI** (hero/chat/templates/create views, inline CSS)
- `app/app/layout.tsx` — App shell (requireAuth, white bg, no sidebar)
- `app/page.tsx` — Public landing page (white theme, Sora+Inter)
- `app/pricing/page.tsx` — Pricing page
- `app/api/ai/smart-create/route.ts` — AI chat → returns type: "chat" | "form" | "contract"
- `app/api/contracts/generate/route.ts` — Fill DOCX or AI-fill `…………` style → HTML
- `app/api/contracts/preview/route.ts` — DOCX fill → mammoth HTML (case-insensitive token match)
- `app/api/contracts/pdf/route.ts` — Fill DOCX → mammoth → print HTML (browser prints to PDF)
- `app/api/contracts/route.ts` — Save contract to DB
- `app/api/contracts/[id]/export/route.ts` — DOCX export download
- `app/api/templates/route.ts` — Template upload + {{}} token extraction + AI labeling
- `app/api/templates/[id]/route.ts` — Template DELETE
- `app/api/templates/fields/route.ts` — Extract/return form fields for a template
- `app/api/user/usage/route.ts` — Usage stats for quota
- `app/api/stripe/checkout/route.ts` — Stripe checkout session
- `app/api/stripe/webhook/route.ts` — Stripe webhook (update plan)

## App Flow (views in app/app/page.tsx)
1. **Hero view** (`view === "hero"`) — Landing, animated demo, suggestion cards. CTA → create view (if templates exist) or templates view
2. **Templates view** (`view === "templates"`) — Upload form + template grid
3. **Chat view** (`view === "chat"`) — Conversational AI. Returns `type:"chat"` (text) or `type:"form"` (inline form) or `type:"contract"` (preview card)
4. **Create view** (`view === "create"`) — Step 1: select template grid → Step 2: fill form → generate preview → export PDF

## Chat → Form Flow (CURRENT — key design decision)
1. User chats naturally (text or voice)
2. AI identifies contract type → returns `type: "form"` with `templateId` + `fields[]`
3. Frontend renders `InlineChatForm` component inside chat message
4. User fills form → submits → calls `/api/contracts/generate`
5. Preview HTML shown inline → "Xuất PDF" opens print dialog

## DOCX + Template System (CRITICAL)
- Templates use `{{FIELD_NAME}}` syntax OR `…………` blanks
- Upload: regex extracts `{{TOKEN}}` from raw DOCX text → AI generates Vietnamese labels → saved as `placeholders` JSON
- `/api/templates/fields`: returns stored placeholders, or re-extracts from DOCX via AI if empty
- `/api/contracts/generate`: 
  - If DOCX has `{{}}` tokens → docxtemplater fill → mammoth HTML
  - If DOCX uses `…………` → mammoth HTML → AI replaces blanks intelligently
- Preview: case-insensitive token matching (AI may return `ho_ten`, DOCX has `{{HO_TEN}}`)
- **Bug history**: mammoth splits `{{FIELD}}` across spans → always fill DOCX BEFORE converting to HTML

## AI smart-create Response Types
- `{"type":"chat","message":"..."}` — plain text reply
- `{"type":"form","templateId":"...","templateName":"...","fields":[...],"message":"..."}` — show inline form
- `{"type":"contract",...}` — show contract card with preview/export buttons
