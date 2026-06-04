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

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [status, setStatus] = useState(null);
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState(null);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/crawl", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = await res.json();
      if (res.ok) { setStatus(data); setAuthed(true); setError(null); }
      else setError(data.error || "인증 실패");
    } catch (e) {
      setError(e.message);
    }
  };

  const runCrawl = async () => {
    setCrawling(true); setCrawlResult(null); setError(null);
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCrawlResult(data);
      await fetchStatus();
    } catch (e) {
      setError(e.message);
    }
    setCrawling(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "monospace", color: C.text }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(30,200,160,0.015) 3px,rgba(30,200,160,0.015) 4px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "600px", margin: "0 auto", padding: "24px 16px 48px" }}>

        {/* 헤더 */}
        <div style={{ marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid " + C.mintBd, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: "linear-gradient(180deg," + C.mint + ",transparent)" }} />
          <div style={{ marginLeft: "10px" }}>
            <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.2em", marginBottom: "3px" }}>// ADMIN · CRAWL MANAGEMENT</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: C.mint, letterSpacing: "0.06em" }}>크롤링 관리</div>
          </div>
          <Link href="/" style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", fontSize: "9px", color: C.sub, textDecoration: "none", border: "1px solid " + C.mintBd, padding: "5px 10px" }}>← 메인</Link>
        </div>

        {/* 인증 */}
        {!authed ? (
          <div style={{ background: C.bg2, border: "1px solid " + C.mintBd, padding: "20px", clipPath: CP16 }}>
            <div style={{ fontSize: "9px", color: C.sub, letterSpacing: "0.15em", marginBottom: "10px" }}>// CRAWL SECRET 입력</div>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchStatus()}
              placeholder=".env.local의 CRAWL_SECRET 값"
              style={{ width: "100%", background: C.bg, border: "1px solid " + C.mintBd, color: C.text, fontSize: "12px", padding: "10px 12px", fontFamily: "monospace", marginBottom: "10px" }}
            />
            {error && <div style={{ fontSize: "10px", color: "#ff6666", marginBottom: "10px" }}>!! {error}</div>}
            <button onClick={fetchStatus} style={{ width: "100%", padding: "10px", border: "1px solid " + C.mint + "88", background: C.mint + "18", color: C.mint, fontSize: "10px", fontWeight: "bold", cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.1em", clipPath: CP8 }}>
              [ 인증 ]
            </button>
          </div>
        ) : (
          <div>
            {/* 현재 상태 */}
            <div style={{ background: C.bg2, border: "1px solid " + C.mintBd, padding: "16px 18px", clipPath: CP16, marginBottom: "14px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: C.mint }} />
              <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.15em", marginBottom: "10px", marginLeft: "8px" }}>// DB STATUS</div>
              <div style={{ marginLeft: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
                  <span style={{ fontSize: "9px", color: C.sub }}>총 수집 청크</span>
                  <span style={{ fontSize: "28px", fontWeight: "bold", color: C.mint }}>{status?.total || 0}</span>
                </div>
                <div style={{ fontSize: "8px", color: C.sub, marginBottom: "6px" }}>마지막 크롤링: {status?.lastCrawled ? new Date(status.lastCrawled).toLocaleString("ko-KR") : "없음"}</div>
                {status?.sources && Object.entries(status.sources).map(([src, cnt]) => (
                  <div key={src} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid " + C.dim, fontSize: "10px" }}>
                    <span style={{ color: C.sub }}>{src.replace("[자동수집] ", "")}</span>
                    <span style={{ color: C.mint }}>{cnt}개</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 크롤 실행 */}
            <div style={{ background: C.bg2, border: "1px solid " + C.mintBd, padding: "16px 18px", clipPath: CP8, marginBottom: "14px" }}>
              <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.15em", marginBottom: "8px" }}>// 수동 크롤 실행</div>
              <div style={{ fontSize: "10px", color: C.sub, marginBottom: "12px", lineHeight: "1.7" }}>
                나무위키 + 공식 위키에서 최신 공략을 수집해요.<br />
                완료까지 약 1~2분 소요됩니다.
              </div>
              <button onClick={runCrawl} disabled={crawling} style={{ width: "100%", padding: "12px", border: "1px solid " + (crawling ? C.mintBd : C.mint + "99"), background: crawling ? "transparent" : C.mint + "18", color: crawling ? C.dim : C.mint, fontSize: "10px", fontWeight: "bold", cursor: crawling ? "not-allowed" : "pointer", fontFamily: "monospace", letterSpacing: "0.12em", clipPath: CP8 }}>
                {crawling ? "[ 크롤링 중... 잠시만요 ]" : "[ 지금 크롤링 실행 ]"}
              </button>
            </div>

            {/* 자동 크롤 안내 */}
            <div style={{ padding: "12px 14px", border: "1px solid " + C.dim, fontSize: "9px", color: C.sub, lineHeight: "1.8" }}>
              ⏰ 자동 크롤링: 매일 새벽 3시 (vercel.json 설정)<br />
              📋 수동 크롤: 위 버튼으로 즉시 실행 가능<br />
              🔒 Vercel 환경변수에 CRAWL_SECRET, CRON_SECRET 추가 필요
            </div>

            {/* 에러 */}
            {error && (
              <div style={{ marginTop: "10px", padding: "10px 14px", background: "rgba(255,68,68,0.1)", borderLeft: "2px solid #ff4444", fontSize: "10px", color: "#ff6666" }}>
                !! {error}
              </div>
            )}

            {/* 크롤 결과 */}
            {crawlResult && (
              <div style={{ marginTop: "10px", background: C.bg2, border: "1px solid #4ecb8044", padding: "14px 16px", clipPath: CP8 }}>
                <div style={{ fontSize: "10px", color: "#4ecb80", fontWeight: "bold", marginBottom: "8px" }}>✓ {crawlResult.message}</div>
                {crawlResult.results?.success?.map((s, i) => (
                  <div key={i} style={{ fontSize: "9px", color: C.sub, padding: "3px 0", borderBottom: "1px solid " + C.dim }}>
                    ✓ {s.name} — {s.chunks}개 청크
                  </div>
                ))}
                {crawlResult.results?.failed?.map((f, i) => (
                  <div key={i} style={{ fontSize: "9px", color: "#ff6666", padding: "3px 0" }}>
                    ✗ {f.name} — {f.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        *{box-sizing:border-box} body{background:#03080f;margin:0}
        button:hover:not(:disabled){filter:brightness(1.2)}
        input{outline:none}
      `}</style>
    </div>
  );
}
