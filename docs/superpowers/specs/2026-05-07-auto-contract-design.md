# Auto-Contract SaaS — Design Spec

**Date:** 2026-05-07  
**Approach:** Template-First with AI Assistance  
**Stack:** Next.js 16, Prisma 7, PostgreSQL, NextAuth v5, Stripe, OpenAI GPT-4o, docxtemplater

---

## 1. Product Overview

A multilingual (Vietnamese + English) SaaS platform that lets freelancers and SMBs generate professional contracts from templates in minutes. Users upload or select templates, AI detects placeholders and assists with filling, then the app exports a ready-to-use PDF or Word document.

**Target users:** Freelancers (Solo plan) and small-to-medium businesses (Team/Enterprise plans).

---

## 2. Core User Flow

1. Sign in with Google (NextAuth)
2. Choose a template from the library **or** upload a custom `.docx` template
3. AI (GPT-4o) scans the template and detects all placeholders
4. User fills in a dynamic form — AI suggests values for each field
5. AI Chat sidebar available to ask questions about any clause
6. User exports the completed contract as **PDF** or **DOCX**

---

## 3. Pages

### Public
| Route | Purpose |
|-------|---------|
| `/` | Landing page — hero, features, social proof, CTA |
| `/pricing` | Pricing tiers with Stripe checkout links |
| `/auth` | Google OAuth sign-in |

### App (authenticated)
| Route | Purpose |
|-------|---------|
| `/app` | Dashboard — stats, recent contracts |
| `/app/templates` | Browse library + upload custom templates |
| `/app/contracts` | List of all contracts created |
| `/app/contracts/new` | Contract editor — form + AI sidebar |
| `/app/settings` | Profile, billing, team management |

---

## 4. Data Models (Prisma)

```prisma
model User {
  id               String         @id @default(cuid())
  email            String         @unique
  name             String?
  image            String?
  plan             Plan           @default(FREE)
  stripeCustomerId String?
  contracts        Contract[]
  templates        Template[]
  subscription     Subscription?
  teamMemberships  TeamMember[]
  createdAt        DateTime       @default(now())
}

model Template {
  id           String     @id @default(cuid())
  name         String
  category     String
  language     String     @default("vi") // "vi" | "en"
  fileUrl      String
  placeholders Json       // [{ name, label, type }]
  isPublic     Boolean    @default(false)
  userId       String?
  user         User?      @relation(fields: [userId], references: [id])
  contracts    Contract[]
  createdAt    DateTime   @default(now())
}

model Contract {
  id          String   @id @default(cuid())
  title       String
  templateId  String
  template    Template @relation(fields: [templateId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  fieldValues Json     // { placeholder_name: value }
  outputUrl   String?
  status      ContractStatus @default(DRAFT)
  aiChats     AiChat[]
  createdAt   DateTime @default(now())
}

model Subscription {
  id             String   @id @default(cuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id])
  stripeSubId    String
  plan           Plan
  status         String
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
  team   Team   @relation(fields: [teamId], references: [id])
  userId String
  user   User   @relation(fields: [userId], references: [id])
  role   String @default("member") // "owner" | "member"
}

model AiChat {
  id         String   @id @default(cuid())
  contractId String
  contract   Contract @relation(fields: [contractId], references: [id])
  messages   Json     // [{ role, content, timestamp }]
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

---

## 5. Pricing Tiers

| Plan | Price | Contracts/month | AI Chat | Team members |
|------|-------|----------------|---------|-------------|
| Free | $0 | 3 | — | — |
| Solo | $9/mo | 50 | 20 msg/day | — |
| Team | $29/mo | Unlimited | Unlimited | Up to 10 |
| Enterprise | $99/mo | Unlimited | Unlimited | Unlimited |

Stripe Price IDs configured via env: `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_TEAM`, `STRIPE_PRICE_ENTERPRISE`.

---

## 6. AI Features

### 6.1 Placeholder Detection
- Triggered when a template is uploaded
- Flow: `.docx` → mammoth.js (extract text) → GPT-4o prompt → JSON field list
- Prompt instructs GPT-4o to find all fill-in slots (e.g. `{{TEN_BEN_A}}`, `[Ngày ký]`, underscores, etc.)
- Result stored in `Template.placeholders` as `[{ name, label, type }]`

### 6.2 Smart Fill
- Triggered when user focuses a form field
- Sends field name + contract category + user history to GPT-4o
- Returns a suggested value and brief explanation
- Also surfaces values from user's previous contracts (from DB) as quick-fill options

### 6.3 Contract Chat
- Persistent sidebar on the contract editor page
- System prompt: Vietnamese/English legal assistant, always includes disclaimer
- Messages stored in `AiChat` table
- Rate limited per plan (Solo: 20 msg/day, Team+: unlimited)

---

## 7. API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/[...nextauth]` | NextAuth Google OAuth |
| GET | `/api/templates` | List public + user templates |
| POST | `/api/templates` | Upload template, trigger AI detection |
| GET | `/api/contracts` | List user contracts |
| POST | `/api/contracts` | Create new contract |
| POST | `/api/contracts/[id]/export` | Export as PDF or DOCX |
| POST | `/api/ai/detect-placeholders` | GPT-4o placeholder detection |
| POST | `/api/ai/smart-fill` | Field value suggestion |
| POST | `/api/ai/chat` | Contract chat message |
| POST | `/api/stripe/checkout` | Create Stripe checkout session |
| POST | `/api/stripe/webhook` | Handle Stripe webhook events |
| GET | `/api/user/usage` | Get remaining quota for current period |

---

## 8. Document Generation

1. Load `.docx` template from local storage (`/uploads/templates/`)
2. Use `pizzip` to read the binary, `docxtemplater` to substitute placeholders with form values
3. Output `.docx` saved to `/uploads/contracts/`
4. PDF: convert using an external API or `libreoffice` (headless) — deferred to Phase 2; Phase 1 DOCX only
5. File storage: local filesystem in Phase 1, migrate to AWS S3 in Phase 2

---

## 9. Auth & Security

- Google OAuth via NextAuth v5 + Prisma adapter
- All `/app/*` routes and `/api/*` (except auth) require valid session
- Ownership checks on all contract/template mutations
- Stripe webhook verified via `STRIPE_WEBHOOK_SECRET`
- AI endpoints check plan quota before calling OpenAI

---

## 10. Testing Strategy

- **Unit:** Jest + Testing Library for form components and AI utility functions
- **Integration:** API route tests with mocked Prisma client
- **E2E:** Playwright for critical paths (sign-in, create contract, export)

---

## 11. Out of Scope (Phase 1)

- E-signing / digital signature
- AWS S3 file storage (local only)
- PDF export (DOCX only)
- White-label
- Mobile app
