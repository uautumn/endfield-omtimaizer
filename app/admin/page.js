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

// 크롤링 소스 목록 (개별 호출용)
const SOURCES = [
  { key: "namu_aic",     label: "나무위키 — AIC 공업",   region: "공통" },
  { key: "namu_base",    label: "나무위키 — 거점 시스템", region: "공통" },
  { key: "namu_valley",  label: "나무위키 — 4번 협곡",   region: "4번 협곡" },
  { key: "namu_wulong",  label: "나무위키 — 무릉",        region: "무릉" },
  { key: "namu_main",    label: "나무위키 — 엔드필드 메인", region: "공통" },
  { key: "wikigg",       label: "wiki.gg — AIC (하위 포함)", region: "공통" },
  { key: "arcalive",     label: "아카라이브 akendfield",  region: "공통" },
  { key: "dcinside",     label: "디시인사이드 endfield갤", region: "공통" },
];

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [status, setStatus] = useState(null);
  const [sourceResults, setSourceResults] = useState({});
  const [crawling, setCrawling] = useState(false);
  const [currentSource, setCurrentSource] = useState("");
  const [error, setError] = useState(null);

  const fetchStatus = async (sk = secret) => {
    try {
      const res = await fetch("/api/crawl", {
        headers: { Authorization: `Bearer ${sk}` },
      });
      const data = await res.json();
      if (res.ok) { setStatus(data); setAuthed(true); setError(null); }
      else setError(data.error || "인증 실패");
    } catch (e) {
      setError("연결 실패: " + e.message);
    }
  };

  // 소스별 개별 크롤링
  const runCrawlSource = async (sourceKey, label) => {
    setSourceResults(prev => ({ ...prev, [sourceKey]: { status: "running" } }));
    setCurrentSource(label);
    try {
      const res = await fetch(`/api/crawl?source=${sourceKey}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "실패");
      const result = data.results?.success?.[0];
      setSourceResults(prev => ({
        ...prev,
        [sourceKey]: { status: "done", chunks: result?.chunks || 0 }
      }));
    } catch (e) {
      setSourceResults(prev => ({
        ...prev,
        [sourceKey]: { status: "error", error: e.message }
      }));
    }
  };

  // 전체 순차 크롤링
  const runAllCrawl = async () => {
    setCrawling(true);
    setSourceResults({});
    setError(null);
    for (const src of SOURCES) {
      await runCrawlSource(src.key, src.label);
      await new Promise(r => setTimeout(r, 500));
    }
    await fetchStatus();
    setCrawling(false);
    setCurrentSource("");
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
            <div style={{ background: C.bg2, border: "1px solid " + C.mintBd, padding: "14px 16px", clipPath: CP16, marginBottom: "12px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: C.mint }} />
              <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.15em", marginBottom: "8px", marginLeft: "8px" }}>// DB STATUS</div>
              <div style={{ marginLeft: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                  <span style={{ fontSize: "10px", color: C.sub }}>총 수집 청크</span>
                  <span style={{ fontSize: "26px", fontWeight: "bold", color: C.mint }}>{status?.total || 0}</span>
                </div>
                <div style={{ fontSize: "9px", color: C.sub, marginBottom: "8px" }}>
                  마지막 크롤링: {status?.lastCrawled ? new Date(status.lastCrawled).toLocaleString("ko-KR") : "없음"}
                </div>
                {status?.sources && Object.entries(status.sources).map(([src, cnt]) => (
                  <div key={src} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid " + C.dim, fontSize: "10px" }}>
                    <span style={{ color: C.sub }}>{src.replace("[자동수집] ", "")}</span>
                    <span style={{ color: C.mint }}>{cnt}개</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 소스별 크롤링 */}
            <div style={{ background: C.bg2, border: "1px solid " + C.mintBd, padding: "14px 16px", clipPath: CP8, marginBottom: "12px" }}>
              <div style={{ fontSize: "8px", color: C.sub, letterSpacing: "0.15em", marginBottom: "10px" }}>// 소스별 크롤링</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                {SOURCES.map(src => {
                  const r = sourceResults[src.key];
                  return (
                    <div key={src.key} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", background: C.bg, border: "1px solid " + C.dim }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "11px", color: C.text }}>{src.label}</div>
                        <div style={{ fontSize: "8px", color: C.sub }}>{src.region}</div>
                      </div>
                      {r ? (
                        r.status === "running" ? (
                          <span style={{ fontSize: "9px", color: "#ffaa00" }}>⟳ 수집 중...</span>
                        ) : r.status === "done" ? (
                          <span style={{ fontSize: "9px", color: "#4ecb80" }}>✓ {r.chunks}개</span>
                        ) : (
                          <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "9px", color: "#ff6666" }}>✗ 실패</span>
                          {r.error && <div style={{ fontSize: "8px", color: "#ff444488", maxWidth: "160px", wordBreak: "break-all" }}>{r.error}</div>}
                        </div>
                        )
                      ) : (
                        <button onClick={() => runCrawlSource(src.key, src.label)}
                          disabled={crawling}
                          style={{ fontSize: "9px", padding: "3px 10px", border: "1px solid " + C.mintBd, background: "transparent", color: C.mint, cursor: crawling ? "not-allowed" : "pointer", fontFamily: "monospace" }}>
                          실행
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 전체 실행 버튼 */}
              <button onClick={runAllCrawl} disabled={crawling}
                style={{ width: "100%", padding: "11px", border: "1px solid " + (crawling ? C.mintBd : C.mint + "99"), background: crawling ? "transparent" : C.mint + "18", color: crawling ? C.dim : C.mint, fontSize: "10px", fontWeight: "bold", cursor: crawling ? "not-allowed" : "pointer", fontFamily: "monospace", letterSpacing: "0.1em", clipPath: CP8 }}>
                {crawling ? `[ ${currentSource} 수집 중... ]` : "[ 전체 크롤링 실행 ]"}
              </button>
            </div>

            {/* 안내 */}
            <div style={{ padding: "10px 14px", border: "1px solid " + C.dim, fontSize: "9px", color: C.sub, lineHeight: "1.8" }}>
              ⏰ 자동 크롤링: 매일 새벽 3시<br />
              🔧 소스별 개별 실행으로 타임아웃 방지<br />
              💡 ScraperAPI 크레딧: render=true 사용 시 요청당 5~10크레딧 소모
            </div>

            {error && (
              <div style={{ marginTop: "10px", padding: "10px 14px", background: "rgba(255,68,68,0.1)", borderLeft: "2px solid #ff4444", fontSize: "10px", color: "#ff6666" }}>
                !! {error}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`*{box-sizing:border-box}body{background:#03080f;margin:0}button:hover:not(:disabled){filter:brightness(1.2)}input{outline:none}`}</style>
    </div>
  );
}
