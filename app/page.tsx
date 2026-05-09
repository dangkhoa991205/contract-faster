import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";

export default function LandingPage() {
  return (
    <div
      style={{
        background: "#080810",
        color: "#f1f1f3",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        .fade-up { animation: fadeUp 0.7s ease both; }
        .fade-up-1 { animation: fadeUp 0.7s ease 0.1s both; }
        .fade-up-2 { animation: fadeUp 0.7s ease 0.2s both; }
        .fade-up-3 { animation: fadeUp 0.7s ease 0.35s both; }
        .fade-up-4 { animation: fadeUp 0.7s ease 0.5s both; }
        .marquee-track { animation: marquee 28s linear infinite; }
        .code-block {
          background: #0e0e1a;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 20px;
          font-family: var(--font-geist-mono), 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.75;
          overflow-x: auto;
        }
        .token-keyword   { color: #c084fc; }
        .token-string    { color: #86efac; }
        .token-comment   { color: #4b5563; font-style: italic; }
        .token-fn        { color: #67e8f9; }
        .token-var       { color: #fde68a; }
        .token-prop      { color: #a5b4fc; }
        .token-num       { color: #fb923c; }
        .token-type      { color: #f9a8d4; }
        .glow-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          transition: border-color 0.2s, background 0.2s;
        }
        .glow-card:hover {
          border-color: rgba(99,102,241,0.4);
          background: rgba(99,102,241,0.05);
        }
        .btn-primary {
          background: #6366f1;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background 0.15s;
          white-space: nowrap;
        }
        .btn-primary:hover { background: #4f46e5; }
        .btn-ghost {
          color: #9ca3af;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: color 0.15s, background 0.15s;
        }
        .btn-ghost:hover { color: white; background: rgba(255,255,255,0.06); }
        .section-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 100px;
          padding: 4px 14px;
          font-size: 12px;
          color: #a5b4fc;
          font-weight: 500;
          letter-spacing: 0.02em;
          margin-bottom: 20px;
        }
        .nav-link {
          color: #9ca3af;
          font-size: 14px;
          text-decoration: none;
          transition: color 0.15s;
        }
        .nav-link:hover { color: white; }
        .feature-icon {
          width: 36px; height: 36px;
          background: rgba(99,102,241,0.15);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); }
        .terminal-dot { width: 10px; height: 10px; border-radius: 50%; }
        .check-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .check-item:last-child { border-bottom: none; }
        .testimonial-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 24px;
        }
        .logo-item {
          color: #4b5563;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          white-space: nowrap;
          padding: 0 32px;
          transition: color 0.2s;
        }
        .logo-item:hover { color: #6b7280; }

        /* Mobile nav toggle */
        #mobile-menu { display: none; }
        #mobile-menu-toggle { display: none; }
        @media (max-width: 767px) {
          #nav-links { display: none !important; }
          #mobile-menu-toggle { display: flex; }
        }

        /* Placeholder highlight */
        .placeholder-highlight {
          background: rgba(99,102,241,0.2);
          color: #c7d2fe;
          border-radius: 3px;
          padding: 1px 6px;
          border: 1px dashed rgba(99,102,241,0.4);
        }
        .placeholder-highlight-green {
          background: rgba(34,197,94,0.15);
          color: #86efac;
          border-radius: 3px;
          padding: 1px 6px;
          border: 1px dashed rgba(34,197,94,0.3);
        }
      `}</style>

      {/* DOT GRID OVERLAY */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
          backgroundSize: "32px 32px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* HERO GLOW */}
      <div
        style={{
          position: "absolute",
          top: "-120px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(600px, 100vw)",
          height: "400px",
          background:
            "radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ─── NAV ─── */}
        <nav className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-8">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 no-underline"
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  background: "linear-gradient(135deg, #6366f1, #a855f7)",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                ⚡
              </div>
              <span
                style={{
                  color: "white",
                  fontWeight: 600,
                  fontSize: 15,
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                }}
              >
                Contract Faster
              </span>
            </Link>

            {/* Desktop nav links — hidden on mobile */}
            <div id="nav-links" className="hidden md:flex gap-1 items-center">
              {[
                { label: "Pricing", href: "/pricing" },
                { label: "Docs", href: "#" },
                { label: "Blog", href: "#" },
                { label: "Changelog", href: "#" },
              ].map((item) => (
                <a key={item.label} href={item.href} className="nav-link btn-ghost">
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop CTA buttons */}
            <Link href="/auth/login" className="btn-ghost hidden md:inline-flex">
              Sign in
            </Link>
            <Link href="/auth/login" className="btn-primary">
              Get started →
            </Link>
          </div>
        </nav>

        {/* ─── HERO ─── */}
        <section className="max-w-[760px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 sm:pt-20 sm:pb-16 text-center">
          <div className="section-label fade-up">
            <span style={{ color: "#6366f1" }}>✦</span>
            AI-powered · Built for teams
          </div>

          <h1
            className="fade-up-1"
            style={{
              fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "white",
              margin: "0 0 20px",
            }}
          >
            Contracts that close
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #818cf8, #c084fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              10× faster
            </span>
          </h1>

          <p
            className="fade-up-2"
            style={{
              fontSize: "clamp(15px, 2.5vw, 18px)",
              color: "#9ca3af",
              lineHeight: 1.7,
              margin: "0 auto 32px",
              maxWidth: 520,
            }}
          >
            Upload your templates, let AI fill the details, export
            professional contracts in seconds. No lawyers needed for the
            routine stuff.
          </p>

          <div
            className="fade-up-3 flex gap-3 justify-center flex-wrap"
          >
            <Link
              href="/auth/login"
              className="btn-primary w-full sm:w-auto justify-center"
              style={{ padding: "12px 24px", fontSize: 15 }}
            >
              Start for free
            </Link>
            <a
              href="#"
              className="btn-ghost w-full sm:w-auto justify-center"
              style={{
                padding: "12px 24px",
                fontSize: 15,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              View demo ↗
            </a>
          </div>

          {/* Hero UI mockup */}
          <div
            className="fade-up-4"
            style={{
              marginTop: 48,
              background: "#0e0e1a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)",
            }}
          >
            {/* Window chrome */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#0a0a14",
              }}
            >
              <div className="terminal-dot" style={{ background: "#ef4444" }} />
              <div className="terminal-dot" style={{ background: "#f59e0b" }} />
              <div className="terminal-dot" style={{ background: "#22c55e" }} />
              <div
                style={{
                  marginLeft: 12,
                  color: "#4b5563",
                  fontSize: 12,
                  fontFamily: "var(--font-geist-mono)",
                }}
              >
                Service Agreement · AI filling...
              </div>
            </div>

            {/* Mockup content — scrollable horizontally on mobile */}
            <div
              style={{ overflowX: "auto" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 0,
                  minWidth: 480,
                }}
              >
                {/* Left: form */}
                <div
                  style={{
                    padding: "20px",
                    borderRight: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 16,
                    }}
                  >
                    Contract Fields
                  </p>
                  {[
                    { label: "Party A (Provider)", value: "Acme Studio Ltd.", ai: false },
                    { label: "Party B (Client)", value: "Tech Startup Inc.", ai: false },
                    { label: "Contract Value", value: "$24,000", ai: true },
                    { label: "Start Date", value: "June 1, 2026", ai: true },
                    { label: "Duration", value: "12 months", ai: true },
                  ].map((field) => (
                    <div key={field.label} style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ color: "#9ca3af", fontSize: 12 }}>
                          {field.label}
                        </span>
                        {field.ai && (
                          <span
                            style={{
                              color: "#a5b4fc",
                              fontSize: 10,
                              background: "rgba(99,102,241,0.12)",
                              borderRadius: 4,
                              padding: "1px 6px",
                            }}
                          >
                            AI ✦
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 6,
                          padding: "7px 12px",
                          fontSize: 13,
                          color: field.ai ? "#c7d2fe" : "#e5e7eb",
                        }}
                      >
                        {field.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right: contract preview */}
                <div style={{ padding: "20px" }}>
                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 16,
                    }}
                  >
                    Preview
                  </p>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      lineHeight: 2,
                      fontFamily: "var(--font-geist-mono)",
                    }}
                  >
                    <p style={{ color: "#e5e7eb", fontWeight: 600, marginBottom: 8 }}>
                      SERVICE AGREEMENT
                    </p>
                    <p>
                      This Agreement is entered into between{" "}
                      <span style={{ color: "#a5b4fc" }}>Acme Studio Ltd.</span>{" "}
                      (&ldquo;Provider&rdquo;) and{" "}
                      <span style={{ color: "#a5b4fc" }}>Tech Startup Inc.</span>{" "}
                      (&ldquo;Client&rdquo;)...
                    </p>
                    <p style={{ marginTop: 8 }}>
                      Total value:{" "}
                      <span style={{ color: "#86efac" }}>$24,000</span> over{" "}
                      <span style={{ color: "#86efac" }}>12 months</span>
                      , commencing{" "}
                      <span style={{ color: "#86efac" }}>June 1, 2026</span>.
                    </p>
                    <div
                      style={{
                        marginTop: 16,
                        height: 1,
                        background: "rgba(255,255,255,0.06)",
                      }}
                    />
                    {["Payment terms", "Deliverables", "Termination clause"].map(
                      (s) => (
                        <div
                          key={s}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 8,
                          }}
                        >
                          <span style={{ color: "#22c55e" }}>✓</span>
                          <span style={{ color: "#6b7280" }}>{s}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#0a0a14",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span style={{ color: "#4b5563", fontSize: 12 }}>
                ✦ AI filled 3 fields automatically
              </span>
              <button
                style={{
                  background: "#6366f1",
                  color: "white",
                  border: "none",
                  padding: "6px 16px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Export .docx ↓
              </button>
            </div>
          </div>
        </section>

        {/* ─── TRUSTED BY ─── */}
        <ScrollReveal>
          <section
            style={{
              padding: "24px 0 48px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              overflow: "hidden",
            }}
          >
            <p
              style={{
                textAlign: "center",
                color: "#374151",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 24,
              }}
            >
              Trusted by teams at
            </p>
            <div style={{ overflow: "hidden", position: "relative" }}>
              <div
                className="marquee-track"
                style={{ display: "flex", width: "max-content" }}
              >
                {[
                  "ACME CORP",
                  "VERITAS LAW",
                  "SWIFT BUILD",
                  "NOVA TECH",
                  "PEAK AGENCY",
                  "BRIGHT MEDIA",
                  "STACK HQ",
                  "OPEN VENTURES",
                  "ACME CORP",
                  "VERITAS LAW",
                  "SWIFT BUILD",
                  "NOVA TECH",
                  "PEAK AGENCY",
                  "BRIGHT MEDIA",
                  "STACK HQ",
                  "OPEN VENTURES",
                ].map((name, i) => (
                  <span key={i} className="logo-item">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ─── SDK INTEGRATION SECTION ─── */}
        <ScrollReveal>
          <section className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
              <div>
                <div className="section-label">Integrate in minutes</div>
                <h2
                  style={{
                    fontSize: "clamp(28px, 4vw, 36px)",
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "white",
                    margin: "0 0 16px",
                    lineHeight: 1.2,
                  }}
                >
                  Add to your app
                  <br />
                  with a few lines of code
                </h2>
                <p style={{ color: "#6b7280", lineHeight: 1.7, marginBottom: 32 }}>
                  Our SDK handles template loading, AI placeholder detection,
                  field filling, and DOCX generation. Ship contract features in
                  an afternoon, not a sprint.
                </p>
                <div style={{ display: "flex", gap: 12 }}>
                  <a href="#" className="btn-primary">
                    Read the docs →
                  </a>
                </div>
              </div>

              {/* Code block — scrollable on mobile */}
              <div className="code-block overflow-x-auto">
                <div style={{ color: "#4b5563", marginBottom: 16 }}>
                  {"// Install the SDK"}
                </div>
                <div style={{ marginBottom: 20 }}>
                  <span style={{ color: "#6b7280" }}>$ </span>
                  <span style={{ color: "#86efac" }}>
                    npm install @contractfaster/sdk
                  </span>
                </div>
                <div>
                  <span className="token-keyword">import </span>
                  <span className="token-type">{"{ ContractFaster }"}</span>
                  <span className="token-keyword"> from </span>
                  <span className="token-string">
                    &quot;@contractfaster/sdk&quot;
                  </span>
                  <br />
                  <br />
                  <span className="token-keyword">const </span>
                  <span className="token-var">cf</span>
                  <span> = </span>
                  <span className="token-keyword">new </span>
                  <span className="token-fn">ContractFaster</span>
                  <span>{"({ "}</span>
                  <span className="token-prop">apiKey</span>
                  <span>{": "}</span>
                  <span className="token-string">&quot;cf_live_...&quot;</span>
                  <span>{" })"}</span>
                  <br />
                  <br />
                  <span className="token-keyword">const </span>
                  <span className="token-var">contract</span>
                  <span> = </span>
                  <span className="token-keyword">await </span>
                  <span className="token-var">cf</span>
                  <span>.</span>
                  <span className="token-prop">contracts</span>
                  <span>.</span>
                  <span className="token-fn">create</span>
                  <span>{"({"}</span>
                  <br />
                  {"  "}
                  <span className="token-prop">template</span>
                  <span>{": "}</span>
                  <span className="token-string">
                    &quot;service-agreement&quot;
                  </span>
                  <span>{","}</span>
                  <br />
                  {"  "}
                  <span className="token-prop">parties</span>
                  <span>{": ["}</span>
                  <br />
                  {"    "}
                  <span>
                    {"{ "}
                    <span className="token-prop">name</span>: <span className="token-string">&quot;Acme Corp&quot;</span>,{" "}
                    <span className="token-prop">role</span>: <span className="token-string">&quot;client&quot;</span>
                    {" }"}
                  </span>
                  <br />
                  {"  "}
                  <span>{"],"}</span>
                  <br />
                  {"  "}
                  <span className="token-prop">ai</span>
                  <span>{": "}</span>
                  <span className="token-keyword">true</span>
                  <span>{","}</span>
                  <br />
                  {"  "}
                  <span className="token-prop">output</span>
                  <span>{": "}</span>
                  <span className="token-string">&quot;docx&quot;</span>
                  <br />
                  <span>{"}"}</span>
                  <span>)</span>
                  <br />
                  <br />
                  <span className="token-comment">
                    {"// ✓ Contract ready in < 2 seconds"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        <hr className="divider" />

        {/* ─── DEVELOPER EXPERIENCE ─── */}
        <ScrollReveal>
          <section className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="text-center mb-12 sm:mb-16">
              <div className="section-label" style={{ display: "inline-flex" }}>
                Developer experience
              </div>
              <h2
                style={{
                  fontSize: "clamp(28px, 4vw, 36px)",
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: "white",
                  margin: "0 auto",
                  maxWidth: 500,
                  lineHeight: 1.2,
                }}
              >
                First-class developer
                <br />
                experience
              </h2>
            </div>

            {/* Cards: 1 col mobile → 2 col desktop (CLI card spans 2 rows on desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CLI card */}
              <ScrollReveal delay={0} className="md:row-span-2">
                <div className="glow-card h-full" style={{ padding: "28px" }}>
                  <div style={{ marginBottom: 20 }}>
                    <span className="feature-icon">🖥️</span>
                  </div>
                  <h3
                    style={{
                      color: "white",
                      fontWeight: 600,
                      fontSize: 18,
                      marginBottom: 8,
                    }}
                  >
                    Powerful CLI
                  </h3>
                  <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                    Generate contracts, manage templates, and preview outputs
                    straight from your terminal.
                  </p>
                  <div className="code-block" style={{ fontSize: 12 }}>
                    <div>
                      <span style={{ color: "#6b7280" }}>$ </span>
                      <span className="token-fn">cf</span>
                      <span> generate </span>
                      <span className="token-string">service-agreement</span>
                    </div>
                    <div style={{ marginTop: 8, color: "#22c55e" }}>
                      ✓ Template loaded (6 placeholders)
                    </div>
                    <div style={{ color: "#22c55e" }}>✓ AI filled 4 fields</div>
                    <div style={{ color: "#22c55e" }}>✓ Exported → output.docx</div>
                    <div style={{ marginTop: 8, color: "#4b5563" }}>
                      Done in 1.8s
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* TypeScript card */}
              <ScrollReveal delay={100}>
                <div className="glow-card h-full" style={{ padding: "28px" }}>
                  <div style={{ marginBottom: 16 }}>
                    <span className="feature-icon">🔷</span>
                  </div>
                  <h3
                    style={{
                      color: "white",
                      fontWeight: 600,
                      fontSize: 16,
                      marginBottom: 8,
                    }}
                  >
                    TypeScript-first SDK
                  </h3>
                  <p style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.6 }}>
                    Full type safety for every template, field, and output. Your
                    IDE knows the shape of every contract.
                  </p>
                </div>
              </ScrollReveal>

              {/* Webhooks card */}
              <ScrollReveal delay={200}>
                <div className="glow-card h-full" style={{ padding: "28px" }}>
                  <div style={{ marginBottom: 16 }}>
                    <span className="feature-icon">🔗</span>
                  </div>
                  <h3
                    style={{
                      color: "white",
                      fontWeight: 600,
                      fontSize: 16,
                      marginBottom: 8,
                    }}
                  >
                    Webhooks & Events
                  </h3>
                  <p style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.6 }}>
                    Get notified when contracts are created, signed, or expired.
                    Build automations on top.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </section>
        </ScrollReveal>

        <hr className="divider" />

        {/* ─── AI EDITOR SECTION ─── */}
        <ScrollReveal>
          <section className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
              {/* Editor mockup */}
              <div
                style={{
                  background: "#0e0e1a",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    background: "#0a0a14",
                  }}
                >
                  <div style={{ display: "flex", gap: 6 }}>
                    <div className="terminal-dot" style={{ background: "#374151" }} />
                    <div className="terminal-dot" style={{ background: "#374151" }} />
                    <div className="terminal-dot" style={{ background: "#374151" }} />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      fontSize: 12,
                      color: "#4b5563",
                    }}
                  >
                    {["Editor", "Preview", "AI Chat"].map((tab, i) => (
                      <span
                        key={tab}
                        style={{
                          color: i === 0 ? "white" : "#4b5563",
                          paddingBottom: 2,
                          borderBottom: i === 0 ? "1px solid #6366f1" : "none",
                          cursor: "pointer",
                        }}
                      >
                        {tab}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ padding: "20px" }}>
                  {/* Toolbar */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 16,
                      padding: "8px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.06)",
                      flexWrap: "wrap",
                    }}
                  >
                    {["B", "I", "U", "|", "H1", "H2", "|", "⟨⟩"].map(
                      (btn, i) => (
                        <button
                          key={i}
                          style={{
                            background: "none",
                            border: "none",
                            color: btn === "|" ? "#374151" : "#6b7280",
                            fontSize: 12,
                            cursor: "pointer",
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontWeight: btn === "B" ? 700 : 400,
                          }}
                        >
                          {btn}
                        </button>
                      )
                    )}
                    <div style={{ marginLeft: "auto" }}>
                      <span
                        style={{
                          background: "rgba(99,102,241,0.15)",
                          color: "#a5b4fc",
                          borderRadius: 4,
                          padding: "3px 8px",
                          fontSize: 11,
                        }}
                      >
                        ✦ AI Assist
                      </span>
                    </div>
                  </div>
                  {/* Editor content */}
                  <div
                    style={{
                      fontFamily: "var(--font-geist-mono)",
                      fontSize: 13,
                      lineHeight: 2,
                      color: "#9ca3af",
                    }}
                  >
                    <p
                      style={{
                        color: "white",
                        fontSize: 15,
                        fontWeight: 600,
                        marginBottom: 12,
                      }}
                    >
                      SERVICE AGREEMENT
                    </p>
                    <p>
                      This Service Agreement (&quot;Agreement&quot;) is made as
                      of{" "}
                      <span className="placeholder-highlight">START_DATE</span>{" "}
                      between...
                    </p>
                    <p style={{ marginTop: 8 }}>
                      <span className="placeholder-highlight">PROVIDER_NAME</span>{" "}
                      agrees to provide{" "}
                      <span className="placeholder-highlight">SERVICES</span>{" "}
                      for a total of{" "}
                      <span className="placeholder-highlight-green">CONTRACT_VALUE</span>
                      .
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="section-label">Beautiful editor</div>
                <h2
                  style={{
                    fontSize: "clamp(28px, 4vw, 36px)",
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "white",
                    margin: "0 0 16px",
                    lineHeight: 1.2,
                  }}
                >
                  Write using a
                  <br />
                  delightful editor
                </h2>
                <p style={{ color: "#6b7280", lineHeight: 1.7, marginBottom: 32 }}>
                  Our rich-text editor highlights every placeholder in your
                  template. Click any field to fill it — or let AI handle it for
                  you.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    {
                      icon: "⚡",
                      title: "Instant placeholder detection",
                      desc: "Upload any .docx — AI finds every fill-in spot automatically.",
                    },
                    {
                      icon: "🤖",
                      title: "Smart fill suggestions",
                      desc: "AI suggests values based on context, saving you typing.",
                    },
                    {
                      icon: "💬",
                      title: "Ask AI about any clause",
                      desc: "Chat sidebar explains legal language in plain English.",
                    },
                  ].map((item, idx) => (
                    <ScrollReveal key={item.title} delay={idx * 100}>
                      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                        <div className="feature-icon">{item.icon}</div>
                        <div>
                          <p
                            style={{
                              color: "white",
                              fontWeight: 500,
                              fontSize: 14,
                              marginBottom: 4,
                            }}
                          >
                            {item.title}
                          </p>
                          <p style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.6 }}>
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        <hr className="divider" />

        {/* ─── GO BEYOND ─── */}
        <ScrollReveal>
          <section className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
              <div>
                <div className="section-label">Go beyond templates</div>
                <h2
                  style={{
                    fontSize: "clamp(28px, 4vw, 36px)",
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "white",
                    margin: "0 0 16px",
                    lineHeight: 1.2,
                  }}
                >
                  Contract management
                  <br />
                  for your whole team
                </h2>
                <p style={{ color: "#6b7280", lineHeight: 1.7, marginBottom: 32 }}>
                  Share templates with teammates, track every contract in one
                  dashboard, and never lose a signed document again.
                </p>
                <div
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  {[
                    { emoji: "📁", name: "Templates", count: "12 shared", color: "#a5b4fc" },
                    { emoji: "📝", name: "Active contracts", count: "34 this month", color: "#86efac" },
                    { emoji: "👥", name: "Team members", count: "8 people", color: "#fde68a" },
                    { emoji: "⚡", name: "Avg. time to sign", count: "< 4 hours", color: "#f9a8d4" },
                  ].map((item, i, arr) => (
                    <div
                      key={item.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 20px",
                        borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 16 }}>{item.emoji}</span>
                        <span style={{ color: "#9ca3af", fontSize: 14 }}>{item.name}</span>
                      </div>
                      <span style={{ color: item.color, fontSize: 13, fontWeight: 500 }}>
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="section-label">AI everywhere</div>
                <h2
                  style={{
                    fontSize: "clamp(28px, 4vw, 36px)",
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "white",
                    margin: "0 0 16px",
                    lineHeight: 1.2,
                  }}
                >
                  Build with AI
                  <br />
                  on every step
                </h2>
                <p style={{ color: "#6b7280", lineHeight: 1.7, marginBottom: 32 }}>
                  From detecting what needs to be filled, to suggesting values,
                  to explaining clauses — GPT-4o is embedded throughout the
                  workflow.
                </p>
                <div className="code-block" style={{ fontSize: 12 }}>
                  <span className="token-comment">{"// AI Chat API"}</span>
                  <br />
                  <span className="token-keyword">const </span>
                  <span className="token-var">reply</span>
                  <span> = </span>
                  <span className="token-keyword">await </span>
                  <span className="token-var">cf</span>
                  <span>.</span>
                  <span className="token-fn">ai</span>
                  <span>.</span>
                  <span className="token-fn">ask</span>
                  <span>{"({"}</span>
                  <br />
                  {"  "}
                  <span className="token-prop">contractId</span>
                  <span>{": "}</span>
                  <span className="token-string">&quot;ctr_abc123&quot;</span>
                  <span>{","}</span>
                  <br />
                  {"  "}
                  <span className="token-prop">question</span>
                  <span>{": "}</span>
                  <span className="token-string">
                    &quot;What does clause 4.2 mean?&quot;
                  </span>
                  <br />
                  <span>{"}"}</span>
                  <span>)</span>
                  <br />
                  <br />
                  <span className="token-comment">
                    {
                      '// → "Clause 4.2 limits liability to the contract value..."'
                    }
                  </span>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        <hr className="divider" />

        {/* ─── TESTIMONIALS ─── */}
        <ScrollReveal>
          <section className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="text-center mb-12 sm:mb-14">
              <div className="section-label" style={{ display: "inline-flex" }}>
                Social proof
              </div>
              <h2
                style={{
                  fontSize: "clamp(28px, 4vw, 36px)",
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: "white",
                }}
              >
                Loved by freelancers
                <br />
                <span
                  style={{
                    background: "linear-gradient(135deg, #818cf8, #c084fc)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  and growing teams
                </span>
              </h2>
            </div>

            {/* 1 col mobile → 3 col desktop */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  quote: "We used to spend 2 hours per client contract. Now it's 8 minutes. Contract Faster is genuinely magical.",
                  name: "Linh Nguyen",
                  role: "CEO, Swift Build",
                  avatar: "LN",
                },
                {
                  quote: "The AI placeholder detection saved us from manually mapping 40+ template fields. It just works.",
                  name: "James Park",
                  role: "CTO, Nova Tech",
                  avatar: "JP",
                },
                {
                  quote: "Our legal team approved the AI-generated clause explanations. That alone is worth the subscription.",
                  name: "Sarah Chen",
                  role: "Head of Ops, Peak Agency",
                  avatar: "SC",
                },
              ].map((t, idx) => (
                <ScrollReveal key={t.name} delay={idx * 100}>
                  <div className="testimonial-card h-full">
                    <div
                      style={{
                        color: "#a5b4fc",
                        fontSize: 20,
                        marginBottom: 16,
                        fontFamily: "serif",
                      }}
                    >
                      &ldquo;
                    </div>
                    <p style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                      {t.quote}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "white",
                          flexShrink: 0,
                        }}
                      >
                        {t.avatar}
                      </div>
                      <div>
                        <p style={{ color: "white", fontSize: 13, fontWeight: 500 }}>{t.name}</p>
                        <p style={{ color: "#4b5563", fontSize: 12 }}>{t.role}</p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </section>
        </ScrollReveal>

        <hr className="divider" />

        {/* ─── EVERYTHING IN YOUR CONTROL ─── */}
        <ScrollReveal>
          <section className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20">
              <div>
                <div className="section-label">Full control</div>
                <h2
                  style={{
                    fontSize: "clamp(28px, 4vw, 36px)",
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "white",
                    margin: "0 0 16px",
                    lineHeight: 1.2,
                  }}
                >
                  Everything in
                  <br />
                  your control
                </h2>
                <p style={{ color: "#6b7280", lineHeight: 1.7 }}>
                  Contract Faster is transforming contract workflows for
                  developers, freelancers, and teams. Here is what else we can
                  do for you.
                </p>
              </div>

              <div>
                {[
                  { icon: "🔒", title: "Access control", desc: "Role-based permissions for every template and contract." },
                  { icon: "📊", title: "Usage analytics", desc: "Track contract creation volume, AI usage, and team activity." },
                  { icon: "🌐", title: "Multi-language", desc: "Templates in Vietnamese, English, and more. AI works in all." },
                  { icon: "🔄", title: "Version history", desc: "Every contract version saved. Roll back or compare anytime." },
                  { icon: "⚙️", title: "Webhooks", desc: "Connect to Slack, Notion, or any tool via webhooks." },
                ].map((item, idx) => (
                  <ScrollReveal key={item.title} delay={idx * 80}>
                    <div className="check-item">
                      <span style={{ fontSize: 18, marginTop: 2 }}>{item.icon}</span>
                      <div>
                        <p style={{ color: "white", fontWeight: 500, fontSize: 14, marginBottom: 3 }}>
                          {item.title}
                        </p>
                        <p style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.5 }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ─── CTA SECTION ─── */}
        <ScrollReveal>
          <section className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
            <div
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1))",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: 20,
                padding: "clamp(40px, 8vw, 72px) clamp(24px, 5vw, 48px)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Glow */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 400,
                  height: 200,
                  background: "radial-gradient(ellipse, rgba(99,102,241,0.2), transparent 70%)",
                  pointerEvents: "none",
                }}
              />
              <div style={{ position: "relative" }}>
                <h2
                  style={{
                    fontSize: "clamp(28px, 5vw, 40px)",
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "white",
                    margin: "0 0 16px",
                  }}
                >
                  Start closing contracts faster
                </h2>
                <p
                  style={{
                    color: "#9ca3af",
                    fontSize: 16,
                    marginBottom: 36,
                    maxWidth: 440,
                    margin: "0 auto 36px",
                    lineHeight: 1.6,
                  }}
                >
                  Free for your first 3 contracts. No credit card. Cancel
                  anytime.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <Link
                    href="/auth/login"
                    className="btn-primary w-full sm:w-auto justify-center"
                    style={{ padding: "14px 32px", fontSize: 16 }}
                  >
                    Get started for free →
                  </Link>
                  <Link
                    href="/pricing"
                    className="btn-ghost w-full sm:w-auto justify-center"
                    style={{ padding: "14px 24px", fontSize: 15, border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    View pricing
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ─── FOOTER ─── */}
        <footer
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "40px 0",
          }}
        >
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            {/* Desktop: flex row. Mobile: stacked */}
            <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-6">
              {/* Logo */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    background: "linear-gradient(135deg, #6366f1, #a855f7)",
                    borderRadius: 5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                  }}
                >
                  ⚡
                </div>
                <span style={{ color: "#4b5563", fontSize: 13, fontWeight: 500 }}>
                  Contract Faster
                </span>
              </div>

              {/* Links grid — wraps on mobile */}
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                {[
                  { label: "Privacy", href: "#" },
                  { label: "Terms", href: "#" },
                  { label: "Docs", href: "#" },
                  { label: "Pricing", href: "/pricing" },
                  { label: "Status", href: "#" },
                  { label: "GitHub", href: "#" },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    style={{
                      color: "#374151",
                      fontSize: 13,
                      textDecoration: "none",
                      transition: "color 0.15s",
                    }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              <span style={{ color: "#374151", fontSize: 12, whiteSpace: "nowrap" }}>
                © 2026 Contract Faster
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
