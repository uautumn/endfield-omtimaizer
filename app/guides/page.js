"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const C = {
  mint:    "#1ec8a0",
  mintBd:  "#1ec8a044",
  bg:      "#03080f",
  bg2:     "#071220",
  line:    "#1ec8a028",
  text:    "#c8e8e0",
  sub:     "#4a7a6e",
  dim:     "#1a3830",
};

const REGIONS = ["공통", "4번 협곡", "무릉"];
const CP8 = "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))";
const CP16 = "polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))";

export default function GuidesPage() {
  const [tab, setTab] = useState("list");
  const [guides, setGuides] = useState([]);
  const [filterRegion, setFilterRegion] = useState("전체");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    title: "",
    region: "공통",
    author: "",
    content: "",
  });

  const fetchGuides = async (region) => {
    setLoading(true);
    try {
      const params = region && region !== "전체" ? `?region=${encodeURIComponent(region)}` : "";
      const res = await fetch(`/api/guides${params}`);
      const data = await res.json();
      setGuides(data.guides || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchGuides(filterRegion); }, [filterRegion]);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError("제목과 내용은 필수예요."); return;
    }
    if (form.content.trim().length < 50) {
      setError("공략 내용을 50자 이상 작성해주세요."); return;
    }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "등록 실패");
      setSuccess(true);
      setForm({ title: "", region: "공통", author: "", content: "" });
      setTimeout(() => { setSuccess(false); setTab("list"); fetchGuides(filterRegion); }, 1500);
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "monospace", color: C.text }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(30,200,160,0.015) 3px,rgba(30,200,160,0.015) 4px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "640px", margin: "0 auto", padding: "20px 16px 48px" }}>

        {/* 헤더 */}
        <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid " + C.mintBd, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: "linear-gradient(180deg," + C.mint + ",transparent)" }} />
          <div style={{ marginLeft: "10px" }}>
            <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.2em", marginBottom: "4px" }}>// SYS.DAT · COMMUNITY GUIDES</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: C.mint, letterSpacing: "0.06em", textShadow: "0 0 20px " + C.mint + "66" }}>공략 DB</div>
            <div style={{ fontSize: "9px", color: C.sub, marginTop: "3px" }}>커뮤니티 공략을 등록하면 AI 분석에 활용돼요</div>
          </div>
          <Link href="/" style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", fontSize: "9px", color: C.sub, textDecoration: "none", border: "1px solid " + C.mintBd, padding: "5px 10px", letterSpacing: "0.08em" }}>
            ← 분석으로
          </Link>
        </div>

        {/* 탭 */}
        <div style={{ display: "flex", gap: "0", marginBottom: "16px", borderBottom: "1px solid " + C.line }}>
          {[["list", "공략 목록"], ["submit", "공략 제출"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: "8px 8px 10px", border: "none", borderBottom: "2px solid " + (tab === key ? C.mint : "transparent"), background: "transparent", color: tab === key ? C.mint : C.sub, fontSize: "11px", fontWeight: tab === key ? "bold" : "normal", cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: "-1px" }}>
              {label}
            </button>
          ))}
        </div>

        {/* 목록 탭 */}
        {tab === "list" && (
          <div>
            {/* 지역 필터 */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "14px", flexWrap: "wrap" }}>
              {["전체", ...REGIONS].map(r => (
                <button key={r} onClick={() => setFilterRegion(r)} style={{ padding: "4px 12px", border: "1px solid " + (filterRegion === r ? C.mint + "88" : C.mintBd), background: filterRegion === r ? C.mint + "18" : "transparent", color: filterRegion === r ? C.mint : C.sub, fontSize: "10px", cursor: "pointer", fontFamily: "monospace", clipPath: CP8 }}>
                  {r}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: C.sub, fontSize: "11px", letterSpacing: "0.1em" }}>
                <div style={{ animation: "pulse 1.2s infinite", marginBottom: "8px" }}>⟳</div>
                LOADING...
              </div>
            ) : guides.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", border: "1px dashed " + C.mintBd, clipPath: CP16 }}>
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>📋</div>
                <div style={{ fontSize: "11px", color: C.mint, letterSpacing: "0.08em", marginBottom: "6px" }}>등록된 공략이 없어요</div>
                <div style={{ fontSize: "9px", color: C.sub }}>첫 번째 공략을 제출해봐요!</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {guides.map((g) => (
                  <GuideCard key={g.id} guide={g} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 제출 탭 */}
        {tab === "submit" && (
          <div>
            <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.15em", marginBottom: "16px" }}>
              // 공략 내용이 상세할수록 AI 분석 품질이 올라가요
            </div>

            {/* 제목 */}
            <Field label="제목 *">
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="예: 4번 협곡 초반 컨베이어 최적 배치법"
                style={inputStyle} />
            </Field>

            {/* 지역 */}
            <Field label="지역">
              <div style={{ display: "flex", gap: "6px" }}>
                {REGIONS.map(r => (
                  <button key={r} onClick={() => setForm(p => ({ ...p, region: r }))} style={{ flex: 1, padding: "8px", border: "1px solid " + (form.region === r ? C.mint + "88" : C.mintBd), background: form.region === r ? C.mint + "18" : "transparent", color: form.region === r ? C.mint : C.sub, fontSize: "10px", cursor: "pointer", fontFamily: "monospace", clipPath: CP8 }}>
                    {r}
                  </button>
                ))}
              </div>
            </Field>

            {/* 작성자 */}
            <Field label="닉네임 (선택)">
              <input value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))}
                placeholder="익명으로 남겨도 돼요"
                style={inputStyle} />
            </Field>

            {/* 공략 내용 */}
            <Field label={`공략 내용 * (${form.content.length}자)`}>
              <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder={"공장 배치, 컨베이어 연결법, 전력 효율 팁 등 알고 있는 공략을 자유롭게 작성해주세요.\n\n예시:\n- 통합 핵심구역에서는 PAC 코어를 중앙에 배치하고...\n- 4번 협곡 초반에는 채굴기를 3개 이상...\n- 컨베이어 병목을 막으려면..."}
                rows={10}
                style={{ ...inputStyle, resize: "vertical", minHeight: "200px" }} />
            </Field>

            {error && (
              <div style={{ padding: "10px 14px", background: "rgba(255,68,68,0.1)", borderLeft: "2px solid #ff4444", fontSize: "11px", color: "#ff6666", marginBottom: "12px" }}>
                !! {error}
              </div>
            )}

            {success && (
              <div style={{ padding: "10px 14px", background: "rgba(78,203,128,0.1)", borderLeft: "2px solid #4ecb80", fontSize: "11px", color: "#4ecb80", marginBottom: "12px", letterSpacing: "0.05em" }}>
                ✓ 공략이 등록됐어요! AI 분석에 반영될 거예요 ✦
              </div>
            )}

            <button onClick={handleSubmit} disabled={submitting}
              style={{ width: "100%", padding: "13px", border: "1px solid " + (submitting ? C.mintBd : C.mint + "99"), background: submitting ? "transparent" : "linear-gradient(135deg," + C.mint + "20," + C.mint + "08)", color: submitting ? C.dim : C.mint, fontSize: "11px", fontWeight: "bold", cursor: submitting ? "not-allowed" : "pointer", fontFamily: "monospace", letterSpacing: "0.15em", clipPath: CP16 }}>
              {submitting ? "[ 등록 중... ]" : "[ 공략 등록하기 ]"}
            </button>

            <div style={{ marginTop: "12px", padding: "10px 14px", background: C.bg2, border: "1px solid " + C.line, fontSize: "9px", color: C.sub, lineHeight: "1.7" }}>
              💡 공략 내용은 AI 분석 시 참고 자료로만 활용돼요.<br />
              부정확한 정보나 스포일러는 자제해주세요.
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        *{box-sizing:border-box}
        body{background:#03080f;margin:0}
        button:hover:not(:disabled){filter:brightness(1.2)}
        textarea,input{outline:none}
        textarea::placeholder,input::placeholder{color:#1a3830}
      `}</style>
    </div>
  );
}

// 공략 카드
function GuideCard({ guide }) {
  const [open, setOpen] = useState(false);
  const C = { mint: "#1ec8a0", mintBd: "#1ec8a044", bg2: "#071220", text: "#c8e8e0", sub: "#4a7a6e", dim: "#1a3830" };
  const regionColor = guide.region === "4번 협곡" ? "#FF6B00" : guide.region === "무릉" ? "#1ec8a0" : "#94A3B8";
  return (
    <div style={{ background: C.bg2, border: "1px solid " + C.mintBd, clipPath: "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))", overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
            <span style={{ fontSize: "9px", padding: "2px 7px", border: "1px solid " + regionColor + "55", color: regionColor, letterSpacing: "0.05em" }}>{guide.region}</span>
            <span style={{ fontSize: "12px", color: C.text, fontWeight: "600" }}>{guide.title}</span>
          </div>
          <div style={{ fontSize: "9px", color: C.sub, letterSpacing: "0.05em" }}>
            by {guide.author || "익명"} · {new Date(guide.created_at).toLocaleDateString("ko-KR")}
          </div>
        </div>
        <span style={{ fontSize: "10px", color: C.sub, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "10px 14px 14px", borderTop: "1px solid " + C.dim }}>
          <p style={{ margin: 0, fontSize: "12px", color: C.text, lineHeight: "1.9", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{guide.content}</p>
        </div>
      )}
    </div>
  );
}

// 필드 래퍼
function Field({ label, children }) {
  const C = { mint: "#1ec8a0", sub: "#4a7a6e" };
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.15em", marginBottom: "6px" }}>// {label.toUpperCase()}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "#071220",
  border: "1px solid #1ec8a044",
  color: "#c8e8e0",
  fontSize: "12px",
  padding: "10px 12px",
  fontFamily: "monospace",
  letterSpacing: "0.02em",
};
