"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const C = {
  mint: "#1ec8a0", mintBd: "#1ec8a044",
  bg: "#03080f", bg2: "#071220",
  line: "#1ec8a028", text: "#c8e8e0",
  sub: "#4a7a6e", dim: "#1a3830",
};
const CP8  = "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))";
const CP16 = "polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))";

const SOURCES = [
  { key: "arcalive", label: "아카라이브 akendfield" },
  { key: "dcinside", label: "디시인사이드 endfield갤" },
  { key: "wikigg",   label: "wiki.gg — AIC" },
  { key: "namu",     label: "나무위키" },
];

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);
  const [error, setError] = useState(null);

  const addLog = msg => setLog(prev => [`[${new Date().toLocaleTimeString("ko-KR")}] ${msg}`, ...prev].slice(0, 30));

  const call = async (body) => {
    const res = await fetch("/api/crawl", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "실패");
    return data;
  };

  const fetchStatus = async (sk = secret) => {
    try {
      const res = await fetch("/api/crawl", { headers: { Authorization: `Bearer ${sk}` } });
      const data = await res.json();
      if (res.ok) { setStatus(data); setAuthed(true); setError(null); }
      else setError(data.error || "인증 실패");
    } catch (e) { setError("연결 실패: " + e.message); }
  };

  // 1단계: 링크 수집
  const collectLinks = async (source = "all") => {
    setLoading(true);
    addLog(`🔍 링크 수집 시작 (${source})...`);
    try {
      const data = await call({ action: "collect", source });
      addLog(`✓ ${data.message}`);
      data.results?.success?.forEach(r => addLog(`  ✓ ${r.name}: ${r.links}개 링크`));
      data.results?.failed?.forEach(r => addLog(`  ✗ ${r.name}: ${r.error}`));
      if (data.queueStatus) addLog(`  📋 대기중: ${data.queueStatus.pending}개`);
      await fetchStatus();
    } catch (e) {
      addLog(`✗ 수집 실패: ${e.message}`);
    }
    setLoading(false);
  };

  // 2단계: 본문 처리 (3개씩)
  const processQueue = async (auto = false) => {
    setLoading(true);
    addLog("⚙ 본문 처리 중 (3개)...");
    try {
      const data = await call({ action: "process" });
      addLog(`✓ ${data.processed}개 처리 완료`);
      await fetchStatus();

      // 자동 반복: 대기 중인 링크가 있으면 계속
      if (auto && status?.queue?.pending > 0) {
        addLog("⟳ 대기중인 링크 있음, 계속 처리...");
        setTimeout(() => processQueue(true), 1000);
      } else {
        setLoading(false);
      }
    } catch (e) {
      addLog(`✗ 처리 실패: ${e.message}`);
      setLoading(false);
    }
  };

  // 전체 자동 실행
  const runAll = async () => {
    setLoading(true);
    addLog("🚀 전체 크롤링 시작...");
    // 1단계: 전체 링크 수집
    try {
      const data = await call({ action: "collect", source: "all" });
      addLog(`✓ 링크 수집 완료: ${data.message}`);
      await fetchStatus();
    } catch (e) {
      addLog(`✗ 링크 수집 실패: ${e.message}`);
      setLoading(false);
      return;
    }
    // 2단계: 본문 자동 처리
    addLog("⚙ 본문 처리 시작...");
    await processQueue(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "monospace", color: C.text }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(30,200,160,0.015) 3px,rgba(30,200,160,0.015) 4px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "640px", margin: "0 auto", padding: "24px 16px 48px" }}>

        {/* 헤더 */}
        <div style={{ marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid " + C.mintBd, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: "linear-gradient(180deg," + C.mint + ",transparent)" }} />
          <div style={{ marginLeft: "10px" }}>
            <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.2em", marginBottom: "3px" }}>// ADMIN · CRAWL MANAGEMENT</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: C.mint }}>크롤링 관리</div>
          </div>
          <Link href="/" style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", fontSize: "9px", color: C.sub, textDecoration: "none", border: "1px solid " + C.mintBd, padding: "5px 10px" }}>← 메인</Link>
        </div>

        {/* 인증 */}
        {!authed ? (
          <div style={{ background: C.bg2, border: "1px solid " + C.mintBd, padding: "20px", clipPath: CP16 }}>
            <div style={{ fontSize: "9px", color: C.sub, letterSpacing: "0.15em", marginBottom: "10px" }}>// CRAWL_SECRET 입력</div>
            <input type="password" value={secret}
              onChange={e => setSecret(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchStatus()}
              placeholder="Vercel 환경변수의 CRAWL_SECRET 값"
              style={{ width: "100%", background: C.bg, border: "1px solid " + C.mintBd, color: C.text, fontSize: "12px", padding: "10px 12px", fontFamily: "monospace", marginBottom: "10px", outline: "none" }}
            />
            {error && <div style={{ fontSize: "10px", color: "#ff6666", marginBottom: "10px" }}>!! {error}</div>}
            <button onClick={() => fetchStatus()}
              style={{ width: "100%", padding: "10px", border: "1px solid " + C.mint + "88", background: C.mint + "18", color: C.mint, fontSize: "10px", fontWeight: "bold", cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.1em", clipPath: CP8 }}>
              [ 인증 ]
            </button>
          </div>
        ) : (
          <div>

            {/* DB 상태 */}
            <div style={{ background: C.bg2, border: "1px solid " + C.mintBd, padding: "14px 16px", marginBottom: "12px", clipPath: CP16, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: C.mint }} />
              <div style={{ marginLeft: "8px" }}>
                <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.15em", marginBottom: "8px" }}>// DB STATUS</div>
                <div style={{ display: "flex", gap: "16px", marginBottom: "10px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: C.mint }}>{status?.total || 0}</div>
                    <div style={{ fontSize: "8px", color: C.sub }}>수집된 공략</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ffaa00" }}>{status?.queue?.pending || 0}</div>
                    <div style={{ fontSize: "8px", color: C.sub }}>처리 대기</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#4ecb80" }}>{status?.queue?.done || 0}</div>
                    <div style={{ fontSize: "8px", color: C.sub }}>처리 완료</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ff6666" }}>{status?.queue?.failed || 0}</div>
                    <div style={{ fontSize: "8px", color: C.sub }}>실패</div>
                  </div>
                </div>
                <div style={{ fontSize: "8px", color: C.sub }}>
                  마지막: {status?.lastCrawled ? new Date(status.lastCrawled).toLocaleString("ko-KR") : "없음"}
                </div>
              </div>
            </div>

            {/* 1단계 — 링크 수집 */}
            <div style={{ background: C.bg2, border: "1px solid " + C.mintBd, padding: "14px 16px", marginBottom: "8px", clipPath: CP8 }}>
              <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.15em", marginBottom: "10px" }}>// 1단계 — 링크 수집 (키워드 검색)</div>
              <div style={{ fontSize: "9px", color: C.sub, marginBottom: "10px", lineHeight: "1.6" }}>
                공장/AIC/컨베이어 키워드로 각 커뮤니티에서 관련 글 링크만 수집해요. (2~3초)
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                {SOURCES.map(src => (
                  <button key={src.key} onClick={() => collectLinks(src.key)} disabled={loading}
                    style={{ padding: "5px 12px", border: "1px solid " + C.mintBd, background: "transparent", color: C.mint, fontSize: "9px", cursor: loading ? "not-allowed" : "pointer", fontFamily: "monospace", clipPath: CP8 }}>
                    {src.label}
                  </button>
                ))}
              </div>
              <button onClick={() => collectLinks("all")} disabled={loading}
                style={{ width: "100%", padding: "9px", border: "1px solid " + C.mint + "77", background: C.mint + "15", color: C.mint, fontSize: "10px", fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer", fontFamily: "monospace", letterSpacing: "0.1em", clipPath: CP8 }}>
                {loading ? "[ 처리 중... ]" : "[ 전체 링크 수집 ]"}
              </button>
            </div>

            {/* 2단계 — 본문 처리 */}
            <div style={{ background: C.bg2, border: "1px solid " + C.mintBd, padding: "14px 16px", marginBottom: "8px", clipPath: CP8 }}>
              <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.15em", marginBottom: "10px" }}>// 2단계 — 본문 수집 & 임베딩</div>
              <div style={{ fontSize: "9px", color: C.sub, marginBottom: "10px", lineHeight: "1.6" }}>
                수집된 링크에서 본문을 가져와 AI 임베딩 후 DB에 저장해요. 3개씩 처리해요. (3~5초)
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => processQueue(false)} disabled={loading || !status?.queue?.pending}
                  style={{ flex: 1, padding: "9px", border: "1px solid " + C.mintBd, background: "transparent", color: status?.queue?.pending ? C.mint : C.dim, fontSize: "10px", cursor: (loading || !status?.queue?.pending) ? "not-allowed" : "pointer", fontFamily: "monospace", letterSpacing: "0.08em", clipPath: CP8 }}>
                  [ 3개 처리 ]
                </button>
                <button onClick={() => processQueue(true)} disabled={loading || !status?.queue?.pending}
                  style={{ flex: 1, padding: "9px", border: "1px solid " + C.mint + "77", background: C.mint + "15", color: status?.queue?.pending ? C.mint : C.dim, fontSize: "10px", cursor: (loading || !status?.queue?.pending) ? "not-allowed" : "pointer", fontFamily: "monospace", letterSpacing: "0.08em", clipPath: CP8 }}>
                  [ 전체 자동 처리 ]
                </button>
              </div>
            </div>

            {/* 전체 자동 실행 */}
            <button onClick={runAll} disabled={loading}
              style={{ width: "100%", padding: "13px", border: "1px solid " + (loading ? C.mintBd : C.mint + "99"), background: loading ? "transparent" : "linear-gradient(135deg," + C.mint + "20," + C.mint + "08)", color: loading ? C.dim : C.mint, fontSize: "11px", fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer", fontFamily: "monospace", letterSpacing: "0.12em", clipPath: CP16, marginBottom: "12px" }}>
              {loading ? "[ 처리 중... ]" : "[ 전체 자동 실행 (1단계+2단계) ]"}
            </button>

            {/* 로그 */}
            {log.length > 0 && (
              <div style={{ background: C.bg, border: "1px solid " + C.dim, padding: "12px", maxHeight: "200px", overflowY: "auto" }}>
                <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.15em", marginBottom: "8px" }}>// LOG</div>
                {log.map((l, i) => (
                  <div key={i} style={{ fontSize: "10px", color: l.includes("✗") ? "#ff6666" : l.includes("✓") ? "#4ecb80" : C.sub, marginBottom: "3px", fontFamily: "monospace" }}>{l}</div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "12px", padding: "10px 14px", border: "1px solid " + C.dim, fontSize: "9px", color: C.sub, lineHeight: "1.8" }}>
              ⏰ 자동 크롤링: 매일 새벽 3시<br />
              🔍 1단계에서 키워드로 공장 관련 글만 필터링해요<br />
              ⚡ 2단계를 3개씩 나눠서 Vercel 10초 제한 우회해요
            </div>
          </div>
        )}
      </div>
      <style>{`*{box-sizing:border-box}body{background:#03080f;margin:0}button:hover:not(:disabled){filter:brightness(1.2)}input{outline:none}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1a3a5a}`}</style>
    </div>
  );
}
