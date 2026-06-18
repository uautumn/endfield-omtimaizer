"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const C = {
  mint: "#1ec8a0", mintBd: "#1ec8a044",
  bg: "#03080f", bg2: "#071220",
  line: "#1ec8a028", text: "#c8e8e0",
  sub: "#4a7a6e", dim: "#1a3830",
};

const REGIONS = ["공통", "4번 협곡", "무릉"];
const CP8  = "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))";
const CP16 = "polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))";

const inputStyle = {
  width: "100%",
  background: "#071220",
  border: "1px solid #1ec8a044",
  color: "#c8e8e0",
  fontSize: "12px",
  padding: "10px 12px",
  fontFamily: "monospace",
  letterSpacing: "0.02em",
  outline: "none",
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.15em", marginBottom: "6px" }}>
        // {label.toUpperCase()}
      </div>
      {children}
    </div>
  );
}

function GuideCard({ guide, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const regionColor = guide.region === "4번 협곡" ? "#FF6B00" : guide.region === "무릉" ? "#1ec8a0" : "#94A3B8";
  return (
    <div style={{ background: C.bg2, border: "1px solid " + C.mintBd, clipPath: CP8, overflow: "hidden" }}>
      {/* 헤더 */}
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
        {guide.image_url && (
          <img src={guide.image_url} alt="공략 이미지" style={{ width: "48px", height: "48px", objectFit: "cover", flexShrink: 0, border: "1px solid " + regionColor + "55", clipPath: "polygon(0 0,calc(100%-4px) 0,100% 4px,100% 100%,4px 100%,0 calc(100%-4px))" }} />
        )}
        <div onClick={() => setOpen(!open)} style={{ flex: 1, cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "9px", padding: "2px 7px", border: "1px solid " + regionColor + "55", color: regionColor }}>{guide.region}</span>
            <span style={{ fontSize: "12px", color: C.text, fontWeight: "600" }}>{guide.title}</span>
            {guide.image_url && <span style={{ fontSize: "8px", color: C.mint, border: "1px solid " + C.mintBd, padding: "1px 5px" }}>📷 이미지</span>}
          </div>
          <div style={{ fontSize: "9px", color: C.sub }}>by {guide.author || "익명"} · {new Date(guide.created_at).toLocaleDateString("ko-KR")}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          <span onClick={() => setOpen(!open)} style={{ fontSize: "10px", color: C.sub, cursor: "pointer", padding: "0 4px" }}>{open ? "▲" : "▼"}</span>
          <button onClick={() => onEdit && onEdit(guide)} style={{ fontSize: "9px", padding: "3px 8px", border: "1px solid " + C.mintBd, background: "transparent", color: C.mint, cursor: "pointer", fontFamily: "monospace" }}>수정</button>
          <button onClick={() => { if(window.confirm("정말 삭제할까요?")) onDelete && onDelete(guide.id); }} style={{ fontSize: "9px", padding: "3px 8px", border: "1px solid #ff444444", background: "transparent", color: "#ff6666", cursor: "pointer", fontFamily: "monospace" }}>삭제</button>
        </div>
      </div>
      {/* 본문 */}
      {open && (
        <div style={{ borderTop: "1px solid " + C.dim }}>
          {guide.image_url && (
            <div style={{ padding: "12px 14px 0" }}>
              <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.12em", marginBottom: "6px" }}>// FACTORY LAYOUT</div>
              <img src={guide.image_url} alt="공장 설계도" style={{ width: "100%", maxHeight: "300px", objectFit: "contain", border: "1px solid " + C.mintBd, background: "#030810" }} />
            </div>
          )}
          {guide.content && (
            <div style={{ padding: "12px 14px 6px" }}>
              <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.12em", marginBottom: "6px" }}>// CONTENT</div>
              <p style={{ margin: 0, fontSize: "12px", color: C.text, lineHeight: "1.9", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{guide.content}</p>
            </div>
          )}
          {guide.source_url && (
            <div style={{ padding: "6px 14px 14px" }}>
              <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.12em", marginBottom: "6px" }}>// SOURCE</div>
              <a href={guide.source_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: "11px", color: C.mint, fontFamily: "monospace", wordBreak: "break-all", textDecoration: "none", borderBottom: "1px solid " + C.mintBd }}>
                🔗 {guide.source_url}
              </a>
            </div>
          )}
          {!guide.content && !guide.source_url && !guide.image_url && (
            <div style={{ padding: "14px", fontSize: "11px", color: C.sub, textAlign: "center" }}>내용 없음</div>
          )}
        </div>
      )}
    </div>
  );
}


export default function GuidesPage() {
  const [tab, setTab] = useState("list");
  const [guides, setGuides] = useState([]);
  const [filterRegion, setFilterRegion] = useState("전체");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef();

  const [form, setForm] = useState({ title: "", region: "공통", author: "", content: "", sourceUrl: "" });
  const [image, setImage] = useState(null);
  const [editId, setEditId] = useState(null); // 수정 중인 공략 id

  const fetchGuides = async (region) => {
    setLoading(true);
    try {
      const params = region && region !== "전체" ? `?region=${encodeURIComponent(region)}` : "";
      const res = await fetch(`/api/guides${params}`);
      const data = await res.json();
      setGuides(data.guides || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchGuides(filterRegion); }, [filterRegion]);

  const handleImage = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => setImage({
      preview: e.target.result,
      data: e.target.result.split(",")[1],
      type: file.type,
    });
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError("제목과 내용은 필수예요."); return;
    }
    if (form.content.trim().length < 20) {
      setError("공략 내용을 20자 이상 작성해주세요."); return;
    }
    setSubmitting(true); setError(null);
    if (image) setAnalyzing(true);
    try {
      const res = await fetch("/api/guides", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId
          ? { id: editId, title: form.title, region: form.region, content: form.content, author: form.author, sourceUrl: form.sourceUrl || null }
          : { ...form, imageData: image?.data || null, imageType: image?.type || null, sourceUrl: form.sourceUrl || null }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "등록 실패");
      setSuccess(true);
      setForm({ title: "", region: "공통", author: "", content: "", sourceUrl: "" });
      setImage(null);
      setEditId(null);
      setTimeout(() => { setSuccess(false); setTab("list"); fetchGuides(filterRegion); }, 1500);
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
    setAnalyzing(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "monospace", color: C.text }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(30,200,160,0.015) 3px,rgba(30,200,160,0.015) 4px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "640px", margin: "0 auto", padding: "20px 16px 48px" }}>

        {/* 헤더 */}
        <div style={{ marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid " + C.mintBd, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: "linear-gradient(180deg," + C.mint + ",transparent)" }} />
          <div style={{ marginLeft: "10px" }}>
            <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.2em", marginBottom: "3px" }}>// SYS.DAT · COMMUNITY GUIDES</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: C.mint, letterSpacing: "0.06em" }}>공략 DB</div>
            <div style={{ fontSize: "9px", color: C.sub, marginTop: "3px" }}>공장 설계도 이미지와 공략을 등록하면 AI 분석에 활용돼요</div>
          </div>
          <Link href="/" style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", fontSize: "9px", color: C.sub, textDecoration: "none", border: "1px solid " + C.mintBd, padding: "5px 10px" }}>← 분석으로</Link>
        </div>

        {/* 탭 */}
        <div style={{ display: "flex", marginBottom: "16px", borderBottom: "1px solid " + C.line }}>
          {[["list", "공략 목록"], ["submit", "공략 제출"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ flex: 1, padding: "8px 8px 10px", border: "none", borderBottom: "2px solid " + (tab === key ? C.mint : "transparent"), background: "transparent", color: tab === key ? C.mint : C.sub, fontSize: "11px", fontWeight: tab === key ? "bold" : "normal", cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: "-1px" }}>
              {label}
            </button>
          ))}
        </div>

        {/* 목록 탭 */}
        {tab === "list" && (
          <div>
            <div style={{ display: "flex", gap: "4px", marginBottom: "14px", flexWrap: "wrap" }}>
              {["전체", ...REGIONS].map(r => (
                <button key={r} onClick={() => setFilterRegion(r)}
                  style={{ padding: "4px 12px", border: "1px solid " + (filterRegion === r ? C.mint + "88" : C.mintBd), background: filterRegion === r ? C.mint + "18" : "transparent", color: filterRegion === r ? C.mint : C.sub, fontSize: "10px", cursor: "pointer", fontFamily: "monospace", clipPath: CP8 }}>
                  {r}
                </button>
              ))}
            </div>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: C.sub, fontSize: "11px" }}>LOADING...</div>
            ) : guides.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", border: "1px dashed " + C.mintBd, clipPath: CP16 }}>
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>📋</div>
                <div style={{ fontSize: "11px", color: C.mint, marginBottom: "6px" }}>등록된 공략이 없어요</div>
                <div style={{ fontSize: "9px", color: C.sub }}>첫 번째 공략을 제출해봐요!</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {guides.map(g => (
                  <GuideCard key={g.id} guide={g}
                    onEdit={(g) => { setForm({ title:g.title, region:g.region, author:g.author, content:g.content, sourceUrl:g.source_url||"" }); setEditId(g.id); setTab("submit"); }}
                    onDelete={async (id) => {
                      await fetch(`/api/guides?id=${id}`, { method: "DELETE" });
                      fetchGuides(filterRegion);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 제출 탭 */}
        {tab === "submit" && (
          <div>
            <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.15em", marginBottom: "16px" }}>
              // 공장 설계도 이미지를 첨부하면 AI가 자동으로 분석해서 학습해요
            </div>

            <Field label="제목 *">
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="예: 4번 협곡 초반 컨베이어 최적 배치법"
                style={inputStyle} />
            </Field>

            <Field label="지역">
              <div style={{ display: "flex", gap: "6px" }}>
                {REGIONS.map(r => (
                  <button key={r} onClick={() => setForm(p => ({ ...p, region: r }))}
                    style={{ flex: 1, padding: "8px", border: "1px solid " + (form.region === r ? C.mint + "88" : C.mintBd), background: form.region === r ? C.mint + "18" : "transparent", color: form.region === r ? C.mint : C.sub, fontSize: "10px", cursor: "pointer", fontFamily: "monospace", clipPath: CP8 }}>
                    {r}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="닉네임 (선택)">
              <input value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))}
                placeholder="익명으로 남겨도 돼요"
                style={inputStyle} />
            </Field>

            <Field label="공략 출처 URL (선택)">
              <div style={{ position: "relative" }}>
                <input value={form.sourceUrl} onChange={e => setForm(p => ({ ...p, sourceUrl: e.target.value }))}
                  placeholder="https://arca.live/... 또는 https://gall.dcinside.com/..."
                  style={inputStyle} />
                {form.sourceUrl && (
                  <div style={{ fontSize: "9px", color: "#1ec8a0", marginTop: "4px", letterSpacing: "0.05em" }}>
                    ✦ 등록 시 URL 내용을 자동으로 스크래핑해서 AI 학습에 활용해요
                  </div>
                )}
              </div>
            </Field>

            {/* 이미지 업로드 */}
            <Field label="공장 설계도 이미지 (선택)">
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleImage(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current.click()}
                style={{ border: "1px dashed " + (image ? C.mint : C.mintBd), background: "transparent", padding: image ? "10px" : "20px", textAlign: "center", cursor: "pointer", clipPath: CP8, transition: "all 0.2s" }}>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleImage(e.target.files[0])} />
                {image ? (
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <img src={image.preview} alt="미리보기"
                      style={{ maxWidth: "100%", maxHeight: "200px", objectFit: "contain", border: "1px solid " + C.mintBd }} />
                    <button onClick={e => { e.stopPropagation(); setImage(null); }}
                      style={{ position: "absolute", top: "-8px", right: "-8px", width: "20px", height: "20px", borderRadius: "50%", background: "#1a0808", border: "1px solid #ff4444", color: "#ff6666", fontSize: "10px", cursor: "pointer", padding: 0 }}>✕</button>
                    <div style={{ marginTop: "6px", fontSize: "9px", color: C.mint }}>✓ 이미지 첨부됨 — 등록 시 AI가 자동 분석해요</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "22px", marginBottom: "6px" }}>🏭</div>
                    <div style={{ fontSize: "11px", color: C.mint }}>공장 설계도 업로드</div>
                    <div style={{ fontSize: "9px", color: C.sub, marginTop: "3px" }}>클릭 또는 드래그 — AI가 자동으로 분석해요</div>
                  </div>
                )}
              </div>
            </Field>

            <Field label={`공략 내용 * (${form.content.length}자)`}>
              <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder={"공장 배치, 컨베이어 연결법, 전력 효율 팁 등 알고 있는 공략을 자유롭게 작성해주세요.\n\n이미지만 있어도 AI가 분석해드려요!"}
                rows={8}
                style={{ ...inputStyle, resize: "vertical", minHeight: "160px" }} />
            </Field>

            {editId && (
              <div style={{ padding: "8px 14px", background: "rgba(232,216,0,0.08)", borderLeft: "2px solid rgba(232,216,0,0.4)", fontSize: "10px", color: "rgba(232,216,0,0.8)", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>✏️ 공략 수정 중...</span>
                <button onClick={() => { setEditId(null); setForm({ title:"", region:"공통", author:"", content:"", sourceUrl:"" }); }}
                  style={{ fontSize: "9px", border: "1px solid rgba(232,216,0,0.3)", background: "transparent", color: "rgba(232,216,0,0.7)", cursor: "pointer", padding: "2px 8px", fontFamily: "monospace" }}>취소</button>
              </div>
            )}
            {error && (
              <div style={{ padding: "10px 14px", background: "rgba(255,68,68,0.1)", borderLeft: "2px solid #ff4444", fontSize: "11px", color: "#ff6666", marginBottom: "12px" }}>
                !! {error}
              </div>
            )}

            {success && (
              <div style={{ padding: "10px 14px", background: "rgba(78,203,128,0.1)", borderLeft: "2px solid #4ecb80", fontSize: "11px", color: "#4ecb80", marginBottom: "12px" }}>
                ✓ 공략이 등록됐어요! {image ? "이미지도 AI가 분석했어요 ✦" : "AI 분석에 반영될 거예요 ✦"}
              </div>
            )}

            {/* 분석 중 표시 */}
            {analyzing && (
              <div style={{ padding: "10px 14px", background: C.bg2, borderLeft: "2px solid " + C.mint, fontSize: "10px", color: C.mint, marginBottom: "12px", letterSpacing: "0.08em" }}>
                ⚙ 이미지 AI 분석 중... 잠시만요
              </div>
            )}

            <button onClick={handleSubmit} disabled={submitting}
              style={{ width: "100%", padding: "13px", border: "1px solid " + (submitting ? C.mintBd : C.mint + "99"), background: submitting ? "transparent" : "linear-gradient(135deg," + C.mint + "20," + C.mint + "08)", color: submitting ? C.dim : C.mint, fontSize: "11px", fontWeight: "bold", cursor: submitting ? "not-allowed" : "pointer", fontFamily: "monospace", letterSpacing: "0.15em", clipPath: CP16 }}>
              {submitting ? (analyzing ? "[ AI 이미지 분석 중... ]" : editId ? "[ 수정 중... ]" : "[ 등록 중... ]") : editId ? "[ 공략 수정하기 ]" : "[ 공략 등록하기 ]"}
            </button>

            <div style={{ marginTop: "12px", padding: "10px 14px", background: C.bg2, border: "1px solid " + C.line, fontSize: "9px", color: C.sub, lineHeight: "1.7" }}>
              📷 이미지를 첨부하면 Claude AI가 공장 배치를 자동 분석해서 학습해요.<br />
              🔍 분석 결과에 관련 공략 이미지가 함께 표시돼요.<br />
              💡 글만 등록해도 괜찮아요!
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        *{box-sizing:border-box} body{background:#03080f;margin:0}
        button:hover:not(:disabled){filter:brightness(1.2)}
        input,textarea{outline:none}
        textarea::placeholder,input::placeholder{color:#1a3830}
      `}</style>
    </div>
  );
}
