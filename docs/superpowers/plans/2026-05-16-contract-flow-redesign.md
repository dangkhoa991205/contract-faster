# Contract Faster — Flow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the app flow to enforce Upload → Parse → Detect Fields → Review Fields → Save Template → Fill Data → Validate → Preview → Export, preventing contract generation without a properly configured template.

**Architecture:** Replace the current 4-view SPA (hero/chat/templates/create) with a 6-view wizard flow (home/upload/setup/fill/preview + chat as optional assistant). Add a `PUT /api/templates/[id]` endpoint for field editing, a `POST /api/contracts/validate` endpoint for required-field checking, and a `description` column to the Template table. The main UI change is in `app/app/page.tsx`.

**Tech Stack:** Next.js 16 App Router, Prisma 7 + PostgreSQL (Neon), mammoth + docxtemplater, OpenAI GPT-4o, Vercel Blob, TypeScript.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add `description String?` to Template |
| `prisma/migrations/…/migration.sql` | Create | ALTER TABLE for description column |
| `app/api/templates/[id]/route.ts` | Modify | Add PUT handler for updating fields/description |
| `app/api/contracts/validate/route.ts` | Create | Check required fields before export |
| `app/app/page.tsx` | Rewrite | New 6-view flow wizard |

---

## Task 1: Schema — add `description` to Template

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260516_add_template_description/migration.sql`

- [ ] **Step 1: Add field to schema**

In `prisma/schema.prisma`, inside the `Template` model, add after `category String`:
```prisma
  description  String?
```

Full updated model section:
```prisma
model Template {
  id           String     @id @default(cuid())
  name         String
  category     String
  description  String?
  language     String     @default("vi")
  fileUrl      String
  placeholders Json       @default("[]")
  isPublic     Boolean    @default(false)
  userId       String?
  user         User?      @relation(fields: [userId], references: [id], onDelete: SetNull)
  contracts    Contract[]
  createdAt    DateTime   @default(now())
}
```

- [ ] **Step 2: Create migration SQL**

Create file `prisma/migrations/20260516_add_template_description/migration.sql`:
```sql
ALTER TABLE "Template" ADD COLUMN "description" TEXT;
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate deploy
```
Expected: `1 migration applied successfully`

- [ ] **Step 4: Regenerate Prisma client**

```bash
npx prisma generate
```
Expected: `✔ Generated Prisma Client`

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output (clean)

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add description field to Template"
```

---

## Task 2: API — PUT /api/templates/[id] (update fields)

**Files:**
- Modify: `app/api/templates/[id]/route.ts`

- [ ] **Step 1: Add PUT handler**

Replace the entire content of `app/api/templates/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const template = await db.template.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (template.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await db.template.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const template = await db.template.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (template.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, category, description, placeholders } = body as {
    name?: string;
    category?: string;
    description?: string;
    placeholders?: Array<{ name: string; label: string; type: string; required: boolean }>;
  };

  const updated = await db.template.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description }),
      ...(placeholders !== undefined && { placeholders }),
    },
  });

  return NextResponse.json(updated);
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add app/api/templates/[id]/route.ts
git commit -m "feat: add PUT handler for template field editing"
```

---

## Task 3: API — POST /api/contracts/validate (required field check)

**Files:**
- Create: `app/api/contracts/validate/route.ts`

- [ ] **Step 1: Create validate endpoint**

Create `app/api/contracts/validate/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { templateId, fieldValues } = await req.json() as {
    templateId: string;
    fieldValues: Record<string, string>;
  };

  const template = await db.template.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const placeholders = template.placeholders as Array<{
    name: string; label: string; type: string; required: boolean;
  }>;

  const missing = placeholders
    .filter(p => p.required && !fieldValues[p.name]?.trim())
    .map(p => ({ name: p.name, label: p.label }));

  return NextResponse.json({ valid: missing.length === 0, missing });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add app/api/contracts/validate/route.ts
git commit -m "feat: add contract validate endpoint for required fields"
```

---

## Task 4: UI — Redesign app/app/page.tsx with new 6-view flow

**Files:**
- Rewrite: `app/app/page.tsx`

This is the largest task. The new view states are:

```typescript
type View = "home" | "upload" | "setup" | "fill" | "preview";
```

**View descriptions:**
- `home` — Dashboard: recent templates grid + "Upload New Template" button + "Create Contract" button per template
- `upload` — File upload form (DOCX/PDF), name, category. On submit → calls POST /api/templates → goes to `setup` view with detected fields
- `setup` — Review/edit fields: list of detected fields (name, label, type, required toggle), description input, contract type. Save → PUT /api/templates/[id] → goes to `home`
- `fill` — For a selected template: show all fields as a form. Validate required fields. Preview button → calls /api/contracts/generate → goes to `preview`
- `preview` — Shows generated HTML. Export PDF button. Export DOCX button. Back to fill button.

**Key state variables:**
```typescript
const [view, setView] = useState<"home"|"upload"|"setup"|"fill"|"preview">("home");
const [templates, setTemplates] = useState<Template[]>([]);
const [uploadLoading, setUploadLoading] = useState(false);

// Setup state (after upload)
const [setupTemplate, setSetupTemplate] = useState<Template | null>(null);
const [setupFields, setSetupFields] = useState<Field[]>([]);
const [setupName, setSetupName] = useState("");
const [setupCategory, setSetupCategory] = useState("");
const [setupDescription, setSetupDescription] = useState("");

// Fill state (creating contract)
const [fillTemplate, setFillTemplate] = useState<Template | null>(null);
const [fillValues, setFillValues] = useState<Record<string, string>>({});
const [fillErrors, setFillErrors] = useState<string[]>([]);
const [fillLoading, setFillLoading] = useState(false);

// Preview state
const [previewHtml, setPreviewHtml] = useState("");
const [exporting, setExporting] = useState(false);
```

**Field type:**
```typescript
type Field = { name: string; label: string; type: string; required: boolean };
type Template = {
  id: string; name: string; category: string; description?: string;
  placeholders: Field[]; fileUrl: string; createdAt: string;
};
```

- [ ] **Step 1: Rewrite app/app/page.tsx**

Full file content (replace entire file):

```typescript
"use client";
import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

type Field = { name: string; label: string; type: string; required: boolean };
type Template = {
  id: string; name: string; category: string; description?: string;
  placeholders: Field[]; fileUrl: string; createdAt: string;
};
type View = "home" | "upload" | "setup" | "fill" | "preview";

export default function AppPage() {
  const [view, setView] = useState<View>("home");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Hợp đồng dịch vụ");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Setup state
  const [setupTemplate, setSetupTemplate] = useState<Template | null>(null);
  const [setupFields, setSetupFields] = useState<Field[]>([]);
  const [setupName, setSetupName] = useState("");
  const [setupCategory, setSetupCategory] = useState("");
  const [setupDescription, setSetupDescription] = useState("");
  const [setupSaving, setSetupSaving] = useState(false);

  // Fill state
  const [fillTemplate, setFillTemplate] = useState<Template | null>(null);
  const [fillValues, setFillValues] = useState<Record<string, string>>({});
  const [fillErrors, setFillErrors] = useState<string[]>([]);
  const [fillLoading, setFillLoading] = useState(false);

  // Preview state
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/templates")
      .then(r => r.json())
      .then(data => { setTemplates(Array.isArray(data) ? data : []); setLoadingTemplates(false); })
      .catch(() => setLoadingTemplates(false));
  }, []);

  /* ── Upload template ── */
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !uploadName.trim()) { setUploadError("Vui lòng chọn file và nhập tên template."); return; }
    setUploadLoading(true); setUploadError("");
    const fd = new FormData();
    fd.append("file", uploadFile);
    fd.append("name", uploadName.trim());
    fd.append("category", uploadCategory);
    try {
      const res = await fetch("/api/templates", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error ?? "Lỗi upload."); setUploadLoading(false); return; }
      // Go to setup view with detected fields
      const fields: Field[] = (data.placeholders ?? []).map((p: { name: string; label: string; type: string }) => ({
        ...p, required: true,
      }));
      setSetupTemplate(data);
      setSetupFields(fields);
      setSetupName(data.name);
      setSetupCategory(data.category);
      setSetupDescription(data.description ?? "");
      setTemplates(prev => [data, ...prev]);
      setView("setup");
    } catch {
      setUploadError("Lỗi kết nối. Vui lòng thử lại.");
    }
    setUploadLoading(false);
  }

  /* ── Save template setup ── */
  async function handleSetupSave() {
    if (!setupTemplate) return;
    setSetupSaving(true);
    await fetch(`/api/templates/${setupTemplate.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: setupName, category: setupCategory, description: setupDescription, placeholders: setupFields }),
    });
    // Update local list
    setTemplates(prev => prev.map(t => t.id === setupTemplate.id
      ? { ...t, name: setupName, category: setupCategory, description: setupDescription, placeholders: setupFields }
      : t
    ));
    setSetupSaving(false);
    setView("home");
  }

  /* ── Start filling a contract ── */
  function startFill(template: Template) {
    setFillTemplate(template);
    setFillValues({});
    setFillErrors([]);
    setView("fill");
  }

  /* ── Generate preview ── */
  async function handleGenerate() {
    if (!fillTemplate) return;
    // Validate required fields
    const missing = (fillTemplate.placeholders ?? [])
      .filter(p => p.required && !fillValues[p.name]?.trim())
      .map(p => p.label);
    if (missing.length > 0) { setFillErrors(missing); return; }
    setFillErrors([]);
    setFillLoading(true);
    try {
      const res = await fetch("/api/contracts/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: fillTemplate.id, fieldValues: fillValues }),
      });
      const { html } = await res.json();
      setPreviewHtml(html);
      setPreviewTemplate(fillTemplate);
      setView("preview");
    } catch {
      setFillErrors(["Lỗi tạo hợp đồng. Vui lòng thử lại."]);
    }
    setFillLoading(false);
  }

  /* ── Export PDF ── */
  async function handleExportPdf() {
    if (!previewTemplate) return;
    const win = window.open("", "_blank");
    if (!win) { alert("Vui lòng cho phép popup để xuất PDF."); return; }
    win.document.write("<html><body><p style='font-family:sans-serif;padding:40px'>Đang tạo PDF...</p></body></html>");
    const res = await fetch("/api/contracts/pdf", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: previewTemplate.id, fieldValues: fillValues, contractName: previewTemplate.name }),
    });
    if (res.ok) {
      const html = await res.text();
      win.document.open(); win.document.write(html); win.document.close();
    } else { win.close(); alert("Không thể tạo PDF."); }
  }

  /* ── Export DOCX ── */
  async function handleExportDocx() {
    if (!previewTemplate) return;
    setExporting(true);
    const title = `${previewTemplate.name} - ${new Date().toLocaleDateString("vi-VN")}`;
    const cr = await fetch("/api/contracts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, templateId: previewTemplate.id, fieldValues: fillValues }),
    });
    if (!cr.ok) { alert("Lỗi lưu hợp đồng."); setExporting(false); return; }
    const { id } = await cr.json();
    const er = await fetch(`/api/contracts/${id}/export`, { method: "POST" });
    if (er.ok) {
      const blob = await er.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`; a.click();
      URL.revokeObjectURL(url);
    } else { alert("Lỗi xuất DOCX."); }
    setExporting(false);
  }

  /* ── Delete template ── */
  async function handleDelete(id: string) {
    if (!confirm("Xóa template này?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    setTemplates(prev => prev.filter(t => t.id !== id));
  }

  /* ── Reset upload form ── */
  function goUpload() {
    setUploadFile(null); setUploadName(""); setUploadCategory("Hợp đồng dịch vụ"); setUploadError("");
    setView("upload");
  }

  return (
    <>
      <style>{`
        :root {
          --blue: #3b6bff; --teal: #06b6d4; --ink: #0b1120;
          --bg: #f4f6fb; --white: #fff;
          --border: #e2e8f0; --border2: #cbd5e1;
          --t2: #475569; --t4: #94a3b8;
          --bsoft: #eff6ff; --bborder: #bfdbfe;
          --red: #ef4444;
          --r-sm: 10px; --r-md: 14px; --r-lg: 20px;
          --sh-sm: 0 1px 4px rgba(0,0,0,.06);
          --sh-md: 0 4px 16px rgba(0,0,0,.08);
          --grad: linear-gradient(135deg,#3b6bff,#06b6d4);
          --sans: 'Inter',system-ui,sans-serif;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--sans); background: var(--bg); color: var(--ink); }

        /* Nav */
        .nav { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
        .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 60px; display: flex; align-items: center; gap: 12px; }
        .nav-logo { font-family: 'Sora',var(--sans); font-weight: 800; font-size: 18px; background: var(--grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; cursor: pointer; margin-right: 8px; }
        .nav-btn { padding: 7px 14px; border-radius: var(--r-sm); font-size: 13px; font-weight: 500; border: none; background: transparent; color: var(--t2); cursor: pointer; transition: all .15s; }
        .nav-btn:hover, .nav-btn.active { background: var(--bsoft); color: var(--blue); }
        .nav-right { margin-left: auto; display: flex; gap: 8px; }

        /* Layout */
        .page { max-width: 1100px; margin: 0 auto; padding: 40px 24px; }
        .page-sm { max-width: 720px; margin: 0 auto; padding: 40px 24px; }

        /* Cards */
        .card { background: var(--white); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 28px; box-shadow: var(--sh-sm); }

        /* Buttons */
        .btn-pri { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: var(--r-sm); font-size: 14px; font-weight: 600; background: var(--grad); color: #fff; border: none; cursor: pointer; transition: opacity .15s; }
        .btn-pri:hover { opacity: .88; }
        .btn-pri:disabled { opacity: .5; cursor: not-allowed; }
        .btn-sec { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: var(--r-sm); font-size: 14px; font-weight: 600; background: var(--white); color: var(--t2); border: 1.5px solid var(--border2); cursor: pointer; transition: all .15s; }
        .btn-sec:hover { border-color: var(--blue); color: var(--blue); }
        .btn-danger { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: var(--r-sm); font-size: 13px; font-weight: 600; background: #fff1f1; color: var(--red); border: 1px solid #fecaca; cursor: pointer; }

        /* Forms */
        .form-group { margin-bottom: 18px; }
        .form-label { display: block; font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 6px; }
        .form-label .req { color: var(--red); margin-left: 2px; }
        .form-input { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border2); border-radius: var(--r-sm); font-size: 14px; font-family: var(--sans); background: var(--white); color: var(--ink); transition: border .15s; }
        .form-input:focus { outline: none; border-color: var(--blue); }
        .form-select { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border2); border-radius: var(--r-sm); font-size: 14px; font-family: var(--sans); background: var(--white); color: var(--ink); }
        .form-textarea { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border2); border-radius: var(--r-sm); font-size: 14px; font-family: var(--sans); background: var(--white); color: var(--ink); resize: vertical; min-height: 80px; }

        /* Step indicator */
        .steps { display: flex; align-items: center; gap: 0; margin-bottom: 36px; }
        .step { display: flex; align-items: center; gap: 8px; }
        .step-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
        .step-dot.done { background: var(--grad); color: #fff; }
        .step-dot.active { background: var(--blue); color: #fff; box-shadow: 0 0 0 4px #3b6bff22; }
        .step-dot.pending { background: var(--border); color: var(--t4); }
        .step-label { font-size: 12px; font-weight: 600; color: var(--t2); }
        .step-label.active { color: var(--blue); }
        .step-line { flex: 1; height: 2px; background: var(--border); margin: 0 8px; min-width: 24px; }
        .step-line.done { background: var(--grad); }

        /* Template grid */
        .tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .tpl-card { background: var(--white); border: 1.5px solid var(--border); border-radius: var(--r-md); padding: 20px; cursor: pointer; transition: all .2s; }
        .tpl-card:hover { border-color: var(--blue); box-shadow: var(--sh-md); transform: translateY(-2px); }
        .tpl-name { font-size: 15px; font-weight: 700; color: var(--ink); margin-bottom: 4px; }
        .tpl-cat { font-size: 12px; color: var(--blue); font-weight: 600; background: var(--bsoft); padding: 2px 8px; border-radius: 20px; display: inline-block; margin-bottom: 8px; }
        .tpl-desc { font-size: 13px; color: var(--t2); margin-bottom: 12px; line-height: 1.5; }
        .tpl-fields { font-size: 12px; color: var(--t4); margin-bottom: 14px; }
        .tpl-actions { display: flex; gap: 8px; }

        /* Field editor */
        .field-row { display: grid; grid-template-columns: 1fr 1fr auto auto; gap: 10px; align-items: center; padding: 12px; background: var(--bg); border-radius: var(--r-sm); margin-bottom: 8px; }
        .field-tag { font-size: 11px; font-weight: 700; color: var(--t4); font-family: monospace; background: #f1f5f9; padding: 3px 8px; border-radius: 6px; }

        /* Preview */
        .doc-paper { background: white; color: #1e293b; border-radius: 5px; padding: 52px 56px; font-size: 13.5px; line-height: 1.85; font-family: 'Times New Roman',Times,serif; box-shadow: 0 2px 20px rgba(0,0,0,.07); }
        .doc-paper h1,.doc-paper h2,.doc-paper h3 { color: #0f172a; margin: 16px 0 8px; font-weight: 700; }
        .doc-paper p { margin-bottom: 9px; }
        .doc-paper p:not([style*="text-align"]) { text-align: justify; }
        .doc-paper table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        .doc-paper td,.doc-paper th { border: 1px solid #e2e8f0; padding: 8px 12px; }

        /* Alert */
        .alert-err { background: #fff1f1; border: 1px solid #fecaca; border-radius: var(--r-sm); padding: 12px 16px; color: var(--red); font-size: 13px; margin-bottom: 16px; }

        /* Drop zone */
        .drop-zone { border: 2px dashed var(--border2); border-radius: var(--r-md); padding: 48px; text-align: center; transition: all .2s; cursor: pointer; }
        .drop-zone:hover, .drop-zone.drag { border-color: var(--blue); background: var(--bsoft); }
        .drop-zone input { display: none; }

        /* Page header */
        .page-header { margin-bottom: 28px; }
        .page-title { font-family: 'Sora',var(--sans); font-size: 24px; font-weight: 800; color: var(--ink); }
        .page-sub { font-size: 14px; color: var(--t2); margin-top: 4px; }

        /* Empty state */
        .empty { text-align: center; padding: 64px 0; }
        .empty-icon { font-size: 48px; margin-bottom: 16px; }
        .empty-title { font-size: 18px; font-weight: 700; color: var(--ink); margin-bottom: 8px; }
        .empty-sub { font-size: 14px; color: var(--t2); }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => setView("home")}>⚡ Contract Faster</div>
          <button className={`nav-btn ${view === "home" ? "active" : ""}`} onClick={() => setView("home")}>🏠 Trang chủ</button>
          <button className={`nav-btn ${view === "upload" ? "active" : ""}`} onClick={goUpload}>📤 Upload Template</button>
          <div className="nav-right">
            <button className="btn-pri" onClick={goUpload}>+ Upload Template</button>
          </div>
        </div>
      </nav>

      {/* ── HOME VIEW ── */}
      {view === "home" && (
        <div className="page">
          <div className="page-header" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <div className="page-title">Mẫu hợp đồng của bạn</div>
              <div className="page-sub">Upload template DOCX/PDF và tạo hợp đồng chuyên nghiệp trong vài giây</div>
            </div>
            <button className="btn-pri" onClick={goUpload}>📤 Upload Template mới</button>
          </div>

          {loadingTemplates ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--t4)" }}>
              <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
              <div>Đang tải...</div>
            </div>
          ) : templates.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📄</div>
              <div className="empty-title">Chưa có template nào</div>
              <div className="empty-sub" style={{ marginBottom: 24 }}>Upload file DOCX làm mẫu hợp đồng để bắt đầu</div>
              <button className="btn-pri" onClick={goUpload}>📤 Upload Template đầu tiên</button>
            </div>
          ) : (
            <div className="tpl-grid">
              {templates.map(t => (
                <div key={t.id} className="tpl-card">
                  <div className="tpl-cat">{t.category}</div>
                  <div className="tpl-name">{t.name}</div>
                  {t.description && <div className="tpl-desc">{t.description}</div>}
                  <div className="tpl-fields">
                    {(t.placeholders ?? []).length} trường •{" "}
                    {(t.placeholders ?? []).filter(p => p.required).length} bắt buộc
                  </div>
                  <div className="tpl-actions">
                    <button className="btn-pri" style={{ flex: 1, justifyContent: "center" }} onClick={() => startFill(t)}>
                      ✍️ Tạo hợp đồng
                    </button>
                    <button className="btn-sec" onClick={() => {
                      setSetupTemplate(t);
                      setSetupFields(t.placeholders ?? []);
                      setSetupName(t.name);
                      setSetupCategory(t.category);
                      setSetupDescription(t.description ?? "");
                      setView("setup");
                    }}>⚙️</button>
                    <button className="btn-danger" onClick={() => handleDelete(t.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── UPLOAD VIEW ── */}
      {view === "upload" && (
        <div className="page-sm">
          <StepBar current={0} />
          <div className="page-header">
            <div className="page-title">Upload Template</div>
            <div className="page-sub">Upload file DOCX làm mẫu hợp đồng. AI sẽ tự động nhận diện các field cần điền.</div>
          </div>
          <div className="card">
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label className="form-label">Tên template <span className="req">*</span></label>
                <input className="form-input" value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="VD: Hợp đồng dịch vụ marketing" required />
              </div>
              <div className="form-group">
                <label className="form-label">Loại hợp đồng <span className="req">*</span></label>
                <select className="form-select" value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}>
                  {["Hợp đồng dịch vụ","Hợp đồng lao động","Hợp đồng mua bán","Hợp đồng thuê mặt bằng","Hợp đồng hợp tác","Hợp đồng KOL/KOC","Khác"].map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">File DOCX <span className="req">*</span></label>
                <label className={`drop-zone ${uploadFile ? "drag" : ""}`}>
                  <input type="file" accept=".docx" onChange={e => { setUploadFile(e.target.files?.[0] ?? null); if (e.target.files?.[0] && !uploadName) setUploadName(e.target.files[0].name.replace(/\.docx$/i, "").replace(/[_-]/g, " ")); }} />
                  {uploadFile ? (
                    <div>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                      <div style={{ fontWeight: 700, color: "var(--ink)" }}>{uploadFile.name}</div>
                      <div style={{ fontSize: 13, color: "var(--t4)", marginTop: 4 }}>{(uploadFile.size / 1024).toFixed(0)} KB • Click để đổi file</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>Kéo thả hoặc click để chọn file</div>
                      <div style={{ fontSize: 13, color: "var(--t4)", marginTop: 6 }}>Hỗ trợ file .DOCX (có thể dùng biến {{`{{field_name}}`}} hoặc ………)</div>
                    </div>
                  )}
                </label>
              </div>
              {uploadError && <div className="alert-err">⚠️ {uploadError}</div>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn-sec" onClick={() => setView("home")}>Huỷ</button>
                <button type="submit" className="btn-pri" disabled={uploadLoading}>
                  {uploadLoading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Đang phân tích...</> : "Tiếp theo →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SETUP VIEW ── */}
      {view === "setup" && setupTemplate && (
        <div className="page-sm">
          <StepBar current={1} />
          <div className="page-header">
            <div className="page-title">Cấu hình Template</div>
            <div className="page-sub">Xem lại và chỉnh sửa các field AI phát hiện được. Đánh dấu field nào là bắt buộc.</div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Thông tin template</div>
            <div className="form-group">
              <label className="form-label">Tên template</label>
              <input className="form-input" value={setupName} onChange={e => setSetupName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Loại hợp đồng</label>
              <select className="form-select" value={setupCategory} onChange={e => setSetupCategory(e.target.value)}>
                {["Hợp đồng dịch vụ","Hợp đồng lao động","Hợp đồng mua bán","Hợp đồng thuê mặt bằng","Hợp đồng hợp tác","Hợp đồng KOL/KOC","Khác"].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Mô tả (tuỳ chọn)</label>
              <textarea className="form-textarea" value={setupDescription} onChange={e => setSetupDescription(e.target.value)} placeholder="VD: Hợp đồng dịch vụ quảng cáo KOC TikTok..." />
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Fields phát hiện được ({setupFields.length})</div>
              <button className="btn-sec" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setSetupFields(prev => [...prev, { name: `field_${Date.now()}`, label: "Field mới", type: "text", required: false }])}>+ Thêm field</button>
            </div>

            {setupFields.length === 0 && (
              <div style={{ padding: "24px 0", textAlign: "center", color: "var(--t4)", fontSize: 14 }}>
                Không phát hiện field nào. AI sẽ điền thông minh theo ngữ cảnh.
              </div>
            )}

            {setupFields.map((f, i) => (
              <div key={i} className="field-row">
                <div>
                  <div className="field-tag">{"{{"}{f.name}{"}}"}</div>
                  <input className="form-input" style={{ marginTop: 6, fontSize: 13 }} value={f.label} onChange={e => setSetupFields(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="Nhãn hiển thị" />
                </div>
                <select className="form-select" style={{ fontSize: 13 }} value={f.type} onChange={e => setSetupFields(prev => prev.map((x, j) => j === i ? { ...x, type: e.target.value } : x))}>
                  <option value="text">Văn bản</option>
                  <option value="date">Ngày tháng</option>
                  <option value="number">Số</option>
                  <option value="email">Email</option>
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer" }}>
                  <input type="checkbox" checked={f.required} onChange={e => setSetupFields(prev => prev.map((x, j) => j === i ? { ...x, required: e.target.checked } : x))} />
                  Bắt buộc
                </label>
                <button style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 18, padding: 4 }} onClick={() => setSetupFields(prev => prev.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn-sec" onClick={() => setView("home")}>← Về trang chủ</button>
              <button className="btn-pri" onClick={handleSetupSave} disabled={setupSaving}>
                {setupSaving ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Đang lưu...</> : "💾 Lưu Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FILL VIEW ── */}
      {view === "fill" && fillTemplate && (
        <div className="page-sm">
          <StepBar current={2} />
          <div className="page-header" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <div className="page-title">Nhập thông tin hợp đồng</div>
              <div className="page-sub">{fillTemplate.name}</div>
            </div>
            <button className="btn-sec" onClick={() => setView("home")}>← Quay lại</button>
          </div>

          <div className="card">
            {(fillTemplate.placeholders ?? []).length === 0 ? (
              <div style={{ padding: "12px 0", color: "var(--t2)", fontSize: 14 }}>
                Template này không có field cố định. AI sẽ điền thông minh từ nội dung template.
              </div>
            ) : (
              (fillTemplate.placeholders ?? []).map(f => (
                <div key={f.name} className="form-group">
                  <label className="form-label">
                    {f.label} {f.required && <span className="req">*</span>}
                    <span style={{ fontSize: 11, color: "var(--t4)", fontWeight: 400, marginLeft: 6 }}>{"{{"}{f.name}{"}}"}</span>
                  </label>
                  {f.type === "date" ? (
                    <input type="date" className="form-input" value={fillValues[f.name] ?? ""} onChange={e => setFillValues(prev => ({ ...prev, [f.name]: e.target.value }))} />
                  ) : f.type === "number" ? (
                    <input type="number" className="form-input" value={fillValues[f.name] ?? ""} onChange={e => setFillValues(prev => ({ ...prev, [f.name]: e.target.value }))} />
                  ) : f.type === "email" ? (
                    <input type="email" className="form-input" value={fillValues[f.name] ?? ""} onChange={e => setFillValues(prev => ({ ...prev, [f.name]: e.target.value }))} />
                  ) : (
                    <input type="text" className="form-input" value={fillValues[f.name] ?? ""} onChange={e => setFillValues(prev => ({ ...prev, [f.name]: e.target.value }))} placeholder={`Nhập ${f.label.toLowerCase()}...`} />
                  )}
                </div>
              ))
            )}

            {fillErrors.length > 0 && (
              <div className="alert-err">
                <strong>⚠️ Thiếu thông tin bắt buộc:</strong>
                <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                  {fillErrors.map(e => <li key={e}>{e}</li>)}
                </ul>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn-sec" onClick={() => setView("home")}>Huỷ</button>
              <button className="btn-pri" onClick={handleGenerate} disabled={fillLoading}>
                {fillLoading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Đang tạo...</> : "👁️ Xem trước hợp đồng →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW VIEW ── */}
      {view === "preview" && (
        <div className="page">
          <StepBar current={3} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <div className="page-title">Xem trước hợp đồng</div>
              <div className="page-sub">{previewTemplate?.name}</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-sec" onClick={() => setView("fill")}>← Chỉnh sửa</button>
              <button className="btn-sec" onClick={handleExportPdf} style={{ borderColor: "#ef4444", color: "#ef4444" }}>📄 Xuất PDF</button>
              <button className="btn-pri" onClick={handleExportDocx} disabled={exporting}>
                {exporting ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Đang xuất...</> : "⬇️ Tải DOCX"}
              </button>
            </div>
          </div>
          <div className="doc-paper" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      )}
    </>
  );
}

/* ── Step indicator component ── */
function StepBar({ current }: { current: number }) {
  const steps = ["Upload Template", "Cấu hình Fields", "Nhập dữ liệu", "Xem trước & Xuất"];
  return (
    <div className="steps" style={{ marginBottom: 32 }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className="step">
            <div className={`step-dot ${i < current ? "done" : i === current ? "active" : "pending"}`}>
              {i < current ? "✓" : i + 1}
            </div>
            <span className={`step-label ${i === current ? "active" : ""}`}>{s}</span>
          </div>
          {i < steps.length - 1 && <div className={`step-line ${i < current ? "done" : ""}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output

- [ ] **Step 3: Test the build**

```bash
npx next build 2>&1 | tail -20
```
Expected: `✓ Generating static pages` with no errors

- [ ] **Step 4: Commit**

```bash
git add app/app/page.tsx app/api/contracts/validate/
git commit -m "feat: redesign app flow - upload→setup→fill→preview wizard"
```

---

## Task 5: Deploy to Vercel

- [ ] **Step 1: Run migration on production DB**

```bash
DATABASE_URL="<your-neon-url>" npx prisma migrate deploy
```
Expected: `1 migration applied successfully`

- [ ] **Step 2: Push to GitHub (triggers Vercel auto-deploy if connected)**

```bash
git push origin main
```

Or manual deploy:
```bash
npx vercel deploy --prod
```

- [ ] **Step 3: Verify live**

Open `https://project-auto-contract.vercel.app/app` and confirm:
- Home shows template grid
- Upload button goes to Upload view with step bar
- After upload → Setup view with detected fields
- Editing fields and saving works
- Fill form validates required fields
- Preview shows contract HTML with correct alignment

---

## Self-Review

### Spec Coverage
| Requirement | Task |
|-------------|------|
| Upload DOCX/PDF as template | Task 4 (upload view) |
| Parse template content | Existing `/api/templates` POST |
| AI detects fields | Existing POST + Task 4 shows results |
| Use `{{field_name}}` directly | Existing generate route |
| AI proposes fields for unstructured templates | Existing POST fallback |
| No generate immediately after upload | Task 4 — upload → setup, not generate |
| Setup step: fields, type, description, required | Task 4 (setup view) |
| User edits fields before save | Task 4 (setup view) + Task 2 (PUT endpoint) |
| Fill data after save | Task 4 (fill view) |
| Preview before generate | Task 4 (preview view) |
| Validate missing required fields | Task 4 (handleGenerate) + Task 3 (validate API) |
| Export DOCX/PDF only when data complete | Task 4 — export buttons only in preview |

### No gaps found. All 13 requirements covered.
