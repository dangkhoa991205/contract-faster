import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{ background: "#f4f6fb", color: "#0b1120", fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --blue: #3b6bff;
          --teal: #06b6d4;
          --ink: #0b1120;
          --bg: #f4f6fb;
          --grad: linear-gradient(135deg, #3b6bff, #06b6d4);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-10px) rotate(0.5deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .fu  { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .fu1 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .fu2 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s both; }
        .fu3 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.32s both; }
        .fu4 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.44s both; }

        .ticker-track { animation: ticker 30s linear infinite; }
        .hero-card    { animation: float 6s ease-in-out infinite; }

        .sora { font-family: 'Sora', system-ui, sans-serif; }

        .grad-text {
          background: var(--grad);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--grad); color: #fff;
          padding: 14px 28px; border-radius: 12px;
          font-weight: 600; font-size: 15px; text-decoration: none;
          transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(59,107,255,0.3);
        }
        .btn-primary:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(59,107,255,0.4); }

        .btn-outline {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: var(--ink);
          padding: 14px 24px; border-radius: 12px; border: 1.5px solid #d0d8f0;
          font-weight: 600; font-size: 15px; text-decoration: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .btn-outline:hover { border-color: var(--blue); background: rgba(59,107,255,0.04); }

        .card {
          background: #fff; border-radius: 20px;
          border: 1px solid #e4eaf8;
          box-shadow: 0 2px 16px rgba(11,17,32,0.06);
        }

        .feature-card {
          background: #fff; border-radius: 16px;
          border: 1px solid #e4eaf8; padding: 28px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .feature-card:hover { box-shadow: 0 8px 32px rgba(59,107,255,0.1); transform: translateY(-2px); }

        .plan-card {
          background: #fff; border-radius: 20px;
          border: 1.5px solid #e4eaf8; padding: 32px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .plan-card:hover { box-shadow: 0 8px 32px rgba(59,107,255,0.1); transform: translateY(-2px); }
        .plan-card.popular {
          border-color: var(--blue);
          box-shadow: 0 4px 24px rgba(59,107,255,0.15);
        }

        .nav-link { color: #4a5568; text-decoration: none; font-weight: 500; font-size: 14px; transition: color 0.2s; }
        .nav-link:hover { color: var(--blue); }

        .step-num {
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--grad); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif; font-weight: 700; font-size: 18px;
          flex-shrink: 0;
        }

        .badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(59,107,255,0.08); color: var(--blue);
          border: 1px solid rgba(59,107,255,0.2);
          padding: 6px 14px; border-radius: 100px;
          font-size: 13px; font-weight: 600;
        }

        .check { color: var(--blue); font-weight: 600; }

        .testimonial-card {
          background: #fff; border-radius: 16px; padding: 28px;
          border: 1px solid #e4eaf8; box-shadow: 0 2px 12px rgba(11,17,32,0.05);
        }

        .ticker-item {
          display: flex; align-items: center; gap: 10px;
          padding: 0 36px; white-space: nowrap;
          color: #6b7280; font-size: 14px; font-weight: 500;
        }
        .ticker-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--grad);
          flex-shrink: 0;
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #e4eaf8", position: "sticky", top: 0, zIndex: 100, padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <span style={{ fontSize: 24 }}>⚡</span>
            <span className="sora" style={{ fontWeight: 700, fontSize: 17, color: "#0b1120" }}>Contract Faster</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <a href="#how" className="nav-link">Cách dùng</a>
            <a href="#features" className="nav-link">Tính năng</a>
            <a href="#pricing" className="nav-link">Bảng giá</a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/auth/login" className="btn-outline" style={{ padding: "10px 20px", fontSize: 14 }}>Đăng nhập</Link>
            <Link href="/auth/login" className="btn-primary" style={{ padding: "10px 20px", fontSize: 14 }}>Dùng thử miễn phí</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 24px 80px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
        <div>
          <div className="badge fu" style={{ marginBottom: 20 }}>
            <span>✨</span> AI tạo hợp đồng tự động
          </div>
          <h1 className="sora fu1" style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 800, lineHeight: 1.15, marginBottom: 20, color: "#0b1120" }}>
            Tạo hợp đồng<br />
            <span className="grad-text">trong vài giây</span><br />
            không phải giờ
          </h1>
          <p className="fu2" style={{ fontSize: 18, lineHeight: 1.7, color: "#4a5568", marginBottom: 36, maxWidth: 480 }}>
            Upload template của bạn, chat với AI, nhận hợp đồng hoàn chỉnh. Không cần luật sư, không cần copy-paste thủ công.
          </p>
          <div className="fu3" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/auth/login" className="btn-primary">
              Bắt đầu miễn phí <span>→</span>
            </Link>
            <a href="#how" className="btn-outline">Xem demo</a>
          </div>
          <div className="fu4" style={{ display: "flex", gap: 28, marginTop: 32 }}>
            {[["3 giây", "tạo hợp đồng"], ["10+", "loại template"], ["100%", "chính xác"]].map(([n, l]) => (
              <div key={l}>
                <div className="sora" style={{ fontSize: 22, fontWeight: 800, color: "#0b1120" }}>{n}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero UI card */}
        <div className="hero-card fu2" style={{ perspective: 1000 }}>
          <div className="card" style={{ padding: 24, maxWidth: 420 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #e4eaf8" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #3b6bff, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
              <div>
                <div className="sora" style={{ fontWeight: 700, fontSize: 14, color: "#0b1120" }}>AI Assistant</div>
                <div style={{ fontSize: 12, color: "#06b6d4" }}>● Đang hoạt động</div>
              </div>
            </div>

            {[
              { role: "user", msg: "Tạo hợp đồng cộng tác với Nguyễn Văn An, 10 triệu/tháng" },
              { role: "ai", msg: "Đã tạo Hợp Đồng Cộng Tác ✅\nCòn thiếu: ngày ký, địa chỉ. Xem trước bên dưới." },
            ].map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{
                  background: m.role === "user" ? "linear-gradient(135deg, #3b6bff, #06b6d4)" : "#f4f6fb",
                  color: m.role === "user" ? "#fff" : "#0b1120",
                  padding: "10px 14px", borderRadius: 12,
                  fontSize: 13, lineHeight: 1.5, maxWidth: "85%",
                  whiteSpace: "pre-line",
                }}>
                  {m.msg}
                </div>
              </div>
            ))}

            <div style={{ background: "#f4f6fb", borderRadius: 12, padding: 12, marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#0b1120" }}>Hợp Đồng Cộng Tác</div>
                <div style={{ fontSize: 11, color: "#06b6d4", fontWeight: 600 }}>Xem trước</div>
              </div>
              <div style={{ height: 2, background: "linear-gradient(135deg, #3b6bff, #06b6d4)", borderRadius: 2, marginBottom: 8 }}></div>
              {["Bên A: Công ty ...", "Bên B: Nguyễn Văn An", "Giá trị: 10,000,000đ/tháng"].map(l => (
                <div key={l} style={{ fontSize: 11, color: "#4a5568", padding: "3px 0", borderBottom: "1px solid #e4eaf8" }}>{l}</div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button style={{ flex: 1, background: "linear-gradient(135deg, #3b6bff, #06b6d4)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📄 Xuất PDF</button>
                <button style={{ flex: 1, background: "#fff", color: "#3b6bff", border: "1.5px solid #3b6bff", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>⬇ Tải DOCX</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div style={{ background: "#fff", borderTop: "1px solid #e4eaf8", borderBottom: "1px solid #e4eaf8", overflow: "hidden", padding: "14px 0" }}>
        <div className="ticker-track" style={{ display: "flex", width: "max-content" }}>
          {Array(2).fill([
            "Hợp đồng cộng tác", "Hợp đồng lao động", "Hợp đồng dịch vụ",
            "Hợp đồng thuê nhà", "NDA bảo mật", "Thỏa thuận hợp tác",
            "Hợp đồng freelance", "Hợp đồng mua bán",
          ]).flat().map((t, i) => (
            <div key={i} className="ticker-item">
              <div className="ticker-dot" />
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ maxWidth: 900, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div className="badge" style={{ marginBottom: 16 }}>Quy trình</div>
          <h2 className="sora" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: "#0b1120" }}>
            3 bước để có hợp đồng<br />
            <span className="grad-text">hoàn chỉnh</span>
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {[
            { n: 1, title: "Upload template", desc: "Tải lên file .docx template hợp đồng của bạn. AI tự động nhận diện các trường cần điền như tên, ngày, giá trị..." },
            { n: 2, title: "Chat với AI", desc: "Mô tả hợp đồng bạn cần bằng ngôn ngữ tự nhiên. AI hiểu tiếng Việt, tự suy luận và điền thông tin liên quan." },
            { n: 3, title: "Xuất hợp đồng", desc: "Xem trước trực tiếp trên web, chỉnh sửa nếu cần, rồi xuất file PDF hoặc DOCX chuẩn để ký kết." },
          ].map((s) => (
            <div key={s.n} className="card" style={{ display: "flex", gap: 24, padding: 28, alignItems: "flex-start" }}>
              <div className="step-num">{s.n}</div>
              <div>
                <div className="sora" style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: "#0b1120" }}>{s.title}</div>
                <div style={{ color: "#4a5568", lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ background: "#fff", borderTop: "1px solid #e4eaf8", borderBottom: "1px solid #e4eaf8", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="badge" style={{ marginBottom: 16 }}>Tính năng</div>
            <h2 className="sora" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: "#0b1120" }}>
              Mọi thứ bạn cần để<br />
              <span className="grad-text">tạo hợp đồng nhanh hơn</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[
              { icon: "🤖", title: "AI thông minh", desc: "Tự suy luận điền các trường liên quan, hiểu ngữ cảnh, không cần điền từng ô một." },
              { icon: "📄", title: "Template của bạn", desc: "Dùng đúng mẫu hợp đồng doanh nghiệp, giữ nguyên format và thương hiệu." },
              { icon: "⚡", title: "Xuất trong 3 giây", desc: "Preview ngay trên trình duyệt, xuất PDF chuẩn A4 hoặc tải DOCX về chỉnh sửa." },
              { icon: "🔒", title: "Bảo mật tuyệt đối", desc: "Dữ liệu mã hóa end-to-end. Hợp đồng của bạn chỉ bạn mới xem được." },
              { icon: "🌐", title: "Tiếng Việt 100%", desc: "Giao tiếp bằng tiếng Việt tự nhiên. AI hiểu nghiệp vụ pháp lý Việt Nam." },
              { icon: "📊", title: "Quản lý hợp đồng", desc: "Lưu trữ, tìm kiếm và theo dõi tất cả hợp đồng đã tạo ở một nơi." },
            ].map((f) => (
              <div key={f.title} className="feature-card">
                <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
                <div className="sora" style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: "#0b1120" }}>{f.title}</div>
                <div style={{ color: "#4a5568", fontSize: 14, lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div className="badge" style={{ marginBottom: 16 }}>Bảng giá</div>
          <h2 className="sora" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: "#0b1120" }}>
            Giá minh bạch,<br />
            <span className="grad-text">không phí ẩn</span>
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {[
            {
              name: "FREE", price: "0đ", period: "/tháng",
              desc: "Khám phá tính năng",
              features: ["3 hợp đồng/tháng", "Upload template", "Preview & xuất DOCX", "Hỗ trợ email"],
              cta: "Dùng thử", popular: false,
            },
            {
              name: "SOLO", price: "199K", period: "/tháng",
              desc: "Dành cho freelancer",
              features: ["50 hợp đồng/tháng", "20 AI chats/ngày", "Xuất PDF + DOCX", "Ưu tiên hỗ trợ"],
              cta: "Bắt đầu", popular: true,
            },
            {
              name: "TEAM", price: "599K", period: "/tháng",
              desc: "Dành cho doanh nghiệp",
              features: ["Không giới hạn hợp đồng", "AI chat không giới hạn", "Quản lý nhóm", "Hỗ trợ ưu tiên 24/7"],
              cta: "Liên hệ", popular: false,
            },
          ].map((p) => (
            <div key={p.name} className={`plan-card${p.popular ? " popular" : ""}`} style={{ position: "relative" }}>
              {p.popular && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #3b6bff, #06b6d4)", color: "#fff", padding: "4px 16px", borderRadius: 100, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                  Phổ biến nhất
                </div>
              )}
              <div className="sora" style={{ fontWeight: 800, fontSize: 13, color: "#6b7280", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>{p.name}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 4 }}>
                <span className="sora" style={{ fontSize: 36, fontWeight: 800, color: "#0b1120" }}>{p.price}</span>
                <span style={{ color: "#6b7280", fontSize: 14, paddingBottom: 6 }}>{p.period}</span>
              </div>
              <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>{p.desc}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
                    <span className="check">✓</span>
                    <span style={{ color: "#374151" }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/auth/login" className={p.popular ? "btn-primary" : "btn-outline"} style={{ display: "block", textAlign: "center", padding: "12px 0" }}>
                {p.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ background: "#fff", borderTop: "1px solid #e4eaf8", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="badge" style={{ marginBottom: 16 }}>Đánh giá</div>
            <h2 className="sora" style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, color: "#0b1120" }}>
              Người dùng nói gì về<br /><span className="grad-text">Contract Faster</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[
              { name: "Nguyễn Minh Tuấn", role: "Freelancer thiết kế", text: "Trước mất 30 phút để soạn hợp đồng, giờ chỉ 3 giây. Template của mình vẫn giữ nguyên format đẹp!" },
              { name: "Trần Thị Lan", role: "CEO startup", text: "AI hiểu tiếng Việt rất tốt, tự điền đúng thông tin không cần giải thích nhiều. Tiết kiệm được rất nhiều thời gian." },
              { name: "Lê Văn Hùng", role: "Môi giới bất động sản", text: "Xuất PDF chuẩn A4 đẹp lắm, khách hàng rất ấn tượng. Dùng SOLO plan rất xứng đáng." },
            ].map((t) => (
              <div key={t.name} className="testimonial-card">
                <div style={{ fontSize: 20, marginBottom: 14 }}>★★★★★</div>
                <p style={{ color: "#374151", lineHeight: 1.7, marginBottom: 20, fontSize: 15 }}>&ldquo;{t.text}&rdquo;</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #3b6bff, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16 }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#0b1120" }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <div style={{ background: "linear-gradient(135deg, #3b6bff, #06b6d4)", borderRadius: 28, padding: "60px 48px" }}>
            <h2 className="sora" style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: "#fff", marginBottom: 16 }}>
              Bắt đầu tạo hợp đồng<br />ngay hôm nay
            </h2>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, marginBottom: 32, lineHeight: 1.7 }}>
              Miễn phí 3 hợp đồng đầu tiên. Không cần thẻ tín dụng.
            </p>
            <Link href="/auth/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: "#3b6bff", padding: "14px 32px", borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: "none", transition: "transform 0.2s", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
              Dùng thử miễn phí →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#fff", borderTop: "1px solid #e4eaf8", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <span className="sora" style={{ fontWeight: 700, color: "#0b1120" }}>Contract Faster</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <a href="#" style={{ color: "#6b7280", fontSize: 14, textDecoration: "none" }}>Điều khoản</a>
            <a href="#" style={{ color: "#6b7280", fontSize: 14, textDecoration: "none" }}>Bảo mật</a>
            <a href="#" style={{ color: "#6b7280", fontSize: 14, textDecoration: "none" }}>Liên hệ</a>
          </div>
          <div style={{ color: "#9ca3af", fontSize: 13 }}>© 2026 Contract Faster. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
