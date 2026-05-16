"use client";
import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

type Field = { name: string; label: string; type: string; required: boolean };
type Template = {
  id: string; name: string; category: string; description?: string;
  placeholders: Field[]; fileUrl: string; createdAt: string;
};
type View = "home" | "upload" | "setup" | "chat" | "fill" | "preview";
type ChatMsg = {
  role: "user" | "ai";
  text: string;
  form?: { templateId: string; templateName: string; fields: Field[]; prefilled: Record<string, string> };
  preview?: { html: string; templateId: string; templateName: string; fieldValues: Record<string, string> };
  attachment?: { name: string; type: "image" | "docx" };
};

const CATEGORIES = [
  "Hợp đồng dịch vụ", "Hợp đồng lao động", "Hợp đồng mua bán",
  "Hợp đồng thuê mặt bằng", "Hợp đồng hợp tác", "Hợp đồng KOL/KOC", "Khác",
];

export default function AppPage() {
  const [view, setView] = useState<View>("home");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Upload state
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState(CATEGORIES[0]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [bulkResults, setBulkResults] = useState<Array<{ name: string; success: boolean; error?: string }>>([]);

  // Setup state
  const [setupTemplate, setSetupTemplate] = useState<Template | null>(null);
  const [setupFields, setSetupFields] = useState<Field[]>([]);
  const [setupName, setSetupName] = useState("");
  const [setupCategory, setSetupCategory] = useState(CATEGORIES[0]);
  const [setupDescription, setSetupDescription] = useState("");
  const [setupSaving, setSetupSaving] = useState(false);

  // Fill state
  const [fillTemplate, setFillTemplate] = useState<Template | null>(null);
  const [fillValues, setFillValues] = useState<Record<string, string>>({});
  const [fillErrors, setFillErrors] = useState<string[]>([]);
  const [fillLoading, setFillLoading] = useState(false);

  // Chat state
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatGenerating, setChatGenerating] = useState(false); // generating contract after AI decides
  const [inlineFormValues, setInlineFormValues] = useState<Record<string, Record<string, string>>>({});
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null); // file staged, not yet sent
  const [isRecording, setIsRecording] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Preview state
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewFillValues, setPreviewFillValues] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);

  // Scroll chat to bottom when messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs, chatLoading]);

  useEffect(() => {
    fetch("/api/templates")
      .then(r => r.json())
      .then(data => { setTemplates(Array.isArray(data) ? data : []); setLoadingTemplates(false); })
      .catch(() => setLoadingTemplates(false));
  }, []);

  /* ── Upload template (single or bulk) ── */
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      setUploadError("Vui lòng chọn ít nhất 1 file DOCX.");
      return;
    }
    setUploadLoading(true); setUploadError(""); setBulkResults([]);

    const isBulk = uploadFiles.length > 1;
    const fd = new FormData();
    for (const f of uploadFiles) fd.append("file", f);
    fd.append("category", uploadCategory);
    if (!isBulk && uploadName.trim()) fd.append("name", uploadName.trim());

    try {
      const res = await fetch("/api/templates", { method: "POST", body: fd });
      let data: Record<string, unknown>;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) {
        setUploadError((data.error as string) ?? `Lỗi upload (${res.status}). Vui lòng thử lại.`);
        setUploadLoading(false); return;
      }

      if (isBulk || data.bulk) {
        // Bulk upload result
        const results = (data.results as Array<{ success: boolean; name: string; error?: string; template?: Template }>) ?? [];
        setBulkResults(results.map(r => ({ name: r.name, success: r.success, error: r.error })));
        const newTemplates = results.filter(r => r.success && r.template).map(r => r.template as Template);
        setTemplates(prev => [...newTemplates, ...prev]);
        if (results.every(r => r.success)) {
          // All success — go to setup for the first one
          const first = results[0];
          if (first?.template) {
            const tpl = first.template as Template;
            setSetupTemplate(tpl);
            setSetupFields((tpl.placeholders ?? []).map((p: Field) => ({ ...p, required: true })));
            setSetupName(tpl.name); setSetupCategory(tpl.category); setSetupDescription(tpl.description ?? "");
            setView("setup");
          } else { setView("home"); }
        }
        // If partial failure, stay on upload view to show results
      } else {
        // Single upload
        const tpl = data as unknown as Template;
        const fields: Field[] = (tpl.placeholders ?? []).map((p: Field) => ({ ...p, required: true }));
        setSetupTemplate(tpl);
        setSetupFields(fields);
        setSetupName(tpl.name);
        setSetupCategory(tpl.category);
        setSetupDescription(tpl.description ?? "");
        setTemplates(prev => [tpl, ...prev]);
        setView("setup");
      }
    } catch (err) {
      setUploadError(`Lỗi kết nối: ${String(err)}. Vui lòng thử lại.`);
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
    setTemplates(prev => prev.map(t => t.id === setupTemplate.id
      ? { ...t, name: setupName, category: setupCategory, description: setupDescription, placeholders: setupFields }
      : t
    ));
    setSetupSaving(false);
    setView("home");
  }

  /* ── Open setup for existing template ── */
  function openSetup(t: Template) {
    setSetupTemplate(t);
    setSetupFields((t.placeholders ?? []).map(p => ({ ...p, required: p.required ?? true })));
    setSetupName(t.name);
    setSetupCategory(t.category);
    setSetupDescription(t.description ?? "");
    setView("setup");
  }

  /* ── Start filling a contract ── */
  function startFill(t: Template) {
    setFillTemplate(t);
    setFillValues({});
    setFillErrors([]);
    setView("fill");
  }

  /* ── Generate preview ── */
  async function handleGenerate() {
    if (!fillTemplate) return;
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
      setPreviewFillValues({ ...fillValues });
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
      body: JSON.stringify({ templateId: previewTemplate.id, fieldValues: previewFillValues, contractName: previewTemplate.name }),
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
      body: JSON.stringify({ title, templateId: previewTemplate.id, fieldValues: previewFillValues }),
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

  /* ── Chat send ── */
  async function handleChatSend(text?: string) {
    const msg = (text ?? chatInput).trim();
    const stagedFile = text ? null : pendingFile; // suggestion chip calls skip file
    if (!msg && !stagedFile) return;
    if (chatLoading || chatGenerating) return;

    setChatInput("");
    if (stagedFile) setPendingFile(null);

    // Build history snapshot we can reference after async ops
    let historySnapshot = chatMsgs;
    let aiCommand = msg;

    // 1. Upload file first if staged
    if (stagedFile) {
      setUploadingFile(true);
      const userText = msg ? `📎 ${stagedFile.name} — ${msg}` : `📎 ${stagedFile.name}`;
      const userMsg: ChatMsg = { role: "user", text: userText, attachment: { name: stagedFile.name, type: stagedFile.name.endsWith(".docx") ? "docx" : "image" } };
      historySnapshot = [...historySnapshot, userMsg];
      setChatMsgs(historySnapshot);

      const fd = new FormData();
      fd.append("file", stagedFile);
      try {
        const res = await fetch("/api/ai/chat-upload", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok) {
          const aiMsg: ChatMsg = { role: "ai", text: data.message };
          historySnapshot = [...historySnapshot, aiMsg];
          setChatMsgs(historySnapshot);
          aiCommand = data.content ? `${data.content}${msg ? `\nYêu cầu: ${msg}` : ""}` : msg;
        } else {
          setChatMsgs(prev => [...prev, { role: "ai", text: `❌ Không đọc được file: ${data.error}` }]);
          setUploadingFile(false);
          return;
        }
      } catch {
        setChatMsgs(prev => [...prev, { role: "ai", text: "Lỗi đọc file." }]);
        setUploadingFile(false);
        return;
      }
      setUploadingFile(false);
    } else {
      // No file — just add user text message
      const userMsg: ChatMsg = { role: "user", text: msg };
      historySnapshot = [...historySnapshot, userMsg];
      setChatMsgs(historySnapshot);
    }

    setChatLoading(true);
    try {
      const res = await fetch("/api/ai/smart-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: aiCommand || msg,
          history: historySnapshot.map(m => {
            let text = m.text;
            if (m.form) {
              text += `\n[Form: ${m.form.templateName} — fields: ${m.form.fields.map(f => f.label).join(", ")}]`;
            }
            if (m.preview) {
              const filled = Object.entries(m.preview.fieldValues).filter(([,v]) => v).map(([k,v]) => `${k}=${v}`).join(", ");
              text += `\n[Hợp đồng đã tạo: ${m.preview.templateName}${filled ? ` — ${filled}` : ""}]`;
            }
            return { role: m.role === "user" ? "user" : "assistant" as const, text };
          }),
        }),
      });
      const data = await res.json();

      if (data.type === "direct") {
        setChatMsgs(prev => [...prev, { role: "ai", text: (data.message ?? "Được rồi! Đang tạo hợp đồng...") }]);
        setChatLoading(false);
        setChatGenerating(true);
        try {
          const genRes = await fetch("/api/contracts/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ templateId: data.templateId, fieldValues: data.fieldValues ?? {} }),
          });
          const { html } = await genRes.json();
          const tpl = templates.find(t => t.id === data.templateId) ?? { id: data.templateId, name: data.templateName ?? "Hợp đồng", category: "", description: "", placeholders: [], fileUrl: "", createdAt: "" };
          // Show preview inline in chat
          setChatMsgs(prev => [...prev, {
            role: "ai",
            text: "✅ Hợp đồng đã sẵn sàng! Bạn có thể xem bên dưới và xuất file.",
            preview: { html, templateId: data.templateId as string, templateName: (data.templateName as string) ?? tpl.name, fieldValues: data.fieldValues as Record<string, string> ?? {} },
          }]);
        } catch {
          setChatMsgs(prev => [...prev, { role: "ai", text: "Lỗi tạo hợp đồng. Bạn thử lại nhé!" }]);
        }
        setChatGenerating(false);
        return;
      } else if (data.type === "form") {
        setChatMsgs(prev => [...prev, { role: "ai", text: data.message ?? "Vui lòng điền thêm thông tin:", form: { templateId: data.templateId, templateName: data.templateName, fields: data.fields ?? [], prefilled: data.prefilled ?? {} } }]);
        // Pre-fill inline form values
        setInlineFormValues(prev => ({ ...prev, [data.templateId]: data.prefilled ?? {} }));
      } else {
        setChatMsgs(prev => [...prev, { role: "ai", text: data.message ?? "Bạn cần tôi giúp gì?" }]);
      }
    } catch {
      setChatMsgs(prev => [...prev, { role: "ai", text: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại." }]);
    }
    setChatLoading(false);
  }

  /* ── Submit inline chat form ── */
  async function handleInlineFormSubmit(templateId: string, templateName: string) {
    const values = inlineFormValues[templateId] ?? {};
    const valuesSummary = Object.entries(values).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(", ");
    setChatMsgs(prev => [...prev, { role: "user", text: `Đã điền thông tin: ${valuesSummary || "(trống)"}` }]);
    setChatLoading(true);
    setChatGenerating(true);
    try {
      const genRes = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, fieldValues: values }),
      });
      const { html } = await genRes.json();
      setChatMsgs(prev => [...prev, {
        role: "ai",
        text: "✅ Hợp đồng đã sẵn sàng! Xem và xuất file bên dưới.",
        preview: { html, templateId, templateName, fieldValues: values },
      }]);
    } catch {
      setChatMsgs(prev => [...prev, { role: "ai", text: "Lỗi tạo hợp đồng. Thử lại nhé!" }]);
    }
    setChatLoading(false);
    setChatGenerating(false);
  }

  // Stage file (from button or paste) — don't send yet
  function stageFile(file: File) {
    setPendingFile(file);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) stageFile(file);
  }

  // Start/stop voice recording
  function toggleVoice() {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { alert("Trình duyệt không hỗ trợ nhận diện giọng nói. Dùng Chrome nhé!"); return; }
    const recognition = new SR();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => {
      const transcript = e.results[0][0].transcript;
      setChatInput(prev => (prev ? prev + " " : "") + transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  function goUpload() {
    setUploadFiles([]); setUploadName(""); setUploadCategory(CATEGORIES[0]); setUploadError(""); setBulkResults([]);
    setView("upload");
  }

  function startChat(greeting?: string) {
    if (chatMsgs.length === 0) {
      const welcome = greeting ?? "Xin chào! Tôi là trợ lý AI của **Contract Faster** 👋\n\nTôi có thể giúp bạn:\n- **Tạo hợp đồng** chỉ bằng cách mô tả yêu cầu\n- **Điền tự động** thông tin vào template\n- **Trả lời câu hỏi** về hợp đồng\n\nBạn cần tạo loại hợp đồng gì hôm nay?";
      setChatMsgs([{ role: "ai", text: welcome }]);
    }
    setView("chat");
  }

  function renderMarkdown(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^[-•]\s+(.+)$/gm, "• $1")
      .replace(/\n/g, "<br>");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        :root {
          --blue:#3b6bff;--teal:#06b6d4;--ink:#0b1120;
          --bg:#f4f6fb;--white:#fff;
          --border:#e2e8f0;--border2:#cbd5e1;
          --t2:#475569;--t4:#94a3b8;
          --bsoft:#eff6ff;--bborder:#bfdbfe;
          --red:#ef4444;--green:#10b981;
          --r-sm:10px;--r-md:14px;--r-lg:20px;
          --sh-sm:0 1px 4px rgba(0,0,0,.06);
          --sh-md:0 4px 16px rgba(0,0,0,.08);
          --grad:linear-gradient(135deg,#3b6bff,#06b6d4);
          --sans:'Inter',system-ui,sans-serif;
          --display:'Sora',var(--sans);
        }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:var(--sans);background:var(--bg);color:var(--ink);min-height:100vh;}

        /* Nav */
        .nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);}
        .nav-inner{max-width:1200px;margin:0 auto;padding:0 24px;height:62px;display:flex;align-items:center;gap:8px;}
        .nav-logo{font-family:var(--display);font-weight:800;font-size:18px;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;cursor:pointer;margin-right:12px;letter-spacing:-.3px;}
        .nav-btn{padding:7px 14px;border-radius:var(--r-sm);font-size:13px;font-weight:500;border:none;background:transparent;color:var(--t2);cursor:pointer;transition:all .15s;}
        .nav-btn:hover,.nav-btn.active{background:var(--bsoft);color:var(--blue);}
        .nav-right{margin-left:auto;display:flex;gap:8px;align-items:center;}

        /* Layout */
        .page{max-width:1100px;margin:0 auto;padding:40px 24px;}
        .page-sm{max-width:740px;margin:0 auto;padding:40px 24px;}

        /* Card */
        .card{background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);padding:28px;box-shadow:var(--sh-sm);}

        /* Buttons */
        .btn-pri{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:var(--r-sm);font-size:14px;font-weight:600;background:var(--grad);color:#fff;border:none;cursor:pointer;transition:opacity .15s;white-space:nowrap;}
        .btn-pri:hover{opacity:.88;}
        .btn-pri:disabled{opacity:.5;cursor:not-allowed;}
        .btn-sec{display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:var(--r-sm);font-size:14px;font-weight:600;background:var(--white);color:var(--t2);border:1.5px solid var(--border2);cursor:pointer;transition:all .15s;white-space:nowrap;}
        .btn-sec:hover{border-color:var(--blue);color:var(--blue);}
        .btn-icon{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:var(--r-sm);font-size:15px;border:1.5px solid var(--border2);background:var(--white);cursor:pointer;transition:all .15s;}
        .btn-icon:hover{border-color:var(--blue);background:var(--bsoft);}
        .btn-icon.danger:hover{border-color:var(--red);background:#fff1f1;}

        /* Form */
        .form-group{margin-bottom:18px;}
        .form-label{display:block;font-size:13px;font-weight:600;color:var(--ink);margin-bottom:6px;}
        .form-label .req{color:var(--red);margin-left:2px;}
        .form-label .hint{color:var(--t4);font-size:11px;font-weight:400;margin-left:6px;}
        .form-input{width:100%;padding:10px 14px;border:1.5px solid var(--border2);border-radius:var(--r-sm);font-size:14px;font-family:var(--sans);background:var(--white);color:var(--ink);transition:border .15s;}
        .form-input:focus{outline:none;border-color:var(--blue);}
        .form-select{width:100%;padding:10px 14px;border:1.5px solid var(--border2);border-radius:var(--r-sm);font-size:14px;font-family:var(--sans);background:var(--white);color:var(--ink);}
        .form-textarea{width:100%;padding:10px 14px;border:1.5px solid var(--border2);border-radius:var(--r-sm);font-size:14px;font-family:var(--sans);background:var(--white);color:var(--ink);resize:vertical;min-height:80px;}

        /* Steps */
        .steps{display:flex;align-items:center;margin-bottom:36px;}
        .step{display:flex;align-items:center;gap:8px;}
        .step-dot{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;}
        .step-dot.done{background:var(--grad);color:#fff;}
        .step-dot.active{background:var(--blue);color:#fff;box-shadow:0 0 0 4px #3b6bff22;}
        .step-dot.pending{background:var(--border);color:var(--t4);}
        .step-label{font-size:12px;font-weight:600;color:var(--t4);white-space:nowrap;}
        .step-label.active{color:var(--blue);}
        .step-label.done{color:var(--t2);}
        .step-line{flex:1;height:2px;background:var(--border);margin:0 10px;min-width:20px;}
        .step-line.done{background:var(--grad);}

        /* Template grid */
        .tpl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;}
        .tpl-card{background:var(--white);border:1.5px solid var(--border);border-radius:var(--r-md);padding:22px;transition:all .2s;display:flex;flex-direction:column;gap:10px;}
        .tpl-card:hover{border-color:var(--blue);box-shadow:var(--sh-md);transform:translateY(-2px);}
        .tpl-cat{font-size:11px;color:var(--blue);font-weight:700;background:var(--bsoft);padding:3px 10px;border-radius:20px;display:inline-block;text-transform:uppercase;letter-spacing:.4px;}
        .tpl-name{font-size:15px;font-weight:700;color:var(--ink);line-height:1.3;text-transform:none;}
        .tpl-desc{font-size:13px;color:var(--t2);line-height:1.5;}
        .tpl-meta{display:flex;gap:12px;font-size:12px;color:var(--t4);}
        .tpl-actions{display:flex;gap:8px;margin-top:4px;}

        /* Field editor */
        .field-row{display:grid;grid-template-columns:1fr 140px 100px 34px;gap:8px;align-items:start;padding:14px;background:var(--bg);border-radius:var(--r-sm);border:1px solid var(--border);margin-bottom:8px;}
        .field-name-tag{font-size:11px;font-weight:700;color:var(--t4);font-family:monospace;background:#f1f5f9;padding:3px 8px;border-radius:6px;margin-bottom:6px;display:inline-block;}
        .required-toggle{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--t2);cursor:pointer;padding-top:4px;}
        .required-toggle input{width:15px;height:15px;cursor:pointer;accent-color:var(--blue);}

        /* Preview */
        .doc-paper{background:white;color:#1e293b;border-radius:8px;padding:52px 56px;font-size:13.5px;line-height:1.85;font-family:'Times New Roman',Times,serif;box-shadow:0 2px 20px rgba(0,0,0,.07);}
        .doc-paper h1,.doc-paper h2,.doc-paper h3{color:#0f172a;margin:16px 0 8px;font-weight:700;}
        .doc-paper p{margin-bottom:9px;}
        .doc-paper p:not([style*="text-align"]){text-align:justify;}
        .doc-paper table{border-collapse:collapse;width:100%;margin:12px 0;}
        .doc-paper td,.doc-paper th{border:1px solid #e2e8f0;padding:8px 12px;}

        /* Alerts */
        .alert-err{background:#fff1f1;border:1px solid #fecaca;border-radius:var(--r-sm);padding:12px 16px;color:var(--red);font-size:13px;margin-bottom:16px;line-height:1.5;}

        /* Drop zone */
        .drop-zone{border:2px dashed var(--border2);border-radius:var(--r-md);padding:48px 24px;text-align:center;transition:all .2s;cursor:pointer;background:var(--bg);}
        .drop-zone:hover,.drop-zone.has-file{border-color:var(--blue);background:var(--bsoft);}

        /* Chat */
        .chat-wrap{max-width:800px;margin:0 auto;padding:0 24px;display:flex;flex-direction:column;height:calc(100vh - 62px);overflow:hidden;}
        .chat-msgs{flex:1;overflow-y:auto;padding:24px 0 16px;display:flex;flex-direction:column;gap:16px;min-height:0;}
        .chat-bubble{max-width:80%;padding:14px 18px;border-radius:18px;font-size:14px;line-height:1.6;white-space:pre-wrap;}
        .chat-bubble.user{background:var(--grad);color:#fff;align-self:flex-end;border-bottom-right-radius:4px;}
        .chat-bubble.ai{background:var(--white);border:1px solid var(--border);color:var(--ink);align-self:flex-start;border-bottom-left-radius:4px;box-shadow:var(--sh-sm);}
        .chat-input-row{display:flex;gap:8px;padding:12px 0 20px;border-top:1px solid var(--border);flex-shrink:0;align-items:flex-end;}
        .chat-input{flex:1;padding:12px 16px;border:1.5px solid var(--border2);border-radius:16px;font-size:14px;font-family:var(--sans);outline:none;resize:none;background:var(--white);height:48px;max-height:160px;line-height:1.5;overflow:hidden;scrollbar-width:none;}
        .chat-input::-webkit-scrollbar{display:none;}
        .chat-input:focus{border-color:var(--blue);}
        .chat-send{width:44px;height:44px;border-radius:50%;background:var(--grad);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;transition:opacity .15s;}
        .chat-send:hover{opacity:.85;}
        .chat-send:disabled{opacity:.4;cursor:not-allowed;}
        .chat-attach{width:40px;height:40px;border-radius:50%;background:var(--white);color:var(--t2);border:1.5px solid var(--border2);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;transition:all .15s;}
        .chat-attach:hover{border-color:var(--blue);color:var(--blue);}
        .chat-attach:disabled{opacity:.4;cursor:not-allowed;}
        .chat-empty{text-align:center;padding:60px 24px 24px;}
        .chat-suggestion{display:inline-block;padding:8px 16px;background:var(--white);border:1.5px solid var(--bborder);border-radius:20px;font-size:13px;color:var(--blue);cursor:pointer;transition:all .15s;margin:4px;}
        .chat-suggestion:hover{background:var(--bsoft);}
        .inline-form{background:var(--bg);border:1px solid var(--border);border-radius:var(--r-md);padding:18px;margin-top:12px;}
        .preview-card{background:var(--white);border:1px solid var(--border);border-radius:var(--r-md);margin-top:12px;overflow:hidden;max-width:100%;}
        .preview-card-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg);}
        .preview-card-body{max-height:400px;overflow-y:auto;padding:24px 28px;font-family:'Times New Roman',Times,serif;font-size:13px;line-height:1.8;color:#1e293b;}
        .preview-card-body p:not([style*="text-align"]){text-align:justify;}
        .preview-card-body p{margin-bottom:8px;}
        .preview-card-body table{border-collapse:collapse;width:100%;margin:8px 0;}
        .preview-card-body td,.preview-card-body th{border:1px solid #e2e8f0;padding:6px 10px;font-size:12px;}

        /* Page header */
        .page-header{margin-bottom:28px;}
        .page-title{font-family:var(--display);font-size:24px;font-weight:800;color:var(--ink);}
        .page-sub{font-size:14px;color:var(--t2);margin-top:4px;}

        /* Empty */
        .empty{text-align:center;padding:72px 24px;}
        .empty-icon{font-size:52px;margin-bottom:16px;}
        .empty-title{font-size:20px;font-weight:700;color:var(--ink);margin-bottom:8px;}
        .empty-sub{font-size:14px;color:var(--t2);margin-bottom:24px;}

        /* Badge */
        .badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;display:inline-block;}
        .badge-req{background:#fef2f2;color:var(--red);}
        .badge-opt{background:#f0fdf4;color:var(--green);}

        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @media(max-width:600px){
          .page,.page-sm{padding:24px 16px;}
          .doc-paper{padding:28px 20px;}
          .field-row{grid-template-columns:1fr 1fr;grid-template-rows:auto auto;}
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => setView("home")}>⚡ Contract Faster</div>
          <button className={`nav-btn ${view === "home" ? "active" : ""}`} onClick={() => setView("home")}>🏠 Templates</button>
          <button className={`nav-btn ${view === "chat" ? "active" : ""}`} onClick={() => startChat()}>💬 Tạo hợp đồng</button>
          <button className={`nav-btn ${view === "upload" ? "active" : ""}`} onClick={goUpload}>📤 Upload</button>
          <div className="nav-right">
            <button className="btn-pri" onClick={() => startChat()}>💬 Tạo hợp đồng mới</button>
          </div>
        </div>
      </nav>

      {/* ── HOME ── */}
      {view === "home" && (
        <div className="page">
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:28 }}>
            <div>
              <div className="page-title">Mẫu hợp đồng của bạn</div>
              <div className="page-sub">Upload template DOCX → AI nhận diện field → Điền thông tin → Xuất hợp đồng</div>
            </div>
            <button className="btn-pri" onClick={goUpload}>📤 Upload Template mới</button>
          </div>

          {/* Flow steps banner */}
          <div style={{ background:"var(--white)", border:"1px solid var(--border)", borderRadius:"var(--r-md)", padding:"16px 24px", marginBottom:28, display:"flex", alignItems:"center", gap:0 }}>
            {["📤 Upload Template","🔍 AI Phân tích","⚙️ Cấu hình Fields","✍️ Nhập dữ liệu","👁️ Xem trước","📄 Xuất PDF/DOCX"].map((s, i, arr) => (
              <React.Fragment key={i}>
                <div style={{ fontSize:12, fontWeight:600, color:"var(--t2)", whiteSpace:"nowrap" }}>{s}</div>
                {i < arr.length - 1 && <div style={{ flex:1, height:1, background:"var(--border)", margin:"0 10px", minWidth:12 }} />}
              </React.Fragment>
            ))}
          </div>

          {loadingTemplates ? (
            <div style={{ textAlign:"center", padding:60, color:"var(--t4)" }}>
              <Loader2 size={32} style={{ animation:"spin 1s linear infinite", margin:"0 auto 12px", display:"block" }} />
              <div>Đang tải...</div>
            </div>
          ) : templates.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📄</div>
              <div className="empty-title">Chưa có template nào</div>
              <div className="empty-sub">Upload file DOCX làm mẫu hợp đồng để bắt đầu tạo hợp đồng tự động</div>
              <button className="btn-pri" onClick={goUpload}>📤 Upload Template đầu tiên</button>
            </div>
          ) : (
            <div className="tpl-grid">
              {templates.map(t => (
                <div key={t.id} className="tpl-card">
                  <div><span className="tpl-cat">{t.category}</span></div>
                  <div className="tpl-name">{t.name}</div>
                  {t.description && <div className="tpl-desc">{t.description}</div>}
                  <div className="tpl-meta">
                    <span>📋 {(t.placeholders ?? []).length} trường</span>
                    <span>🔴 {(t.placeholders ?? []).filter(p => p.required).length} bắt buộc</span>
                  </div>
                  <div className="tpl-actions">
                    <button className="btn-pri" style={{ flex:1, justifyContent:"center" }}
                      onClick={() => startChat(`Bạn muốn tạo hợp đồng **"${t.name}"** đúng không? 😊\n\nHãy cho tôi biết thêm thông tin:\n• Tên các bên ký kết\n• Giá trị hợp đồng (nếu có)\n• Thời gian thực hiện\n\nHoặc bạn cứ mô tả tự nhiên, tôi sẽ hỏi thêm từng bước!`)}>
                      💬 Tạo bằng AI
                    </button>
                    <button className="btn-sec" style={{ padding:"9px 12px", fontSize:12 }} title="Điền thủ công" onClick={() => startFill(t)}>✍️</button>
                    <button className="btn-icon" title="Chỉnh sửa fields" onClick={() => openSetup(t)}>⚙️</button>
                    <button className="btn-icon danger" title="Xoá template" onClick={() => handleDelete(t.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CHAT ── */}
      {view === "chat" && (
        <div className="chat-wrap">
          <div className="chat-msgs">
            {chatMsgs.length === 0 && (
              <div className="chat-empty">
                <div style={{ fontSize:52, marginBottom:16 }}>💬</div>
                <div style={{ fontFamily:"var(--display)", fontSize:22, fontWeight:800, color:"var(--ink)", marginBottom:8 }}>Tạo hợp đồng bằng AI</div>
                <div style={{ fontSize:14, color:"var(--t2)", marginBottom:24, lineHeight:1.6 }}>
                  Nhắn tin mô tả hợp đồng bạn cần.<br/>
                  AI sẽ tự chọn template và điền thông tin.
                </div>
                {templates.length === 0 ? (
                  <div style={{ background:"#fff8f0", border:"1px solid #fed7aa", borderRadius:"var(--r-md)", padding:"16px 20px", fontSize:14, color:"#c2410c", maxWidth:420, margin:"0 auto" }}>
                    ⚠️ Bạn chưa có template nào. <button style={{ color:"var(--blue)", background:"none", border:"none", cursor:"pointer", fontWeight:600, fontSize:14 }} onClick={goUpload}>Upload template DOCX</button> trước nhé.
                  </div>
                ) : (
                  <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:0 }}>
                    {[
                      "Tạo hợp đồng KOL cho TikTok",
                      "Làm hợp đồng thuê nhân viên marketing",
                      "Tạo hợp đồng dịch vụ với khách hàng",
                      "Hợp đồng hợp tác kinh doanh",
                    ].map(s => (
                      <button key={s} className="chat-suggestion" onClick={() => handleChatSend(s)}>{s}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {chatMsgs.map((m, i) => (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div className={`chat-bubble ${m.role === "user" ? "user" : "ai"}`}>
                  {m.role === "user"
                    ? m.text
                    : <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
                  }
                </div>
                {/* Inline form inside AI message */}
                {m.form && (
                  <div className="inline-form" style={{ alignSelf:"flex-start", width:"100%", maxWidth:600 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:"var(--t2)", marginBottom:12 }}>
                      📋 {m.form.templateName}
                    </div>
                    {m.form.fields.map(f => (
                      <div key={f.name} className="form-group">
                        <label className="form-label" style={{ fontSize:12 }}>
                          {f.label}
                          {f.required && <span className="req"> *</span>}
                        </label>
                        <input
                          type={f.type === "date" ? "date" : f.type === "email" ? "email" : "text"}
                          className="form-input" style={{ fontSize:13 }}
                          value={inlineFormValues[m.form!.templateId]?.[f.name] ?? m.form!.prefilled[f.name] ?? ""}
                          placeholder={`Nhập ${f.label.toLowerCase()}...`}
                          onChange={e => setInlineFormValues(prev => ({
                            ...prev,
                            [m.form!.templateId]: { ...prev[m.form!.templateId], [f.name]: e.target.value }
                          }))}
                        />
                      </div>
                    ))}
                    <button className="btn-pri" style={{ marginTop:4 }}
                      onClick={() => handleInlineFormSubmit(m.form!.templateId, m.form!.templateName)}>
                      👁️ Xem trước hợp đồng →
                    </button>
                  </div>
                )}
                {m.preview && (
                  <div className="preview-card" style={{ alignSelf:"flex-start", width:"100%" }}>
                    <div className="preview-card-header">
                      <span style={{ fontWeight:700, fontSize:13, color:"var(--ink)" }}>📄 {m.preview.templateName}</span>
                      <div style={{ display:"flex", gap:8 }}>
                        <button className="btn-sec" style={{ fontSize:12, padding:"5px 12px" }}
                          onClick={() => {
                            const win = window.open("", "_blank");
                            if (!win) { alert("Vui lòng cho phép popup"); return; }
                            win.document.write("<html><body>" + m.preview!.html + "<script>window.print();<\/script></body></html>");
                            win.document.close();
                          }}>📄 PDF</button>
                        <button className="btn-pri" style={{ fontSize:12, padding:"5px 12px" }}
                          onClick={async () => {
                            const title = m.preview!.templateName + " - " + new Date().toLocaleDateString("vi-VN");
                            const cr = await fetch("/api/contracts", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ title, templateId: m.preview!.templateId, fieldValues: m.preview!.fieldValues }) });
                            if (!cr.ok) { alert("Lỗi lưu"); return; }
                            const { id } = await cr.json();
                            const er = await fetch(`/api/contracts/${id}/export`, { method:"POST" });
                            if (er.ok) {
                              const blob = await er.blob();
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a"); a.href = url;
                              a.download = title.replace(/[^a-zA-Z0-9]/g, "_") + ".docx"; a.click();
                              URL.revokeObjectURL(url);
                            }
                          }}>⬇️ DOCX</button>
                      </div>
                    </div>
                    <div className="preview-card-body" dangerouslySetInnerHTML={{ __html: m.preview.html }} />
                  </div>
                )}
              </div>
            ))}

            {(chatLoading || chatGenerating) && (
              <div style={{ alignSelf:"flex-start" }}>
                <div className="chat-bubble ai" style={{ display:"flex", gap:6, alignItems:"center", color:"var(--t4)", fontSize:13 }}>
                  {chatGenerating ? (
                    <><Loader2 size={14} style={{ animation:"spin 1s linear infinite" }} /> Đang tạo hợp đồng...</>
                  ) : (
                    <>
                      <span style={{ animation:"bounce 1s infinite", display:"inline-block" }}>●</span>
                      <span style={{ animation:"bounce 1s .2s infinite", display:"inline-block" }}>●</span>
                      <span style={{ animation:"bounce 1s .4s infinite", display:"inline-block" }}>●</span>
                    </>
                  )}
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <div className="chat-input-row">
            <input ref={fileInputRef} type="file" accept=".docx,image/*" style={{ display:"none" }}
              onChange={handleFileInputChange} />
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
              {pendingFile && (
                <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--bsoft)", border:"1px solid var(--bborder)", borderRadius:10, padding:"6px 10px", fontSize:12 }}>
                  <span>{pendingFile.name.endsWith(".docx") ? "📄" : "🖼️"}</span>
                  <span style={{ flex:1, color:"var(--blue)", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{pendingFile.name}</span>
                  <button onClick={() => setPendingFile(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t4)", fontSize:16, lineHeight:1 }}>×</button>
                </div>
              )}
              <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
                <button className="chat-attach" disabled={chatLoading || chatGenerating || uploadingFile}
                  onClick={() => fileInputRef.current?.click()} title="Đính kèm file hoặc ảnh">
                  {uploadingFile ? <Loader2 size={16} style={{ animation:"spin 1s linear infinite" }} /> : "📎"}
                </button>
                <textarea
                  className="chat-input"
                  rows={1}
                  value={chatInput}
                  placeholder={pendingFile ? "Thêm mô tả (tuỳ chọn) rồi gửi..." : "Nhắn tin, paste ảnh hoặc kéo file vào đây..."}
                  onChange={e => {
                    setChatInput(e.target.value);
                    const ta = e.target;
                    ta.style.height = "0";
                    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
                  }}
                  onPaste={e => {
                    const items = Array.from(e.clipboardData?.items ?? []);
                    const fileItem = items.find(i => i.kind === "file");
                    if (fileItem) {
                      const f = fileItem.getAsFile();
                      if (f) { e.preventDefault(); stageFile(f); }
                    }
                  }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) stageFile(f);
                  }}
                />
                <button className="chat-attach"
                  disabled={chatLoading || chatGenerating}
                  onClick={toggleVoice}
                  title={isRecording ? "Dừng ghi âm" : "Nhập bằng giọng nói (vi-VN)"}
                  style={{ background: isRecording ? "#fef2f2" : undefined, borderColor: isRecording ? "#ef4444" : undefined, color: isRecording ? "#ef4444" : undefined }}>
                  {isRecording ? "🔴" : "🎤"}
                </button>
                <button className="chat-send" disabled={chatLoading || chatGenerating || uploadingFile || (!chatInput.trim() && !pendingFile)} onClick={() => handleChatSend()}>
                  {chatLoading ? <Loader2 size={18} style={{ animation:"spin 1s linear infinite" }} /> : "↑"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOAD ── */}
      {view === "upload" && (
        <div className="page-sm">
          <StepBar current={0} />
          <div className="page-header">
            <div className="page-title">Upload Template</div>
            <div className="page-sub">Upload file DOCX làm mẫu hợp đồng. AI sẽ tự động nhận diện các trường cần điền.</div>
          </div>
          <div className="card">
            <form onSubmit={handleUpload}>
              {/* Bulk results */}
              {bulkResults.length > 0 && (
                <div style={{ marginBottom:16, border:"1px solid var(--border)", borderRadius:"var(--r-sm)", overflow:"hidden" }}>
                  {bulkResults.map((r, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderBottom: i < bulkResults.length - 1 ? "1px solid var(--border)" : "none", background: r.success ? "#f0fdf4" : "#fff1f1" }}>
                      <span style={{ fontSize:16 }}>{r.success ? "✅" : "❌"}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)" }}>{r.name}</div>
                        {r.error && <div style={{ fontSize:12, color:"var(--red)", marginTop:2 }}>{r.error}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {uploadFiles.length <= 1 && (
                <div className="form-group">
                  <label className="form-label">Tên template {uploadFiles.length === 1 && <span className="req">*</span>}
                    {uploadFiles.length > 1 && <span className="hint">(tự động từ tên file khi upload nhiều)</span>}
                  </label>
                  <input className="form-input" value={uploadName} onChange={e => setUploadName(e.target.value)}
                    placeholder="VD: Hợp đồng dịch vụ marketing" />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Loại hợp đồng <span className="req">*</span></label>
                <select className="form-select" value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  File DOCX <span className="req">*</span>
                  <span className="hint">Chọn nhiều file để upload hàng loạt</span>
                </label>
                <label className={`drop-zone ${uploadFiles.length > 0 ? "has-file" : ""}`} style={{ display:"block" }}>
                  <input type="file" accept=".docx" multiple style={{ display:"none" }} onChange={e => {
                    const files = Array.from(e.target.files ?? []);
                    setUploadFiles(files);
                    if (files.length === 1 && !uploadName)
                      setUploadName(files[0].name.replace(/\.docx$/i, "").replace(/[_-]/g, " "));
                    setBulkResults([]);
                  }} />
                  {uploadFiles.length > 0 ? (
                    <>
                      <div style={{ fontSize:36, marginBottom:8 }}>{uploadFiles.length > 1 ? "📚" : "✅"}</div>
                      {uploadFiles.length === 1 ? (
                        <>
                          <div style={{ fontWeight:700, color:"var(--ink)", fontSize:15 }}>{uploadFiles[0].name}</div>
                          <div style={{ fontSize:13, color:"var(--t4)", marginTop:4 }}>{(uploadFiles[0].size / 1024).toFixed(0)} KB • Click để đổi file</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontWeight:700, color:"var(--ink)", fontSize:15 }}>{uploadFiles.length} files đã chọn</div>
                          <div style={{ fontSize:12, color:"var(--t4)", marginTop:6 }}>
                            {uploadFiles.map(f => f.name).join(" • ")}
                          </div>
                          <div style={{ fontSize:12, color:"var(--t4)", marginTop:4 }}>Click để thay đổi</div>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:44, marginBottom:12 }}>📄</div>
                      <div style={{ fontWeight:700, fontSize:15, color:"var(--ink)" }}>Kéo thả hoặc click để chọn file</div>
                      <div style={{ fontSize:13, color:"var(--t4)", marginTop:6, lineHeight:1.5 }}>
                        Hỗ trợ file .DOCX • Có thể chọn nhiều file cùng lúc<br/>
                        Dùng biến <code style={{ background:"#f1f5f9", padding:"1px 5px", borderRadius:4 }}>{`{{ten_bien}}`}</code> hoặc chỗ trống <code style={{ background:"#f1f5f9", padding:"1px 5px", borderRadius:4 }}>…………</code>
                      </div>
                    </>
                  )}
                </label>
              </div>
              {uploadError && <div className="alert-err">⚠️ {uploadError}</div>}
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
                <button type="button" className="btn-sec" onClick={() => setView("home")}>Huỷ</button>
                <button type="submit" className="btn-pri" disabled={uploadLoading}>
                  {uploadLoading
                    ? <><Loader2 size={15} style={{ animation:"spin 1s linear infinite" }} /> AI đang phân tích{uploadFiles.length > 1 ? ` ${uploadFiles.length} templates` : " template"}...</>
                    : uploadFiles.length > 1 ? `📤 Upload ${uploadFiles.length} templates →` : "Phân tích template →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SETUP ── */}
      {view === "setup" && setupTemplate && (
        <div className="page-sm">
          <StepBar current={1} />
          <div className="page-header">
            <div className="page-title">Cấu hình Template</div>
            <div className="page-sub">Xem lại các trường AI phát hiện. Chỉnh nhãn, kiểu dữ liệu và đánh dấu trường bắt buộc.</div>
          </div>

          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:16, color:"var(--ink)" }}>Thông tin template</div>
            <div className="form-group">
              <label className="form-label">Tên template</label>
              <input className="form-input" value={setupName} onChange={e => setSetupName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Loại hợp đồng</label>
              <select className="form-select" value={setupCategory} onChange={e => setSetupCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Mô tả <span className="hint">(tuỳ chọn)</span></label>
              <textarea className="form-textarea" value={setupDescription}
                onChange={e => setSetupDescription(e.target.value)}
                placeholder="VD: Hợp đồng dịch vụ quảng cáo KOC TikTok, áp dụng cho chiến dịch..." />
            </div>
          </div>

          <div className="card">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:"var(--ink)" }}>
                  Trường dữ liệu <span style={{ color:"var(--t4)", fontWeight:400, fontSize:13 }}>({setupFields.length} trường)</span>
                </div>
                <div style={{ fontSize:12, color:"var(--t4)", marginTop:2 }}>
                  AI đã phát hiện các trường từ template. Bạn có thể chỉnh sửa hoặc thêm/xoá.
                </div>
              </div>
              <button className="btn-sec" style={{ fontSize:12, padding:"6px 12px" }}
                onClick={() => setSetupFields(prev => [...prev, { name: `field_${Date.now()}`, label:"Trường mới", type:"text", required:false }])}>
                + Thêm trường
              </button>
            </div>

            {setupFields.length === 0 && (
              <div style={{ padding:"32px 0", textAlign:"center", color:"var(--t4)", fontSize:14, background:"var(--bg)", borderRadius:"var(--r-sm)" }}>
                <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
                Không phát hiện trường cụ thể. AI sẽ điền thông minh dựa theo ngữ cảnh template.
              </div>
            )}

            {setupFields.map((f, i) => (
              <div key={i} className="field-row">
                <div>
                  <div className="field-name-tag">{`{{${f.name}}}`}</div>
                  <input className="form-input" style={{ fontSize:13 }} value={f.label}
                    placeholder="Nhãn hiển thị"
                    onChange={e => setSetupFields(prev => prev.map((x, j) => j === i ? { ...x, label:e.target.value } : x))} />
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:"var(--t4)", marginBottom:6 }}>Kiểu dữ liệu</div>
                  <select className="form-select" style={{ fontSize:13 }} value={f.type}
                    onChange={e => setSetupFields(prev => prev.map((x, j) => j === i ? { ...x, type:e.target.value } : x))}>
                    <option value="text">Văn bản</option>
                    <option value="date">Ngày tháng</option>
                    <option value="number">Số tiền / Số</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:"var(--t4)", marginBottom:8 }}>Bắt buộc?</div>
                  <label className="required-toggle">
                    <input type="checkbox" checked={f.required}
                      onChange={e => setSetupFields(prev => prev.map((x, j) => j === i ? { ...x, required:e.target.checked } : x))} />
                    {f.required ? <span style={{ color:"var(--red)" }}>Bắt buộc</span> : <span>Tuỳ chọn</span>}
                  </label>
                </div>
                <button style={{ background:"none", border:"none", color:"var(--red)", cursor:"pointer", fontSize:20, paddingTop:4, alignSelf:"flex-start" }}
                  onClick={() => setSetupFields(prev => prev.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20, paddingTop:16, borderTop:"1px solid var(--border)" }}>
              <button className="btn-sec" onClick={() => setView("home")}>← Về Dashboard</button>
              <button className="btn-pri" onClick={handleSetupSave} disabled={setupSaving}>
                {setupSaving
                  ? <><Loader2 size={15} style={{ animation:"spin 1s linear infinite" }} /> Đang lưu...</>
                  : "💾 Lưu Template →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FILL ── */}
      {view === "fill" && fillTemplate && (
        <div className="page-sm">
          <StepBar current={2} />
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:28 }}>
            <div>
              <div className="page-title">Nhập thông tin hợp đồng</div>
              <div className="page-sub">Template: <strong>{fillTemplate.name}</strong></div>
            </div>
            <button className="btn-sec" onClick={() => setView("home")}>← Chọn template khác</button>
          </div>

          <div className="card">
            {(fillTemplate.placeholders ?? []).length === 0 ? (
              <div style={{ padding:"24px 0", textAlign:"center", color:"var(--t2)", fontSize:14 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🤖</div>
                Template này không có trường cố định. AI sẽ điền thông minh dựa theo ngữ cảnh.
              </div>
            ) : (
              (fillTemplate.placeholders ?? []).map(f => (
                <div key={f.name} className="form-group">
                  <label className="form-label">
                    {f.label}
                    {f.required ? <span className="req"> *</span> : <span className="hint"> (tuỳ chọn)</span>}
                    <span className="hint">{`{{${f.name}}}`}</span>
                  </label>
                  {f.type === "date" ? (
                    <input type="date" className="form-input"
                      value={fillValues[f.name] ?? ""}
                      onChange={e => setFillValues(prev => ({ ...prev, [f.name]:e.target.value }))} />
                  ) : f.type === "number" ? (
                    <input type="text" inputMode="numeric" className="form-input"
                      value={fillValues[f.name] ?? ""}
                      placeholder={`Nhập ${f.label.toLowerCase()}...`}
                      onChange={e => setFillValues(prev => ({ ...prev, [f.name]:e.target.value }))} />
                  ) : f.type === "email" ? (
                    <input type="email" className="form-input"
                      value={fillValues[f.name] ?? ""}
                      placeholder={`Nhập ${f.label.toLowerCase()}...`}
                      onChange={e => setFillValues(prev => ({ ...prev, [f.name]:e.target.value }))} />
                  ) : (
                    <input type="text" className="form-input"
                      value={fillValues[f.name] ?? ""}
                      placeholder={`Nhập ${f.label.toLowerCase()}...`}
                      onChange={e => setFillValues(prev => ({ ...prev, [f.name]:e.target.value }))} />
                  )}
                </div>
              ))
            )}

            {fillErrors.length > 0 && (
              <div className="alert-err">
                <strong>⚠️ Vui lòng điền đầy đủ các trường bắt buộc sau:</strong>
                <ul style={{ marginTop:6, paddingLeft:18 }}>
                  {fillErrors.map(e => <li key={e} style={{ marginTop:2 }}>{e}</li>)}
                </ul>
              </div>
            )}

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8, paddingTop:16, borderTop:"1px solid var(--border)" }}>
              <button className="btn-sec" onClick={() => setView("home")}>Huỷ</button>
              <button className="btn-pri" onClick={handleGenerate} disabled={fillLoading}>
                {fillLoading
                  ? <><Loader2 size={15} style={{ animation:"spin 1s linear infinite" }} /> Đang tạo hợp đồng...</>
                  : "👁️ Xem trước hợp đồng →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {view === "preview" && (
        <div className="page">
          <StepBar current={3} />
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
            <div>
              <div className="page-title">Xem trước hợp đồng</div>
              <div className="page-sub">{previewTemplate?.name} • Kiểm tra nội dung trước khi xuất</div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-sec" onClick={() => setView("fill")}>← Chỉnh sửa dữ liệu</button>
              <button className="btn-sec" style={{ borderColor:"var(--red)", color:"var(--red)" }} onClick={handleExportPdf}>
                📄 Xuất PDF
              </button>
              <button className="btn-pri" onClick={handleExportDocx} disabled={exporting}>
                {exporting
                  ? <><Loader2 size={15} style={{ animation:"spin 1s linear infinite" }} /> Đang xuất...</>
                  : "⬇️ Tải DOCX"}
              </button>
            </div>
          </div>
          <div className="doc-paper" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      )}
    </>
  );
}

/* ── Step indicator ── */
function StepBar({ current }: { current: number }) {
  const steps = ["Upload Template", "Cấu hình Fields", "Nhập dữ liệu", "Xem trước & Xuất"];
  return (
    <div className="steps">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className="step">
            <div className={`step-dot ${i < current ? "done" : i === current ? "active" : "pending"}`}>
              {i < current ? "✓" : i + 1}
            </div>
            <span className={`step-label ${i === current ? "active" : i < current ? "done" : ""}`}>{s}</span>
          </div>
          {i < steps.length - 1 && <div className={`step-line ${i < current ? "done" : ""}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}
