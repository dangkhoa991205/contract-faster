@AGENTS.md

# Contract Faster — Project Overview

## Brand
- **Product name**: Contract Faster
- **Tagline**: Generate contracts in seconds, not hours
- **Logo**: ⚡ lightning bolt + "Contract Faster" wordmark
- **Target users**: Freelancers + SMBs (both Vietnamese and English markets)

## Design System
- **Theme**: Dark, developer-focused (inspired by Resend.com)
- **Background**: `#080810`
- **Foreground**: `#f1f1f3`
- **Accent**: Indigo `#6366f1`
- **Border**: `rgba(255,255,255,0.08)`
- **Card bg**: `rgba(255,255,255,0.04)`
- **Typography**: Display — Instrument Serif / Playfair Display; Body — DM Mono / JetBrains Mono for code; UI — system-ui
- **Animations**: `fadeUp` staggered reveals, `marquee` for logo strip

## Tech Stack
- **Framework**: Next.js 16 (App Router, Server Components, Server Actions)
- **Database**: PostgreSQL + Prisma 7
  - Prisma 7 breaking change: `url` lives in `prisma.config.ts` via `defineConfig()`, NOT in `schema.prisma`
- **Auth**: NextAuth v5 beta + PrismaAdapter + Google OAuth
- **AI**: OpenAI GPT-4o (placeholder detection, smart fill, contract chat)
- **DOCX**: docxtemplater + pizzip + mammoth
- **Billing**: Stripe (FREE / SOLO $9 / TEAM $29 / ENTERPRISE $99)
- **Styling**: Tailwind CSS 4 + shadcn/ui

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
- `lib/auth.ts` — NextAuth v5 config
- `lib/db.ts` — PrismaClient singleton
- `lib/quota.ts` — Plan quota limits
- `middleware.ts` — Route protection for `/app/*`
- `app/page.tsx` — Landing page (Contract Faster brand, dark Resend aesthetic)
- `app/(app)/` — Authenticated app shell

## Approach
Template-First: users upload or select `.docx` templates → AI detects placeholders → smart fill → export DOCX.

