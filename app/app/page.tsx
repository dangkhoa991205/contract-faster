"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Send, Mic, MicOff, Loader2, Download, Eye, CheckCircle2, Circle,
  FileText, Trash2, Upload, X, ChevronRight, Sparkles,
  ArrowRight, BookOpen, LayoutGrid, Zap, Shield, Clock,
} from "lucide-react";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type Placeholder = { name: string; label: string; type: string };
type Template = { id: string; name: string; category: string; placeholders: Placeholder[] };
type ContractData = {
  templateId: string; templateName: string;
  placeholders: Placeholder[];
  filled: Record<string, string>;
  missing: string[];
  previewHtml?: string;
};
type Field = { name: string; label: string; type: string };
type Message = {
  id: string; role: "user" | "assistant";
  text?: string;
  contract?: ContractData;
  isLoading?: boolean;
  showTemplateSelect?: boolean;
  showTemplates?: Template[];
  formTemplateId?: string;
  formTemplateName?: string;
  formFields?: Field[];
  formPrefilled?: Record<string, string>;
  previewHtmlInline?: string;
};

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const DEMO_MESSAGES = [
  { user: "Tạo hợp đồng KOC cho Nguyễn Thị Lan, phí 8 triệu, chiến dịch TH True Milk", ai: "Đã tạo Hợp đồng Hợp tác KOC — điền 9/11 trường ✓" },
  { user: "Hợp đồng lao động marketing, lương 15 triệu, thử việc 2 tháng", ai: "Đã tạo Hợp đồng Lao động — điền 12/14 trường ✓" },
  { user: "Hợp đồng thiết kế website 25 triệu, deadline 30 ngày", ai: "Đã tạo Hợp đồng Dịch vụ — điền 8/10 trường ✓" },
];

const SUGGESTIONS = [
  { icon: "📋", label: "Hợp đồng lao động", desc: "Nhân viên chính thức, thử việc" },
  { icon: "🤝", label: "Hợp đồng KOC/KOL", desc: "Hợp tác influencer, quảng cáo" },
  { icon: "💼", label: "Hợp đồng dịch vụ", desc: "Freelancer, cộng tác viên" },
  { icon: "🏢", label: "Hợp đồng thuê mặt bằng", desc: "Văn phòng, cơ sở kinh doanh" },
];

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
type View = "hero" | "chat" | "templates" | "create";

export default function AppPage() {
  const [view, setView] = useState<View>("hero");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [previewModal, setPreviewModal] = useState<ContractData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportedIds, setExportedIds] = useState<Set<string>>(new Set());
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, "pending" | "done" | "error">>({});
  const [dragOver, setDragOver] = useState(false);
  const [demoIdx, setDemoIdx] = useState(0);
  const [demoVisible, setDemoVisible] = useState(true);

  // Create flow state
  const [createStep, setCreateStep] = useState<"select" | "form">("select");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formFields, setFormFields] = useState<Field[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loadingFields, setLoadingFields] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null);

  // Load templates on mount
  useEffect(() => {
    fetch("/api/templates")
      .then(r => r.json())
      .then(d => setTemplates(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-init chat when entering chat view with no messages
  useEffect(() => {
    if (view === "chat" && messages.length === 0) {
      initChat(templates);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Rotate demo messages
  useEffect(() => {
    const t = setInterval(() => {
      setDemoVisible(false);
      setTimeout(() => { setDemoIdx(i => (i + 1) % DEMO_MESSAGES.length); setDemoVisible(true); }, 400);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  function reloadTemplates() {
    fetch("/api/templates")
      .then(r => r.json())
      .then(d => setTemplates(Array.isArray(d) ? d : []))
      .catch(() => {});
  }

  /* ── Init chat with welcome message ── */
  function initChat(tmplList: Template[]) {
    setMessages([]);
    setTimeout(() => {
      const welcomeText = tmplList.length > 0
        ? `Xin chào! Tôi là **Contract AI** ⚡\n\nBạn có **${tmplList.length} mẫu hợp đồng** sẵn sàng. Hãy chọn loại hợp đồng bạn muốn tạo, hoặc nhắn tin mô tả nhu cầu của bạn:`
        : `Xin chào! Tôi là **Contract AI** ⚡\n\nBạn chưa có mẫu hợp đồng nào. Hãy vào **Templates** để upload file .docx mẫu trước nhé!`;
      setMessages([{
        id: "init",
        role: "assistant",
        text: welcomeText,
        showTemplates: tmplList,
      }]);
    }, 100);
  }

  /* ── "Bắt đầu ngay" handler ── */
  function handleStart() {
    setView("chat");
    initChat(templates);
  }

  /* ── Select template from chat ── */
  async function selectTemplateInChat(t: Template) {
    setSelectedTemplate(t);
    setFormValues({});
    const loadingId = addMsg({ role: "assistant", isLoading: true });
    try {
      const res = await fetch("/api/templates/fields", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: t.id }),
      });
      const { fields } = await res.json();
      updateMsg(loadingId, {
        isLoading: false,
        text: `Bạn đã chọn **${t.name}**. Điền thông tin bên dưới:`,
        formTemplateId: t.id,
        formTemplateName: t.name,
        formFields: fields ?? [],
      });
    } catch {
      updateMsg(loadingId, { isLoading: false, text: "Không thể tải thông tin template." });
    }
  }

  /* ── Create flow: select template (create view) ── */
  async function selectTemplate(t: Template) {
    setSelectedTemplate(t);
    setLoadingFields(true);
    setCreateStep("form");
    setFormValues({});
    try {
      const res = await fetch("/api/templates/fields", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: t.id }),
      });
      const { fields } = await res.json();
      setFormFields(fields ?? []);
    } catch {
      setFormFields([]);
    }
    setLoadingFields(false);
  }

  /* ── Submit form in chat ── */
  async function handleChatFormSubmit(e: React.FormEvent, templateId: string, values: Record<string, string>) {
    e.preventDefault();
    const aiId = addMsg({ role: "assistant", isLoading: true });
    try {
      const res = await fetch("/api/contracts/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, fieldValues: values }),
      });
      const { html } = await res.json();
      const tmpl = templates.find(t => t.id === templateId) ?? selectedTemplate;
      updateMsg(aiId, {
        isLoading: false,
        text: "✅ Hợp đồng đã tạo xong! Xem trước bên dưới:",
        previewHtmlInline: html,
        contract: {
          templateId,
          templateName: tmpl?.name ?? "Hợp đồng",
          placeholders: [],
          filled: values,
          missing: [],
          previewHtml: html,
        },
      });
    } catch {
      updateMsg(aiId, { isLoading: false, text: "Không thể tạo hợp đồng. Vui lòng thử lại." });
    }
  }

  /* ── Create flow: generate preview ── */
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplate) return;
    setGenerating(true);
    setPreviewHtml("");
    try {
      const res = await fetch("/api/contracts/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplate.id, fieldValues: formValues }),
      });
      const { html } = await res.json();
      setPreviewHtml(html ?? "");
    } catch {
      setPreviewHtml("<p>Không thể tạo xem trước.</p>");
    }
    setGenerating(false);
  }

  /* ── Create flow: export PDF from preview ── */
  function handleCreatePdf() {
    if (!previewHtml || !selectedTemplate) return;
    const name = selectedTemplate.name;
    const printHtml = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"/><title>${name}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Times New Roman',serif;font-size:13pt;line-height:1.8;color:#000;background:#fff}.page{max-width:210mm;margin:0 auto;padding:20mm 25mm 25mm;min-height:297mm}h1,h2,h3{font-weight:bold;margin:14pt 0 8pt}p{margin-bottom:8pt}p:not([style*="text-align"]){text-align:justify}table{border-collapse:collapse;width:100%;margin:10pt 0}td,th{border:1px solid #333;padding:6pt 10pt}@media print{@page{size:A4;margin:0}body{padding:0}.page{padding:15mm 20mm}}</style></head><body><div class="page">${previewHtml}</div><script>window.onload=function(){window.print()}</script></body></html>`;
    const blob = new Blob([printHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  /* ── Chat helpers ── */
  function addMsg(msg: Omit<Message, "id">) {
    const id = Math.random().toString(36).slice(2);
    setMessages(prev => [...prev, { ...msg, id }]);
    return id;
  }
  function updateMsg(id: string, update: Partial<Message>) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...update } : m));
  }

  /* ── Voice input ── */
  function toggleVoice() {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Vui lòng dùng Chrome để dùng giọng nói."); return;
    }
    if (isListening) { recogRef.current?.stop(); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    const r = new SR();
    r.lang = "vi-VN";
    r.continuous = true;       // keep listening until we manually stop
    r.interimResults = true;   // get partial results so we know user is speaking

    let finalTranscript = "";
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;

    const SILENCE_MS = 4500; // 4.5 seconds of silence → auto send

    function resetSilenceTimer() {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        r.stop(); // triggers onend → will send
      }, SILENCE_MS);
    }

    r.onstart = () => { setIsListening(true); };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setInput(finalTranscript + interim);
      resetSilenceTimer(); // reset 4.5s timer each time user speaks
    };

    r.onspeechend = () => {
      // User paused — start the silence countdown if not already running
      if (!silenceTimer) resetSilenceTimer();
    };

    r.onend = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      setIsListening(false);
      if (finalTranscript.trim()) {
        setInput(finalTranscript.trim());
        setTimeout(() => handleSend(finalTranscript.trim()), 150);
      }
    };

    r.onerror = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      setIsListening(false);
    };

    recogRef.current = r;
    r.start();
    resetSilenceTimer(); // start initial 4.5s timer (in case mic opens but no speech)
  }

  /* ── Send message ── */
  async function handleSend(text?: string) {
    const cmd = (text ?? input).trim();
    if (!cmd) return;

    setInput("");
    setView("chat");

    const historySnapshot = messages
      .filter(m => !m.isLoading && m.text)
      .map(m => ({ role: m.role, text: m.text ?? "" }));

    addMsg({ role: "user", text: cmd });
    const aiId = addMsg({ role: "assistant", isLoading: true });

    try {
      const res = await fetch("/api/ai/smart-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd, history: historySnapshot }),
      });

      if (!res.ok) {
        updateMsg(aiId, { isLoading: false, text: "Có lỗi xảy ra, vui lòng thử lại." });
        return;
      }

      const data = await res.json();

      if (data.type === "direct") {
        // AI extracted all info — generate contract immediately
        updateMsg(aiId, { isLoading: true, text: "⚡ Đang tạo hợp đồng..." });
        try {
          const genRes = await fetch("/api/contracts/generate", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ templateId: data.templateId, fieldValues: data.fieldValues }),
          });
          const { html } = await genRes.json();
          updateMsg(aiId, {
            isLoading: false,
            text: data.message ?? "✅ Hợp đồng đã được tạo tự động!",
            previewHtmlInline: html,
            contract: {
              templateId: data.templateId,
              templateName: data.templateName,
              placeholders: [],
              filled: data.fieldValues ?? {},
              missing: [],
              previewHtml: html,
            },
          });
        } catch {
          updateMsg(aiId, { isLoading: false, text: "Không thể tạo hợp đồng. Vui lòng thử lại." });
        }
      } else if (data.type === "contract") {
        updateMsg(aiId, {
          isLoading: false,
          text: data.message,
          contract: {
            templateId: data.templateId,
            templateName: data.templateName,
            placeholders: data.placeholders ?? [],
            filled: data.filled ?? {},
            missing: data.missing ?? [],
          },
        });
      } else if (data.type === "form") {
        updateMsg(aiId, {
          isLoading: false,
          text: data.message,
          formTemplateId: data.templateId,
          formTemplateName: data.templateName,
          formFields: data.fields ?? [],
          formPrefilled: data.prefilled ?? {},
        });
      } else {
        updateMsg(aiId, { isLoading: false, text: data.message });
      }
    } catch {
      updateMsg(aiId, { isLoading: false, text: "Mất kết nối. Vui lòng thử lại." });
    }
  }

  /* ── Preview ── */
  async function openPreview(contract: ContractData) {
    setLoadingPreview(true);
    setPreviewModal({ ...contract, previewHtml: "" });
    const res = await fetch("/api/contracts/preview", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: contract.templateId, fieldValues: contract.filled }),
    });
    if (res.ok) {
      const { html } = await res.json();
      setPreviewModal({ ...contract, previewHtml: html });
    } else {
      setPreviewModal({ ...contract, previewHtml: "<p>Không thể tải xem trước.</p>" });
    }
    setLoadingPreview(false);
  }

  /* ── Export PDF ── */
  async function handlePdf(contract: ContractData) {
    // Open window synchronously inside the click event so browsers don't block it
    const win = window.open("", "_blank");
    if (!win) { alert("Vui lòng cho phép popup để xuất PDF."); return; }
    win.document.write("<html><body><p style='font-family:sans-serif;padding:40px'>Đang tạo PDF...</p></body></html>");
    const res = await fetch("/api/contracts/pdf", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: contract.templateId, fieldValues: contract.filled, contractName: contract.templateName }),
    });
    if (res.ok) {
      const html = await res.text();
      win.document.open();
      win.document.write(html);
      win.document.close();
    } else {
      win.close();
      alert("Không thể tạo PDF. Vui lòng thử lại.");
    }
  }

  /* ── Export DOCX ── */
  async function handleExport(contract: ContractData) {
    setExporting(true);
    const title = `${contract.templateName} - ${new Date().toLocaleDateString("vi-VN")}`;
    const cr = await fetch("/api/contracts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, templateId: contract.templateId, fieldValues: contract.filled }),
    });
    if (!cr.ok) { alert((await cr.json()).error ?? "Lỗi"); setExporting(false); return; }
    const c = await cr.json();
    const er = await fetch(`/api/contracts/${c.id}/export`, { method: "POST" });
    if (er.ok) {
      const blob = await er.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`; a.click();
      URL.revokeObjectURL(url);
      setPreviewModal(null);
    } else { alert("Lỗi xuất file"); }
    setExporting(false);
  }

  /* ── Upload templates ── */
  function onFilesSelected(files: File[]) {
    const docx = files.filter(f => f.name.endsWith(".docx"));
    setUploadFiles(docx);
    const init: Record<string, "pending" | "done" | "error"> = {};
    docx.forEach(f => { init[f.name] = "pending"; });
    setUploadProgress(init);
  }

  async function handleBulkUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFiles.length || !uploadCategory) return;
    setUploading(true);
    for (const file of uploadFiles) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name.replace(/\.docx$/i, "").replace(/[-_]/g, " "));
      fd.append("category", uploadCategory);
      fd.append("language", "vi");
      const res = await fetch("/api/templates", { method: "POST", body: fd });
      setUploadProgress(p => ({ ...p, [file.name]: res.ok ? "done" : "error" }));
    }
    setUploading(false);
    reloadTemplates();
    setUploadFiles([]);
    setUploadCategory("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Xoá template này?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    setTemplates(prev => prev.filter(t => t.id !== id));
  }

  const demo = DEMO_MESSAGES[demoIdx];

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --ink:      #0b1120;
          --ink2:     #1e2d4a;
          --blue:     #3b6bff;
          --blue2:    #2855e8;
          --teal:     #06b6d4;
          --green:    #10b981;
          --amber:    #f59e0b;
          --red:      #ef4444;
          --bg:       #f4f6fb;
          --bg2:      #eaecf5;
          --white:    #ffffff;
          --t1:       #0b1120;
          --t2:       #334155;
          --t3:       #64748b;
          --t4:       #94a3b8;
          --border:   #e2e8f5;
          --border2:  #c8d3ea;
          --bsoft:    #eef2ff;
          --bborder:  #c7d4ff;
          --gsoft:    #ecfdf5;
          --gborder:  #a7f3d0;
          --sh-xs: 0 1px 3px rgba(11,17,32,.06);
          --sh-sm: 0 2px 10px rgba(11,17,32,.08);
          --sh-md: 0 6px 24px rgba(11,17,32,.1);
          --sh-lg: 0 16px 48px rgba(11,17,32,.13);
          --sh-xl: 0 28px 80px rgba(11,17,32,.16);
          --sh-blue: 0 6px 28px rgba(59,107,255,.28);
          --sans: 'Inter', system-ui, sans-serif;
          --display: 'Sora', 'Inter', system-ui, sans-serif;
          --r: 14px;
          --r-sm: 9px;
          --r-lg: 20px;
        }

        html, body { height: 100%; background: var(--bg); }

        .cf-app {
          min-height: 100vh;
          font-family: var(--sans);
          color: var(--t1);
          font-size: 14px;
          -webkit-font-smoothing: antialiased;
          display: flex; flex-direction: column;
        }

        /* ══ NAV ══ */
        .cf-nav {
          height: 60px;
          background: rgba(255,255,255,.93);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center;
          padding: 0 28px; gap: 4px;
          position: sticky; top: 0; z-index: 100;
          box-shadow: var(--sh-xs);
          flex-shrink: 0;
        }
        .nav-logo {
          display: flex; align-items: center; gap: 9px;
          text-decoration: none; margin-right: 32px; flex-shrink: 0;
          cursor: pointer;
        }
        .nav-logo-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: linear-gradient(135deg, var(--blue), var(--teal));
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; box-shadow: var(--sh-blue);
        }
        .nav-logo-name {
          font-family: var(--display); font-weight: 800; font-size: 15px;
          color: var(--ink); letter-spacing: -0.04em;
        }
        .nav-links { display: flex; align-items: center; gap: 2px; flex: 1; }
        .nav-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 13px; border-radius: var(--r-sm);
          font-size: 13.5px; font-weight: 500; color: var(--t3);
          cursor: pointer; border: none; background: transparent;
          font-family: var(--sans); text-decoration: none;
          transition: all .15s; white-space: nowrap;
        }
        .nav-btn:hover { background: var(--bg); color: var(--t1); }
        .nav-btn.active { background: var(--bsoft); color: var(--blue); font-weight: 600; }
        .nav-right { display: flex; align-items: center; gap: 10px; margin-left: auto; }
        .nav-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 100px;
          background: var(--bg); border: 1px solid var(--border);
          font-size: 12px; font-weight: 500; color: var(--t3);
        }
        .dot-live { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; animation: blink 2s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        .btn-upgrade {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 17px; border-radius: 100px;
          font-size: 13px; font-weight: 700;
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          color: white; border: none; cursor: pointer;
          font-family: var(--sans); text-decoration: none;
          box-shadow: 0 3px 12px rgba(245,158,11,.35);
          transition: all .2s;
        }
        .btn-upgrade:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(245,158,11,.45); }
        .nav-avatar {
          width: 33px; height: 33px; border-radius: 50%;
          background: var(--ink2); color: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; cursor: pointer;
          border: 2px solid var(--border);
        }

        /* ══ BODY WRAP ══ */
        .cf-body { flex: 1; display: flex; flex-direction: column; min-height: 0; }

        /* ══════════════════════════════════
           HERO VIEW
        ══════════════════════════════════ */
        .hero-page {
          flex: 1; overflow-y: auto;
          background: var(--bg);
        }

        /* Top gradient bar */
        .hero-bar {
          height: 3px;
          background: linear-gradient(90deg, var(--blue), var(--teal), #7c3aed);
          animation: grow 1s ease forwards;
        }
        @keyframes grow { from{transform:scaleX(0)} to{transform:scaleX(1)} }

        /* ── Section: Intro ── */
        .hero-intro {
          max-width: 960px; margin: 0 auto;
          padding: 52px 28px 0;
          display: grid; grid-template-columns: 1fr 1.1fr;
          gap: 40px; align-items: start;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .hero-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 13px; border-radius: 100px;
          background: var(--bsoft); border: 1px solid var(--bborder);
          font-size: 11px; font-weight: 700; color: var(--blue);
          text-transform: uppercase; letter-spacing: .07em;
          margin-bottom: 18px;
          animation: fadeUp .4s ease;
        }
        .hero-h1 {
          font-family: var(--display);
          font-size: 38px; font-weight: 800;
          line-height: 1.15; color: var(--ink);
          letter-spacing: -0.05em; margin-bottom: 14px;
          animation: fadeUp .5s ease;
        }
        .hero-h1 em { font-style: normal; color: var(--blue); }
        .hero-sub {
          font-size: 15px; color: var(--t3); line-height: 1.7;
          margin-bottom: 28px;
          animation: fadeUp .6s ease;
        }
        .btn-start {
          display: inline-flex; align-items: center; gap: 9px;
          padding: 14px 30px; border-radius: 100px;
          font-size: 15px; font-weight: 700; font-family: var(--sans);
          background: linear-gradient(135deg, var(--blue), var(--teal));
          color: white; border: none; cursor: pointer;
          box-shadow: var(--sh-blue);
          transition: all .22s;
          animation: fadeUp .7s ease;
        }
        .btn-start:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(59,107,255,.38); }

        /* Right: demo card */
        .hero-demo-wrap {
          animation: fadeUp .9s ease;
          perspective: 900px;
        }
        .hero-demo {
          background: white; border: 1px solid var(--border);
          border-radius: var(--r-lg); overflow: hidden;
          box-shadow: var(--sh-lg);
          transition: transform .3s ease, box-shadow .3s ease;
        }
        .hero-demo:hover {
          transform: perspective(900px) rotateX(1.5deg) translateY(-4px);
          box-shadow: var(--sh-xl);
        }
        .demo-bar { height: 3px; background: linear-gradient(90deg,var(--blue),var(--teal)); }
        .demo-titlebar {
          padding: 11px 16px; background: var(--bg);
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 10px;
        }
        .demo-dots { display: flex; gap: 5px; }
        .demo-dot { width: 10px; height: 10px; border-radius: 50%; }
        .demo-label { font-size: 12px; font-weight: 600; color: var(--t3); flex: 1; }
        .demo-badge {
          font-size: 10px; font-weight: 700; color: var(--blue);
          background: var(--bsoft); border: 1px solid var(--bborder);
          padding: 2px 8px; border-radius: 100px;
          text-transform: uppercase; letter-spacing: .05em;
        }
        .demo-msgs { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .demo-user { display: flex; justify-content: flex-end; }
        .demo-bubble {
          background: var(--ink); color: white;
          padding: 10px 14px; border-radius: 13px 4px 13px 13px;
          font-size: 12px; line-height: 1.5; max-width: 90%;
          transition: opacity .4s, transform .4s;
        }
        .demo-ai-row { display: flex; gap: 9px; align-items: flex-start; }
        .demo-av {
          width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg,var(--blue),var(--teal));
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; flex-shrink: 0;
        }
        .demo-card-wrap { flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 11px; overflow: hidden; transition: opacity .4s, transform .4s; }
        .demo-card-strip { height: 2px; background: linear-gradient(90deg,var(--blue),var(--teal)); }
        .demo-card-inner { padding: 10px 12px; }
        .demo-card-tag { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--blue); margin-bottom: 3px; display: flex; align-items: center; gap: 4px; }
        .demo-card-name { font-size: 12px; font-weight: 700; color: var(--t1); margin-bottom: 7px; }
        .demo-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 7px; }
        .demo-field { padding: 4px 7px; border-radius: 5px; background: white; border: 1px solid var(--gborder); font-size: 10px; color: var(--t2); display: flex; align-items: center; gap: 4px; }
        .demo-prog { height: 4px; background: var(--border); border-radius: 4px; overflow: hidden; margin-bottom: 7px; }
        .demo-prog-fill { height: 100%; background: linear-gradient(90deg,var(--blue),var(--teal)); border-radius: 4px; }
        .demo-acts { display: flex; gap: 6px; }
        .demo-act-out { padding: 5px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; border: 1px solid var(--border2); background: white; color: var(--t3); cursor: default; }
        .demo-act-in  { flex: 1; padding: 5px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; background: var(--ink); color: white; text-align: center; cursor: default; }
        .anim-in  { opacity: 1; transform: translateY(0); }
        .anim-out { opacity: 0; transform: translateY(7px); }

        /* ── Section: How it works ── */
        .hero-steps-section {
          max-width: 960px; margin: 0 auto;
          padding: 44px 28px 0;
        }
        .section-label {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: .08em; color: var(--t4); margin-bottom: 18px;
        }
        .steps-grid {
          display: grid; grid-template-columns: repeat(3,1fr); gap: 16px;
        }
        .step-card {
          background: white; border: 1px solid var(--border);
          border-radius: var(--r); padding: 20px 18px;
          box-shadow: var(--sh-xs);
          transition: all .2s;
          position: relative; overflow: hidden;
        }
        .step-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg,var(--blue),var(--teal));
          opacity: 0; transition: opacity .2s;
        }
        .step-card:hover { box-shadow: var(--sh-md); transform: translateY(-3px); }
        .step-card:hover::before { opacity: 1; }
        .step-num-badge {
          width: 30px; height: 30px; border-radius: 8px;
          background: linear-gradient(135deg,var(--blue),var(--teal));
          color: white; font-size: 12px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
          box-shadow: 0 2px 8px rgba(59,107,255,.3);
        }
        .step-icon-wrap {
          font-size: 24px; margin-bottom: 12px;
        }
        .step-title { font-size: 14px; font-weight: 700; color: var(--ink2); margin-bottom: 6px; }
        .step-desc  { font-size: 12.5px; color: var(--t4); line-height: 1.6; }

        /* ── Section: Stats ── */
        .hero-stats-section {
          max-width: 960px; margin: 0 auto;
          padding: 32px 28px 0;
        }
        .stats-row {
          display: grid; grid-template-columns: repeat(3,1fr); gap: 14px;
        }
        .stat-card {
          background: white; border: 1px solid var(--border);
          border-radius: var(--r); padding: 18px 20px;
          display: flex; align-items: center; gap: 14px;
          box-shadow: var(--sh-xs); transition: all .2s;
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: var(--sh-sm); }
        .stat-icon {
          width: 42px; height: 42px; border-radius: 11px;
          background: var(--bsoft); border: 1px solid var(--bborder);
          display: flex; align-items: center; justify-content: center;
          color: var(--blue); flex-shrink: 0;
        }
        .stat-val { font-family: var(--display); font-size: 21px; font-weight: 800; color: var(--ink); line-height: 1; margin-bottom: 3px; }
        .stat-lbl { font-size: 11px; color: var(--t4); }

        /* ── Section: Suggestions ── */
        .hero-sug-section {
          max-width: 960px; margin: 0 auto;
          padding: 32px 28px 52px;
        }
        .sug-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
        .sug-card {
          display: flex; flex-direction: column; align-items: flex-start;
          gap: 8px; padding: 16px 15px;
          background: white; border: 1px solid var(--border);
          border-radius: var(--r); cursor: pointer;
          font-family: var(--sans); text-align: left;
          box-shadow: var(--sh-xs); transition: all .2s;
        }
        .sug-card:hover { border-color: var(--blue); box-shadow: 0 0 0 3px var(--bsoft), var(--sh-sm); transform: translateY(-2px); }
        .sug-emoji { font-size: 22px; }
        .sug-name  { font-size: 13px; font-weight: 600; color: var(--t1); }
        .sug-desc  { font-size: 11.5px; color: var(--t4); line-height: 1.45; }

        /* ══════════════════════════════════
           TEMPLATES VIEW
        ══════════════════════════════════ */
        .tpl-page { flex: 1; overflow-y: auto; background: var(--bg); }
        .tpl-inner { max-width: 860px; margin: 0 auto; padding: 40px 28px 60px; }

        /* Page header */
        .page-header { margin-bottom: 32px; }
        .page-title {
          font-family: var(--display); font-size: 26px; font-weight: 800;
          color: var(--ink); letter-spacing: -0.04em; margin-bottom: 6px;
        }
        .page-sub { font-size: 14px; color: var(--t3); }

        /* Guide steps (when no templates) */
        .guide-grid {
          display: grid; grid-template-columns: repeat(3,1fr); gap: 14px;
          margin-bottom: 32px; animation: fadeUp .4s ease;
        }
        .guide-card {
          background: white; border: 1px solid var(--border);
          border-radius: var(--r); padding: 20px 16px;
          box-shadow: var(--sh-xs);
        }
        .guide-num {
          width: 28px; height: 28px; border-radius: 7px;
          background: linear-gradient(135deg,var(--blue),var(--teal));
          color: white; font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
        }
        .guide-emoji { font-size: 20px; margin-bottom: 8px; }
        .guide-title { font-size: 13px; font-weight: 700; color: var(--ink2); margin-bottom: 5px; }
        .guide-desc  { font-size: 12px; color: var(--t4); line-height: 1.55; }

        /* Upload box */
        .upload-box {
          background: white; border: 1px solid var(--border);
          border-radius: var(--r-lg); overflow: hidden;
          box-shadow: var(--sh-sm); margin-bottom: 32px;
        }
        .upload-box-strip { height: 4px; background: linear-gradient(90deg,var(--blue),var(--teal)); }
        .upload-box-inner { padding: 24px 26px; }
        .upload-box-title { font-family: var(--display); font-size: 16px; font-weight: 700; color: var(--ink); margin-bottom: 4px; }
        .upload-box-sub   { font-size: 13px; color: var(--t3); margin-bottom: 20px; }

        .dropzone {
          border: 2px dashed var(--border2); border-radius: var(--r);
          padding: 30px 20px; text-align: center; cursor: pointer;
          transition: all .2s; background: var(--bg);
        }
        .dropzone:hover, .dropzone.over { border-color: var(--blue); background: var(--bsoft); }
        .dropzone.has-files { border-style: solid; border-color: var(--blue); background: var(--bsoft); }
        .dz-icon {
          width: 52px; height: 52px; border-radius: 14px;
          background: white; border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 12px; color: var(--blue);
          box-shadow: var(--sh-sm); transition: all .22s;
        }
        .dropzone:hover .dz-icon { transform: translateY(-3px) scale(1.06); box-shadow: var(--sh-blue); }

        .file-list { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
        .file-item {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; border-radius: var(--r-sm);
          background: white; border: 1px solid var(--border);
          font-size: 12px; color: var(--t2);
        }
        .file-item span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .upload-form-row { display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-top: 16px; }
        .form-input {
          padding: 11px 14px; border-radius: var(--r-sm);
          font-size: 13px; font-family: var(--sans);
          background: var(--bg); border: 1.5px solid var(--border2);
          color: var(--t1); outline: none; transition: all .15s;
        }
        .form-input:focus { border-color: var(--blue); background: white; box-shadow: 0 0 0 3px var(--bsoft); }
        .form-input::placeholder { color: var(--t4); }
        .btn-upload {
          display: flex; align-items: center; gap: 7px;
          padding: 11px 22px; border-radius: var(--r-sm);
          font-size: 13px; font-weight: 700; font-family: var(--sans);
          background: linear-gradient(135deg,var(--blue),var(--teal));
          color: white; border: none; cursor: pointer;
          box-shadow: 0 3px 12px rgba(59,107,255,.28);
          transition: all .18s; white-space: nowrap;
        }
        .btn-upload:hover:not(:disabled) { transform: translateY(-1px); box-shadow: var(--sh-blue); }
        .btn-upload:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }

        /* Template grid */
        .tpl-section-label {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: .08em; color: var(--t3);
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px;
        }
        .tpl-count { font-size: 11px; font-weight: 500; background: var(--bg); border: 1px solid var(--border); padding: 2px 9px; border-radius: 100px; color: var(--t4); text-transform: none; letter-spacing: 0; }
        .tpl-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(240px,1fr)); gap: 14px; }
        .tpl-card {
          background: white; border: 1px solid var(--border);
          border-radius: var(--r); overflow: hidden;
          box-shadow: var(--sh-xs); transition: all .22s;
          position: relative;
        }
        .tpl-card:hover { box-shadow: var(--sh-md); transform: translateY(-3px) perspective(600px) rotateX(1deg); border-color: var(--bborder); }
        .tpl-card:hover .tpl-del { opacity: 1; }
        .tpl-stripe { height: 3px; background: linear-gradient(90deg,var(--blue),var(--teal)); }
        .tpl-body  { padding: 16px; }
        .tpl-head  { display: flex; align-items: flex-start; gap: 11px; margin-bottom: 14px; }
        .tpl-icon  { width: 40px; height: 40px; border-radius: 10px; background: var(--bsoft); border: 1px solid var(--bborder); display: flex; align-items: center; justify-content: center; color: var(--blue); flex-shrink: 0; }
        .tpl-name  { font-size: 13px; font-weight: 700; color: var(--ink2); margin-bottom: 2px; line-height: 1.3; }
        .tpl-cat   { font-size: 11px; color: var(--t4); }
        .tpl-foot  { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--border); }
        .tpl-fields{ font-size: 11px; font-weight: 500; color: var(--t4); display: flex; align-items: center; gap: 4px; }
        .btn-use   { display: flex; align-items: center; gap: 5px; padding: 7px 13px; border-radius: 7px; font-size: 12px; font-weight: 700; font-family: var(--sans); background: var(--ink); color: white; border: none; cursor: pointer; transition: all .15s; }
        .btn-use:hover { background: var(--ink2); box-shadow: 0 2px 10px rgba(11,17,32,.22); }
        .tpl-del   { position: absolute; top: 10px; right: 10px; opacity: 0; width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; background: white; border: 1px solid var(--border); color: var(--t3); cursor: pointer; transition: all .15s; z-index: 2; }
        .tpl-del:hover { background: #fff1f1; border-color: #fca5a5; color: var(--red); }

        /* Empty state */
        .empty-state { text-align: center; padding: 40px 20px; }
        .empty-icon  { width: 64px; height: 64px; border-radius: 18px; background: var(--bg); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; color: var(--t4); }

        /* CTA after upload */
        .goto-chat-bar {
          margin-top: 28px; padding: 18px 24px;
          background: var(--bsoft); border: 1px solid var(--bborder);
          border-radius: var(--r);
          display: flex; align-items: center; gap: 16px;
          animation: fadeUp .4s ease;
        }

        /* ══════════════════════════════════
           CHAT VIEW
        ══════════════════════════════════ */
        .chat-page { flex: 1; display: flex; flex-direction: column; min-height: 0; }
        .chat-feed { flex: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }

        /* ── Empty chat (suggestion cards) ── */
        .chat-empty {
          max-width: 780px; margin: 0 auto;
          padding: 36px 24px 20px;
        }
        .chat-empty-head { margin-bottom: 28px; }
        .chat-empty-h2 {
          font-family: var(--display);
          font-size: 22px; font-weight: 800;
          color: var(--ink); margin-bottom: 6px; letter-spacing: -0.04em;
        }
        .chat-empty-sub { font-size: 14px; color: var(--t3); }
        .chat-empty-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--t4); margin-bottom: 10px; }
        .chat-sug-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }
        .chat-sug-card {
          display: flex; align-items: center; gap: 13px;
          padding: 14px 16px; border-radius: var(--r);
          background: white; border: 1px solid var(--border);
          cursor: pointer; font-family: var(--sans); text-align: left;
          box-shadow: var(--sh-xs); transition: all .2s;
        }
        .chat-sug-card:hover { border-color: var(--blue); box-shadow: 0 0 0 3px var(--bsoft), var(--sh-sm); transform: translateY(-2px); }
        .chat-sug-card:hover .cs-arrow { opacity: 1; transform: translateX(0); }
        .cs-emoji { font-size: 22px; flex-shrink: 0; }
        .cs-name  { font-size: 13px; font-weight: 600; color: var(--t1); margin-bottom: 2px; }
        .cs-desc  { font-size: 11px; color: var(--t4); }
        .cs-arrow { margin-left: auto; flex-shrink: 0; opacity: 0; transform: translateX(-5px); transition: all .18s; color: var(--blue); }

        /* ── Messages ── */
        .chat-messages { max-width: 780px; margin: 0 auto; padding: 28px 24px 20px; display: flex; flex-direction: column; gap: 24px; width: 100%; }
        .msg-row       { display: flex; gap: 12px; animation: fadeUp .2s ease; }
        .msg-row.user  { flex-direction: row-reverse; }
        .msg-av        { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; margin-top: 2px; }
        .msg-av.ai     { background: linear-gradient(135deg,var(--blue),var(--teal)); color: white; }
        .msg-av.u      { background: var(--ink2); color: white; }
        .msg-body      { flex: 1; min-width: 0; }
        .msg-name      { font-size: 11px; font-weight: 600; color: var(--t4); margin-bottom: 6px; text-transform: uppercase; letter-spacing: .05em; }
        .user-bubble   { display: inline-block; max-width: 74%; padding: 12px 17px; border-radius: 17px 4px 17px 17px; background: var(--ink); color: white; font-size: 14px; line-height: 1.6; float: right; }
        .ai-text       { font-size: 14px; color: var(--t2); line-height: 1.75; margin-bottom: 12px; }
        .dots          { display: flex; gap: 5px; padding: 6px 0; }
        .dots span     { width: 8px; height: 8px; border-radius: 50%; background: var(--border2); animation: bounce 1.1s infinite; }
        .dots span:nth-child(2) { animation-delay: .14s; }
        .dots span:nth-child(3) { animation-delay: .28s; }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0);background:var(--border2)} 40%{transform:translateY(-7px);background:var(--blue)} }

        /* ── Contract card ── */
        .cc-card {
          max-width: 520px; background: white;
          border: 1px solid var(--border); border-radius: 18px;
          overflow: hidden; box-shadow: var(--sh-md);
          transition: all .25s;
        }
        .cc-card:hover { box-shadow: var(--sh-lg); transform: translateY(-2px); }
        .cc-strip  { height: 4px; background: linear-gradient(90deg,var(--blue),var(--teal)); }
        .cc-head   { padding: 16px 18px 13px; display: flex; gap: 13px; align-items: flex-start; border-bottom: 1px solid var(--border); background: var(--bg); }
        .cc-doc    { width: 44px; height: 52px; background: white; border: 1px solid var(--border); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: var(--sh-xs); position: relative; }
        .cc-doc::before { content:''; position:absolute; top:0; right:0; width:12px; height:12px; background:var(--bsoft); clip-path:polygon(0 0,100% 0,100% 100%); border-bottom-left-radius:3px; }
        .cc-eyebrow { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--blue); margin-bottom: 4px; display: flex; align-items: center; gap: 4px; }
        .cc-name   { font-family: var(--display); font-weight: 700; font-size: 15px; color: var(--ink); line-height: 1.3; margin-bottom: 6px; }
        .cc-badges { display: flex; gap: 5px; flex-wrap: wrap; }
        .cc-badge  { font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 100px; }
        .cc-fields { padding: 13px 18px; border-bottom: 1px solid var(--border); }
        .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .f-item    { display: flex; align-items: center; gap: 7px; padding: 7px 9px; border-radius: 7px; background: var(--bg); border: 1px solid transparent; }
        .f-item.ok { background: var(--gsoft); border-color: var(--gborder); }
        .f-lbl     { font-size: 10px; font-weight: 500; color: var(--t4); max-width: 76px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
        .f-val     { font-size: 12px; font-weight: 600; color: var(--t1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
        .f-empty   { font-size: 11px; color: var(--t4); font-style: italic; }
        .cc-prog   { margin-top: 11px; display: flex; align-items: center; gap: 10px; }
        .prog-track { flex: 1; height: 5px; background: var(--border); border-radius: 5px; overflow: hidden; }
        .prog-fill  { height: 100%; background: linear-gradient(90deg,var(--blue),var(--teal)); border-radius: 5px; transition: width .6s cubic-bezier(.34,1.56,.64,1); }
        .prog-pct   { font-size: 11px; font-weight: 600; color: var(--t3); flex-shrink: 0; }
        .cc-actions { padding: 12px 18px 15px; display: flex; gap: 8px; background: var(--bg); }
        .btn-sec   { display: flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: var(--r-sm); font-size: 13px; font-weight: 600; font-family: var(--sans); cursor: pointer; background: white; border: 1px solid var(--border2); color: var(--t2); transition: all .15s; }
        .btn-sec:hover { border-color: var(--blue); color: var(--blue); background: var(--bsoft); }
        .btn-pri   { flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 18px; border-radius: var(--r-sm); font-size: 13px; font-weight: 700; font-family: var(--sans); cursor: pointer; border: none; background: linear-gradient(135deg,var(--blue),var(--teal)); color: white; transition: all .2s; position: relative; overflow: hidden; }
        .btn-pri::after { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent); transition:left .45s; }
        .btn-pri:hover::after { left:100%; }
        .btn-pri:hover { box-shadow: var(--sh-blue); transform: translateY(-1px); }
        .btn-pri:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-pri.done { background: var(--green); }

        /* ── Input bar ── */
        .chat-input-zone {
          flex-shrink: 0; padding: 12px 24px 18px;
          border-top: 1px solid var(--border);
          background: rgba(255,255,255,.95);
          backdrop-filter: blur(12px);
        }
        .chat-input-inner { max-width: 780px; margin: 0 auto; }
        .input-box {
          background: white; border: 1.5px solid var(--border2);
          border-radius: var(--r); overflow: hidden;
          box-shadow: var(--sh-sm); transition: all .18s;
        }
        .input-box:focus-within { border-color: var(--blue); box-shadow: 0 0 0 3px var(--bsoft), var(--sh-sm); }
        .input-ta {
          width: 100%; background: transparent; border: none; outline: none;
          resize: none; padding: 14px 18px 10px;
          font-size: 14px; line-height: 1.6; color: var(--t1);
          font-family: var(--sans); min-height: 56px; max-height: 130px;
        }
        .input-ta::placeholder { color: var(--t4); }
        .input-footer { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px 10px; }
        .input-hint { font-size: 11px; color: var(--t4); }
        .input-actions { display: flex; align-items: center; gap: 7px; }
        .btn-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid var(--border); background: var(--bg); color: var(--t3); transition: all .15s; }
        .btn-icon:hover { border-color: var(--blue); color: var(--blue); background: var(--bsoft); }
        .btn-icon.rec { background: #fff1f1; border-color: #fca5a5; color: var(--red); animation: pulse-r 1.5s infinite; }
        @keyframes pulse-r { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.2)} 50%{box-shadow:0 0 0 6px rgba(239,68,68,0)} }
        .btn-send {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 20px; border-radius: 8px;
          font-size: 13px; font-weight: 700; font-family: var(--sans);
          border: none; background: linear-gradient(135deg,var(--blue),var(--teal));
          color: white; cursor: pointer; transition: all .18s;
        }
        .btn-send:hover { box-shadow: var(--sh-blue); transform: translateY(-1px); }
        .btn-send:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }

        /* ══ MODAL ══ */
        .overlay   { position: fixed; inset: 0; background: rgba(11,17,32,.62); backdrop-filter: blur(8px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 24px; animation: ov-in .2s ease; }
        @keyframes ov-in { from{opacity:0} to{opacity:1} }
        .modal     { background: white; border: 1px solid var(--border); border-radius: 22px; width: 100%; max-width: 760px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: var(--sh-xl); animation: modal-in .28s cubic-bezier(.34,1.56,.64,1); }
        @keyframes modal-in { from{transform:scale(.94) translateY(20px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
        .modal-strip { height: 4px; background: linear-gradient(90deg,var(--blue),var(--teal)); flex-shrink: 0; }
        .modal-head  { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px 15px; border-bottom: 1px solid var(--border); background: var(--bg); flex-shrink: 0; }
        .modal-title { font-family: var(--display); font-size: 18px; font-weight: 800; color: var(--ink); letter-spacing: -0.03em; }
        .modal-meta  { font-size: 12px; color: var(--t4); margin-top: 3px; }
        .btn-close   { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: var(--bg); border: 1px solid var(--border); color: var(--t3); cursor: pointer; transition: all .15s; }
        .btn-close:hover { background: #fff1f1; border-color: #fca5a5; color: var(--red); }
        .modal-body  { flex: 1; overflow-y: auto; padding: 28px 32px; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
        .doc-paper   { background: white; color: #1e293b; border-radius: 5px; padding: 52px 56px; font-size: 13.5px; line-height: 1.85; font-family: 'Times New Roman',Times,serif; box-shadow: 0 2px 20px rgba(0,0,0,.07); min-height: 400px; }
        .doc-paper h1,.doc-paper h2,.doc-paper h3 { color: #0f172a; margin: 16px 0 8px; font-weight: 700; }
        .doc-paper p { margin-bottom: 9px; }
        .doc-paper p:not([style*="text-align"]) { text-align: justify; }
        .doc-paper table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        .doc-paper td,.doc-paper th { border: 1px solid #e2e8f0; padding: 8px 12px; }
        .loading-c   { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 80px 20px; font-size: 14px; color: var(--t3); }
        .modal-foot  { flex-shrink: 0; padding: 15px 24px; border-top: 1px solid var(--border); display: flex; gap: 10px; background: var(--bg); }
        .btn-cancel  { display: flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: var(--r-sm); font-size: 13px; font-weight: 600; font-family: var(--sans); cursor: pointer; background: white; border: 1px solid var(--border2); color: var(--t2); transition: all .15s; }
        .btn-dl      { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px; border-radius: var(--r-sm); font-size: 13px; font-weight: 700; font-family: var(--sans); cursor: pointer; border: none; background: linear-gradient(135deg,var(--blue),var(--teal)); color: white; transition: all .2s; position: relative; overflow: hidden; }
        .btn-dl::after { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent); transition:left .45s; }
        .btn-dl:hover::after { left:100%; }
        .btn-dl:hover { box-shadow: var(--sh-blue); transform: translateY(-1px); }
        .btn-dl:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-pdf { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px; border-radius: var(--r-sm); font-size: 13px; font-weight: 700; font-family: var(--sans); cursor: pointer; border: 1.5px solid var(--red); background: white; color: var(--red); transition: all .2s; }
        .btn-pdf:hover { background: #fff1f1; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(239,68,68,.18); }
        .modal-missing { padding: 10px 24px; background: #fffbeb; border-top: 1px solid #fde68a; font-size: 12px; color: #92400e; display: flex; align-items: flex-start; gap: 8px; flex-shrink: 0; }

        @media (max-width: 768px) {
          .hero-intro { grid-template-columns: 1fr; }
          .hero-demo-wrap { display: none; }
          .steps-grid,.stats-row { grid-template-columns: 1fr; }
          .sug-grid { grid-template-columns: repeat(2,1fr); }
          .guide-grid { grid-template-columns: 1fr; }
          .fields-grid { grid-template-columns: 1fr; }
          .tpl-grid { grid-template-columns: 1fr; }
          .chat-sug-grid { grid-template-columns: 1fr; }
          .upload-form-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="cf-app">

        {/* ══ NAV ══ */}
        <nav className="cf-nav">
          <div className="nav-logo" onClick={() => setView("hero")}>
            <div className="nav-logo-icon">⚡</div>
            <span className="nav-logo-name">Contract Faster</span>
          </div>

          <div className="nav-links">
            <button className={`nav-btn ${view === "templates" ? "active" : ""}`} onClick={() => setView("templates")}>
              <BookOpen size={14} /> Templates
              {templates.length > 0 && (
                <span style={{ background: "var(--blue)", color: "white", fontSize: 10, fontWeight: 700, width: 17, height: 17, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  {templates.length}
                </span>
              )}
            </button>
            <button className={`nav-btn ${view === "chat" ? "active" : ""}`} onClick={() => { setView("chat"); if (messages.length === 0) initChat(templates); }}>
              <Sparkles size={14} /> Tạo hợp đồng
            </button>
            <a className="nav-btn" href="/app/contracts">
              <LayoutGrid size={14} /> Hợp đồng của tôi
            </a>
          </div>

          <div className="nav-right">
            <div className="nav-pill">
              <div className="dot-live" />
              {templates.length > 0 ? `${templates.length} template` : "Chưa có template"}
            </div>
            <a className="btn-upgrade" href="/pricing">
              <Zap size={13} /> Upgrade Pro
            </a>
            <div className="nav-avatar">K</div>
          </div>
        </nav>

        <div className="cf-body">

          {/* ══════════════════════════════════
              HERO VIEW
          ══════════════════════════════════ */}
          {view === "hero" && (
            <div className="hero-page">
              <div className="hero-bar" />

              {/* ── Intro section ── */}
              <div className="hero-intro">
                <div>
                  <div className="hero-pill"><Sparkles size={11} /> Powered by GPT-4o</div>
                  <h1 className="hero-h1">Tạo hợp đồng<br />chuyên nghiệp<br /><em>trong vài giây</em></h1>
                  <p className="hero-sub">
                    Mô tả bằng ngôn ngữ tự nhiên — AI tự chọn template,
                    điền thông tin và gửi bản hợp đồng để xem trước và tải về.
                  </p>
                  <button className="btn-start" onClick={handleStart}>
                    <Sparkles size={15} /> Bắt đầu ngay <ArrowRight size={15} />
                  </button>
                </div>

                {/* Animated demo card */}
                <div className="hero-demo-wrap">
                  <div className="hero-demo">
                    <div className="demo-bar" />
                    <div className="demo-titlebar">
                      <div className="demo-dots">
                        <div className="demo-dot" style={{ background: "#ef4444" }} />
                        <div className="demo-dot" style={{ background: "#f59e0b" }} />
                        <div className="demo-dot" style={{ background: "#22c55e" }} />
                      </div>
                      <span className="demo-label">Contract Faster AI</span>
                      <span className="demo-badge">GPT-4o</span>
                    </div>
                    <div className="demo-msgs">
                      <div className={`demo-user ${demoVisible ? "anim-in" : "anim-out"}`} style={{ transition: "opacity .4s, transform .4s" }}>
                        <div className="demo-bubble">{demo.user}</div>
                      </div>
                      <div className={`demo-ai-row ${demoVisible ? "anim-in" : "anim-out"}`} style={{ transition: "opacity .4s .1s, transform .4s .1s" }}>
                        <div className="demo-av">⚡</div>
                        <div className="demo-card-wrap">
                          <div className="demo-card-strip" />
                          <div className="demo-card-inner">
                            <div className="demo-card-tag"><CheckCircle2 size={9} /> Hợp đồng đã tạo</div>
                            <div className="demo-card-name">{demo.ai}</div>
                            <div className="demo-fields">
                              {["Họ tên","Ngày ký","Giá trị","Thời hạn"].map(f => (
                                <div key={f} className="demo-field"><CheckCircle2 size={8} style={{ color: "var(--green)", flexShrink: 0 }} />{f}</div>
                              ))}
                            </div>
                            <div className="demo-prog"><div className="demo-prog-fill" style={{ width: "82%" }} /></div>
                            <div className="demo-acts">
                              <div className="demo-act-out">Xem trước</div>
                              <div className="demo-act-in">Tải về DOCX ↓</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── How it works ── */}
              <div className="hero-steps-section">
                <div className="section-label">Cách hoạt động</div>
                <div className="steps-grid">
                  {[
                    { n: "01", icon: "📂", title: "Upload template", desc: "Tải file hợp đồng mẫu .docx — AI tự nhận diện các trường cần điền" },
                    { n: "02", icon: "💬", title: "Chat với AI", desc: "Mô tả yêu cầu bằng tiếng Việt tự nhiên, AI hỏi thêm nếu thiếu thông tin" },
                    { n: "03", icon: "⬇️", title: "Xem trước & Tải về", desc: "Kiểm tra bản preview hoàn chỉnh rồi tải file .docx về máy" },
                  ].map(s => (
                    <div key={s.n} className="step-card">
                      <div className="step-num-badge">{s.n}</div>
                      <div className="step-icon-wrap">{s.icon}</div>
                      <div className="step-title">{s.title}</div>
                      <div className="step-desc">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Stats ── */}
              <div className="hero-stats-section">
                <div className="stats-row">
                  {[
                    { icon: Clock, val: "< 30 giây", lbl: "Thời gian tạo hợp đồng" },
                    { icon: Shield, val: "100%", lbl: "Chính xác theo template gốc" },
                    { icon: Sparkles, val: "GPT-4o", lbl: "Mô hình AI tiên tiến nhất" },
                  ].map(s => (
                    <div key={s.lbl} className="stat-card">
                      <div className="stat-icon"><s.icon size={18} /></div>
                      <div>
                        <div className="stat-val">{s.val}</div>
                        <div className="stat-lbl">{s.lbl}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Suggestions ── */}
              <div className="hero-sug-section">
                <div className="section-label" style={{ marginBottom: 14 }}>Loại hợp đồng phổ biến</div>
                <div className="sug-grid">
                  {SUGGESTIONS.map(s => (
                    <button key={s.label} className="sug-card" onClick={() => { setInput(s.label); setView("chat"); }}>
                      <div className="sug-emoji">{s.icon}</div>
                      <div className="sug-name">{s.label}</div>
                      <div className="sug-desc">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════
              TEMPLATES VIEW
          ══════════════════════════════════ */}
          {view === "templates" && (
            <div className="tpl-page">
              <div className="tpl-inner">

                <div className="page-header">
                  <div className="page-title">Template Gallery</div>
                  <p className="page-sub">Upload file hợp đồng .docx — AI tự động nhận diện và điền thông tin</p>
                </div>

                {/* Step guide (only when no templates) */}
                {templates.length === 0 && (
                  <div className="guide-grid">
                    {[
                      { n: "01", icon: "📂", title: "Chọn file .docx", desc: "Kéo thả hoặc click để chọn file hợp đồng mẫu. Hỗ trợ nhiều file cùng lúc." },
                      { n: "02", icon: "🏷️", title: "Đặt danh mục", desc: "Nhập tên danh mục (VD: Lao động, KOC, Dịch vụ...) để AI phân loại." },
                      { n: "03", icon: "🚀", title: "Upload & Tạo hợp đồng", desc: "Nhấn Upload — AI phân tích ngay. Sau đó chat để tạo hợp đồng." },
                    ].map(s => (
                      <div key={s.n} className="guide-card">
                        <div className="guide-num">{s.n}</div>
                        <div className="guide-emoji">{s.icon}</div>
                        <div className="guide-title">{s.title}</div>
                        <div className="guide-desc">{s.desc}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload form */}
                <div className="upload-box">
                  <div className="upload-box-strip" />
                  <div className="upload-box-inner">
                    <div className="upload-box-title">Upload template mới</div>
                    <p className="upload-box-sub">AI phân tích và nhận diện tất cả trường cần điền tự động.</p>
                    <form onSubmit={handleBulkUpload}>
                      <div
                        className={`dropzone ${dragOver ? "over" : ""} ${uploadFiles.length ? "has-files" : ""}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={e => { e.preventDefault(); setDragOver(false); onFilesSelected(Array.from(e.dataTransfer.files)); }}
                      >
                        <input ref={fileInputRef} type="file" accept=".docx" multiple style={{ display: "none" }} onChange={e => onFilesSelected(Array.from(e.target.files ?? []))} />
                        {uploadFiles.length > 0 ? (
                          <>
                            <p style={{ fontWeight: 700, color: "var(--blue)", marginBottom: 3 }}>{uploadFiles.length} file đã chọn</p>
                            <p style={{ fontSize: 13, color: "var(--t4)" }}>Click để thay đổi</p>
                          </>
                        ) : (
                          <>
                            <div className="dz-icon"><Upload size={22} /></div>
                            <p style={{ fontWeight: 600, color: "var(--t2)", marginBottom: 5 }}>Kéo thả file vào đây</p>
                            <p style={{ fontSize: 13, color: "var(--t4)" }}>hoặc click để chọn · hỗ trợ nhiều file .docx</p>
                          </>
                        )}
                      </div>

                      {uploadFiles.length > 0 && (
                        <div className="file-list">
                          {uploadFiles.map(f => (
                            <div key={f.name} className="file-item">
                              {uploadProgress[f.name] === "done" ? <CheckCircle2 size={13} style={{ color: "var(--green)", flexShrink: 0 }} />
                                : uploadProgress[f.name] === "error" ? <X size={13} style={{ color: "var(--red)", flexShrink: 0 }} />
                                : uploading ? <Loader2 size={13} style={{ color: "var(--blue)", flexShrink: 0, animation: "spin 1s linear infinite" }} />
                                : <FileText size={13} style={{ color: "var(--t4)", flexShrink: 0 }} />}
                              <span>{f.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="upload-form-row">
                        <input className="form-input" type="text" value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} placeholder="Danh mục (VD: Lao động, Dịch vụ, KOC/KOL...)" required />
                        <button type="submit" className="btn-upload" disabled={uploading || !uploadFiles.length || !uploadCategory}>
                          {uploading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Đang xử lý...</> : <><Upload size={14} /> Upload</>}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Template grid */}
                {templates.length > 0 && (
                  <>
                    <div className="tpl-section-label">
                      Templates của bạn
                      <span className="tpl-count">{templates.length}</span>
                    </div>
                    <div className="tpl-grid">
                      {templates.map(t => (
                        <div key={t.id} className="tpl-card">
                          <div className="tpl-stripe" />
                          <button className="tpl-del" onClick={() => deleteTemplate(t.id)}><Trash2 size={12} /></button>
                          <div className="tpl-body">
                            <div className="tpl-head">
                              <div className="tpl-icon"><FileText size={18} /></div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="tpl-name">{t.name}</div>
                                <div className="tpl-cat">{t.category}</div>
                              </div>
                            </div>
                            <div className="tpl-foot">
                              <div className="tpl-fields"><FileText size={11} /> {t.placeholders.length} trường</div>
                              <button className="btn-use" onClick={() => { setView("create"); setCreateStep("select"); }}>
                                Dùng ngay <ChevronRight size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Go to chat CTA */}
                    <div className="goto-chat-bar">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 3 }}>
                          Sẵn sàng! Bạn có {templates.length} template
                        </div>
                        <div style={{ fontSize: 13, color: "var(--t3)" }}>Mô tả hợp đồng bằng tiếng Việt tự nhiên — AI sẽ tự điền</div>
                      </div>
                      <button className="btn-upload" onClick={() => { setView("create"); setCreateStep("select"); }}>
                        <Sparkles size={14} /> Tạo hợp đồng ngay <ArrowRight size={13} />
                      </button>
                    </div>
                  </>
                )}

                {templates.length === 0 && !uploading && (
                  <div className="empty-state">
                    <div className="empty-icon"><FileText size={28} /></div>
                    <p style={{ fontWeight: 600, color: "var(--t2)", marginBottom: 5, fontSize: 14 }}>Chưa có template nào</p>
                    <p style={{ fontSize: 13, color: "var(--t4)" }}>Upload file .docx ở trên để bắt đầu</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════
              CREATE VIEW
          ══════════════════════════════════ */}
          {view === "create" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>
              <div style={{ maxWidth: 760, margin: "0 auto" }}>

                {/* Step 1: Select template */}
                {createStep === "select" && (
                  <>
                    <div style={{ marginBottom: 28 }}>
                      <h2 style={{ fontFamily: "var(--display)", fontSize: 24, fontWeight: 800, color: "var(--ink)", marginBottom: 6 }}>Chọn mẫu hợp đồng</h2>
                      <p style={{ color: "var(--t3)", fontSize: 14 }}>Chọn template phù hợp để bắt đầu điền thông tin</p>
                    </div>
                    {templates.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "60px 0", color: "var(--t3)" }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Chưa có template nào</div>
                        <button className="btn-upload" onClick={() => setView("templates")}>Upload template ngay →</button>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                        {templates.map(t => (
                          <button key={t.id} onClick={() => selectTemplate(t)} style={{ background: "#fff", border: "1.5px solid var(--border)", borderRadius: 16, padding: "20px 18px", textAlign: "left", cursor: "pointer", transition: "all .18s", boxShadow: "var(--sh-xs)" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--blue)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--sh-blue)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--sh-xs)"; }}>
                            <div style={{ fontSize: 28, marginBottom: 10 }}>📄</div>
                            <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 6, lineHeight: 1.3 }}>{t.name}</div>
                            <div style={{ fontSize: 12, color: "var(--t3)", background: "var(--bg)", padding: "3px 8px", borderRadius: 6, display: "inline-block" }}>{t.category}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Step 2: Fill form */}
                {createStep === "form" && selectedTemplate && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                      <button onClick={() => { setCreateStep("select"); setPreviewHtml(""); }} style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, color: "var(--t2)", display: "flex", alignItems: "center", gap: 6 }}>
                        ← Quay lại
                      </button>
                      <div>
                        <h2 style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>{selectedTemplate.name}</h2>
                        <p style={{ color: "var(--t3)", fontSize: 13 }}>Điền thông tin vào các trường bên dưới</p>
                      </div>
                    </div>

                    {loadingFields ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "40px 0", color: "var(--t3)" }}>
                        <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "var(--blue)" }} />
                        Đang phân tích template...
                      </div>
                    ) : (
                      <form onSubmit={handleGenerate}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 28 }}>
                          {formFields.length === 0 ? (
                            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 16, color: "#92400e", fontSize: 14 }}>
                              ⚠️ Không phát hiện trường nào trong template. Hãy mô tả thông tin cần điền và AI sẽ tự điền vào các chỗ trống.
                            </div>
                          ) : null}
                          {formFields.map(f => (
                            <div key={f.name} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)" }}>{f.label}</label>
                              <input
                                type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                                value={formValues[f.name] ?? ""}
                                onChange={e => setFormValues(prev => ({ ...prev, [f.name]: e.target.value }))}
                                placeholder={`Nhập ${f.label.toLowerCase()}...`}
                                style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", transition: "border-color .15s" }}
                                onFocus={e => (e.target.style.borderColor = "var(--blue)")}
                                onBlur={e => (e.target.style.borderColor = "var(--border)")}
                              />
                            </div>
                          ))}
                          {formFields.length === 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)" }}>Thông tin cần điền</label>
                              <textarea
                                value={formValues["__freetext__"] ?? ""}
                                onChange={e => setFormValues({ "__freetext__": e.target.value })}
                                placeholder="Nhập thông tin: tên các bên, ngày ký, giá trị hợp đồng..."
                                rows={4}
                                style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", resize: "vertical" }}
                              />
                            </div>
                          )}
                        </div>

                        <button type="submit" className="btn-dl" disabled={generating} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", fontSize: 14 }}>
                          {generating ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Đang tạo...</> : <><Eye size={16} /> Tạo xem trước</>}
                        </button>
                      </form>
                    )}

                    {/* Preview */}
                    {previewHtml && (
                      <div style={{ marginTop: 32 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                          <h3 style={{ fontFamily: "var(--display)", fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>📄 Xem trước hợp đồng</h3>
                          <button onClick={handleCreatePdf} style={{ background: "linear-gradient(135deg, var(--blue), var(--teal))", color: "#fff", border: "none", borderRadius: 10, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
                            📄 Xuất PDF
                          </button>
                        </div>
                        <div className="doc-paper" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                      </div>
                    )}
                  </>
                )}

              </div>
            </div>
          )}

          {/* ══════════════════════════════════
              CHAT VIEW
          ══════════════════════════════════ */}
          {view === "chat" && (
            <div className="chat-page">
              <div className="chat-feed">

                {messages.length === 0 ? (
                  /* Loading state — initChat will populate messages */
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "var(--t4)", fontSize: 14 }}>
                    <Loader2 size={18} style={{ animation: "spin 1s linear infinite", marginRight: 8 }} /> Đang khởi động...
                  </div>
                ) : (
                  /* Messages */
                  <div className="chat-messages">
                    {messages.map(m => (
                      <div key={m.id} className={`msg-row ${m.role === "user" ? "user" : ""}`}>
                        <div className={`msg-av ${m.role === "user" ? "u" : "ai"}`}>
                          {m.role === "user" ? "K" : "⚡"}
                        </div>
                        <div className="msg-body">
                          <div className="msg-name">{m.role === "user" ? "Bạn" : "Contract AI"}</div>
                          {m.role === "user" && (
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                              <div className="user-bubble">{m.text}</div>
                            </div>
                          )}
                          {m.role === "assistant" && m.isLoading && (
                            <div className="dots"><span /><span /><span /></div>
                          )}
                          {m.role === "assistant" && !m.isLoading && (
                            <>
                              {m.text && <div className="ai-text" style={{ whiteSpace: "pre-line" }}>{m.text.replace(/\*\*(.+?)\*\*/g, "$1")}</div>}

                              {/* Template picker */}
                              {m.showTemplates !== undefined && (
                                <TemplatePicker
                                  templates={m.showTemplates}
                                  onSelect={selectTemplateInChat}
                                />
                              )}

                              {/* Inline form */}
                              {m.formTemplateId && m.formFields && (
                                <InlineChatForm
                                  templateId={m.formTemplateId}
                                  templateName={m.formTemplateName ?? "Hợp đồng"}
                                  fields={m.formFields}
                                  prefilled={m.formPrefilled ?? {}}
                                  onSubmit={handleChatFormSubmit}
                                />
                              )}

                              {/* Inline preview */}
                              {m.previewHtmlInline && (
                                <InlineContractPreview
                                  html={m.previewHtmlInline}
                                  contract={m.contract!}
                                  onPdf={() => handlePdf(m.contract!)}
                                  onExport={() => handleExport(m.contract!)}
                                  exporting={exporting}
                                />
                              )}

                              {/* Contract card (no preview — legacy) */}
                              {m.contract && !m.previewHtmlInline && (
                                <ContractCard
                                  contract={m.contract}
                                  exporting={exporting}
                                  onPreview={() => openPreview(m.contract!)}
                                  onExport={() => handleExport(m.contract!)}
                                />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {/* Input bar */}
              <div className="chat-input-zone">
                <div className="chat-input-inner">
                  <div className="input-box">
                    <textarea
                      ref={textareaRef}
                      className="input-ta"
                      placeholder='VD: "Tạo hợp đồng KOC với Nguyễn Thị B, phí 5 triệu, chiến dịch mỹ phẩm XYZ, 3 tháng từ 01/06/2026"'
                      value={input}
                      rows={2}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                      }}
                    />
                    <div className="input-footer">
                      <div className="input-hint">⏎ Enter để gửi · Shift+Enter xuống dòng</div>
                      <div className="input-actions">
                        <button className={`btn-icon ${isListening ? "rec" : ""}`} onClick={toggleVoice} title="Giọng nói">
                          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                        <button className="btn-send" onClick={() => handleSend()} disabled={!input.trim()}>
                          <Send size={14} /> Gửi
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ══ PREVIEW MODAL ══ */}
      {previewModal && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setPreviewModal(null); }}>
          <div className="modal">
            <div className="modal-strip" />
            <div className="modal-head">
              <div>
                <div className="modal-title">{previewModal.templateName}</div>
                <div className="modal-meta">
                  {Object.values(previewModal.filled).filter(Boolean).length}/{previewModal.placeholders.length} trường đã điền
                  {previewModal.missing.length > 0 && ` · còn thiếu: ${previewModal.missing.slice(0,3).join(", ")}`}
                </div>
              </div>
              <button className="btn-close" onClick={() => setPreviewModal(null)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              {loadingPreview || previewModal.previewHtml === "" ? (
                <div className="loading-c">
                  <Loader2 size={22} style={{ color: "var(--blue)", animation: "spin 1s linear infinite" }} />
                  Đang tải nội dung hợp đồng...
                </div>
              ) : (
                <div className="doc-paper" dangerouslySetInnerHTML={{ __html: previewModal.previewHtml ?? "" }} />
              )}
            </div>
            {previewModal.missing.length > 0 && (
              <div className="modal-missing">
                <span style={{ flexShrink: 0 }}>⚠️</span>
                <span><strong>Còn thiếu:</strong> {previewModal.missing.join(", ")} — có thể bổ sung thêm qua chat.</span>
              </div>
            )}
            <div className="modal-foot">
              <button className="btn-cancel" onClick={() => setPreviewModal(null)}><X size={13} /> Đóng</button>
              <button className="btn-pdf" onClick={() => handlePdf(previewModal)}>📄 Xuất PDF</button>
              <button className="btn-dl" onClick={() => handleExport(previewModal)} disabled={exporting}>
                {exporting
                  ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Đang xuất...</>
                  : <><Download size={15} /> Tải DOCX</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </>
  );
}

/* ─────────────────────────────────────────────
   TEMPLATE PICKER COMPONENT
───────────────────────────────────────────── */
type TemplateType = { id: string; name: string; category: string; placeholders: { name: string; label: string; type: string }[] };

function TemplatePicker({ templates, onSelect }: { templates: TemplateType[]; onSelect: (t: TemplateType) => void }) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [dropdownVal, setDropdownVal] = React.useState("");

  if (templates.length === 0) {
    return (
      <div style={{ marginTop: 10, padding: "12px 14px", background: "#fff8e1", border: "1px solid #fde68a", borderRadius: 10, fontSize: 13, color: "#92400e" }}>
        ⚠️ Chưa có template nào. Vào <strong>Templates</strong> để upload file .docx trước nhé!
      </div>
    );
  }

  if (templates.length > 5) {
    return (
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".04em" }}>Chọn mẫu hợp đồng:</div>
        <select
          value={dropdownVal}
          onChange={e => setDropdownVal(e.target.value)}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14, color: "var(--ink)", background: "#fff", outline: "none", fontFamily: "inherit", cursor: "pointer" }}
        >
          <option value="">-- Chọn loại hợp đồng --</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
        </select>
        <button
          disabled={!dropdownVal}
          onClick={() => { const t = templates.find(x => x.id === dropdownVal); if (t) { setSelected(t.id); onSelect(t); } }}
          style={{ alignSelf: "flex-start", background: dropdownVal ? "linear-gradient(135deg,var(--blue),var(--teal))" : "var(--border)", color: dropdownVal ? "#fff" : "var(--t4)", border: "none", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: dropdownVal ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 7 }}
        >
          ✓ Chọn mẫu này
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".04em" }}>Chọn mẫu hợp đồng:</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {templates.map(t => (
          <button
            key={t.id}
            disabled={selected !== null}
            onClick={() => { setSelected(t.id); onSelect(t); }}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 15px",
              background: selected === t.id ? "var(--bsoft)" : "#fff",
              border: `1.5px solid ${selected === t.id ? "var(--blue)" : "var(--border)"}`,
              borderRadius: 11, cursor: selected ? "default" : "pointer",
              textAlign: "left", transition: "all .15s", fontFamily: "inherit",
              opacity: selected !== null && selected !== t.id ? 0.5 : 1,
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 9, background: selected === t.id ? "var(--blue)" : "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, transition: "all .15s" }}>
              {selected === t.id ? "✓" : "📄"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: selected === t.id ? "var(--blue)" : "var(--ink)", marginBottom: 2 }}>{t.name}</div>
              <div style={{ fontSize: 11, color: "var(--t4)", background: "var(--bg)", padding: "2px 7px", borderRadius: 5, display: "inline-block" }}>{t.category}</div>
            </div>
            {selected !== t.id && <div style={{ color: "var(--blue)", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Chọn →</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   INLINE CONTRACT PREVIEW COMPONENT
───────────────────────────────────────────── */
function InlineContractPreview({ html, contract, onPdf, onExport, exporting }: {
  html: string; contract: { templateName: string; filled: Record<string, string> };
  onPdf: () => void; onExport: () => void; exporting: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div style={{ marginTop: 12, background: "#fff", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--sh-sm)" }}>
      <div style={{ height: 3, background: "linear-gradient(90deg,var(--blue),var(--teal))" }} />
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bsoft)", border: "1px solid var(--bborder)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>📄</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{contract.templateName}</div>
          <div style={{ fontSize: 11, color: "var(--t4)" }}>Hợp đồng đã hoàn chỉnh</div>
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 11px", fontSize: 12, fontWeight: 600, color: "var(--t2)", cursor: "pointer" }}>
          {expanded ? "Thu gọn ▲" : "Xem trước ▼"}
        </button>
      </div>
      {expanded && (
        <div className="doc-paper" style={{ maxHeight: 480, overflowY: "auto", borderRadius: 0 }}
          dangerouslySetInnerHTML={{ __html: html }} />
      )}
      <div style={{ padding: "10px 16px", display: "flex", gap: 8, background: "var(--bg)" }}>
        <button onClick={onPdf} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,var(--blue),var(--teal))", color: "#fff", border: "none", cursor: "pointer" }}>
          📄 Xuất PDF
        </button>
        <button onClick={onExport} disabled={exporting} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#fff", border: "1px solid var(--border2)", color: "var(--t2)", cursor: "pointer", opacity: exporting ? .6 : 1 }}>
          {exporting ? "Đang xuất..." : "⬇ Tải DOCX"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   INLINE CHAT FORM COMPONENT
───────────────────────────────────────────── */
function InlineChatForm({ templateId, templateName, fields, prefilled = {}, onSubmit }: {
  templateId: string;
  templateName: string;
  fields: { name: string; label: string; type: string }[];
  prefilled?: Record<string, string>;
  onSubmit: (e: React.FormEvent, templateId: string, values: Record<string, string>) => void;
}) {
  const [values, setValues] = React.useState<Record<string, string>>(prefilled);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitted) return;
    setSubmitting(true);
    setSubmitted(true);
    await onSubmit(e, templateId, values);
    setSubmitting(false);
  }

  if (submitted) return null;

  return (
    <form onSubmit={handleSubmit} style={{ background: "#f8faff", border: "1.5px solid var(--border)", borderRadius: 14, padding: "18px 18px 14px", marginTop: 8, display: "flex", flexDirection: "column", gap: 14 }}>
      {fields.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".04em" }}>Thông tin cần điền</label>
          <textarea
            value={values["__freetext__"] ?? ""}
            onChange={e => setValues({ "__freetext__": e.target.value })}
            placeholder="Nhập thông tin: tên các bên, ngày ký, giá trị hợp đồng..."
            rows={3}
            style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid var(--border)", fontSize: 13, color: "var(--ink)", background: "#fff", outline: "none", resize: "vertical", fontFamily: "inherit" }}
          />
        </div>
      ) : (
        fields.map(f => (
          <div key={f.name} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".04em" }}>{f.label}</label>
            <input
              type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
              value={values[f.name] ?? ""}
              onChange={e => setValues(prev => ({ ...prev, [f.name]: e.target.value }))}
              placeholder={`Nhập ${f.label.toLowerCase()}...`}
              style={{ padding: "9px 12px", borderRadius: 8, border: "1.5px solid var(--border)", fontSize: 13, color: "var(--ink)", background: "#fff", outline: "none", fontFamily: "inherit" }}
            />
          </div>
        ))
      )}
      <button type="submit" disabled={submitting} style={{ alignSelf: "flex-start", background: "linear-gradient(135deg, var(--blue), var(--teal))", color: "#fff", border: "none", borderRadius: 9, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, opacity: submitting ? .7 : 1 }}>
        {submitting ? "Đang tạo..." : "✓ Tạo hợp đồng"}
      </button>
    </form>
  );
}

/* ─────────────────────────────────────────────
   CONTRACT CARD COMPONENT
───────────────────────────────────────────── */
function ContractCard({ contract, exporting, onPreview, onExport }: {
  contract: ContractData; exporting: boolean;
  onPreview: () => void; onExport: () => void;
}) {
  const filledCount = Object.values(contract.filled).filter(Boolean).length;
  const total = contract.placeholders.length;
  const pct = total ? Math.round((filledCount / total) * 100) : 100;

  return (
    <div className="cc-card">
      <div className="cc-strip" />
      <div className="cc-head">
        <div className="cc-doc">
          <FileText size={20} style={{ color: "var(--blue)", position: "relative", zIndex: 1 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cc-eyebrow"><Sparkles size={10} /> Hợp đồng đã tạo</div>
          <div className="cc-name">{contract.templateName}</div>
          <div className="cc-badges">
            <span className="cc-badge" style={{ background: "var(--bsoft)", color: "var(--blue)", border: "1px solid var(--bborder)" }}>
              {filledCount}/{total} trường đã điền
            </span>
            {contract.missing.length > 0 && (
              <span className="cc-badge" style={{ background: "#fffbeb", color: "var(--amber)", border: "1px solid #fde68a" }}>
                ⚠️ {contract.missing.length} trường trống
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="cc-fields">
        <div className="cc-prog">
          <div className="prog-track"><div className="prog-fill" style={{ width: `${pct}%` }} /></div>
          <span className="prog-pct">{pct}%</span>
        </div>
      </div>
      <div className="cc-actions">
        <button className="btn-sec" onClick={onPreview}><Eye size={14} /> Xem trước</button>
        <button className="btn-pri" onClick={onExport} disabled={exporting}>
          {exporting ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Đang xuất...</>
            : <><Download size={14} /> Tải DOCX</>}
        </button>
      </div>
    </div>
  );
}
