"use client";

import { useEffect, useRef, useState } from "react";
import EndfieldLogo from "./EndfieldLogo";

// 사이트에 처음 들어왔을 때 한 번만 보여주는 로딩 화면
// - 4단계로 나눠서 단계마다 차오르고 → 잠깐 멈추고 → 로그에 [ OK ]가 찍히는 방식
// - 마지막 단계는 실제 로딩(페이지 load, 폰트, 배경 이미지)이 끝나야 100%가 됨
// - 같은 탭에서 다시 들어오면(sessionStorage) 바로 건너뜀
//   → layout.js의 인라인 스크립트가 첫 화면이 그려지기 전에 숨겨줌
const SEEN_KEY = "aic-intro-seen";
const MAX_WAIT_MS = 7000; // 로딩이 늦어져도 이 시간이 지나면 강제로 진행
const HOLD_MS = 450;      // 100%를 찍고 화면이 걷히기 전 잠깐 멈추는 시간
const EXIT_MS = 600;      // 화면이 걷히는 애니메이션 길이 (globals.css와 맞춤)
const FILL_RATIO = 0.6;   // 단계 시간 중 앞 60%는 차오르고, 나머지 40%는 멈춰 있음

// 단계별 목표 %와 길이 (전체 약 2.8초 + 멈춤 + 걷힘)
const STAGES = [
  { to: 26,  ms: 650, en: "PROTOCOL SYNC",     ko: "프로토콜 동기화" },
  { to: 53,  ms: 750, en: "LOADING AIC DATA",  ko: "AIC 설비 데이터 로드" },
  { to: 81,  ms: 750, en: "LINKING OPERATORS", ko: "오퍼레이터 연결" },
  { to: 100, ms: 650, en: "SYSTEM READY",      ko: "가동 준비 완료", waitLoad: true },
];

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = resolve;
    img.src = src;
  });
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export default function IntroLoader() {
  const [stage, setStage] = useState(0);         // 지금 진행 중인 단계 (STAGES.length면 전부 완료)
  const [phase, setPhase] = useState("boot");    // boot → exit → gone
  const rafRef = useRef(0);
  // %와 세로 바는 매 프레임 바뀌므로 React state 대신 DOM을 직접 고침
  // (state로 하면 매 프레임 로딩 화면 전체가 다시 렌더링돼서 크롬에서 끊김)
  const numRef = useRef(null);
  const railRef = useRef(null);

  useEffect(() => {
    let lastShown = -1;
    const setProgress = (v) => {
      if (v === lastShown) return; // 숫자가 안 바뀐 프레임은 아무것도 안 건드림
      lastShown = v;
      if (numRef.current) numRef.current.textContent = String(v).padStart(2, "0");
      if (railRef.current) railRef.current.style.transform = `scaleY(${v / 100})`;
    };

    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch {}
    if (seen) { setPhase("gone"); return; }

    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden"; // 로딩 중 스크롤 잠금

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let loaded = false;
    let idx = 0;
    let from = 0;
    let stageStart = performance.now();
    let doneAt = 0;
    let finished = false;
    let exitTimer = 0;

    Promise.all([
      document.readyState === "complete"
        ? null
        : new Promise((r) => window.addEventListener("load", r, { once: true })),
      document.fonts ? document.fonts.ready : null,
      preloadImage("/bg.png"),
    ]).then(() => { loaded = true; });
    const capTimer = setTimeout(() => { loaded = true; }, MAX_WAIT_MS);

    const finish = () => {
      if (finished) return;
      finished = true;
      setPhase("exit");
      exitTimer = setTimeout(() => {
        setPhase("gone");
        html.style.overflow = prevOverflow;
        try { sessionStorage.setItem(SEEN_KEY, "1"); } catch {}
      }, reduceMotion ? 200 : EXIT_MS);
    };

    const tick = (now) => {
      // 모든 단계 완료 → 100%에서 잠깐 멈췄다가 화면 걷기
      if (idx >= STAGES.length) {
        if (now - doneAt >= HOLD_MS) return finish();
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const s = STAGES[idx];
      const t = Math.min(1, (now - stageStart) / (s.ms * FILL_RATIO));
      let p = reduceMotion ? s.to : from + (s.to - from) * easeOut(t);

      // 마지막 단계: 실제 로딩이 안 끝났으면 92%에서 기다림
      const blocked = s.waitLoad && !loaded;
      if (blocked) p = Math.min(p, s.to - 8);
      setProgress(Math.floor(p));

      if (!blocked && now - stageStart >= s.ms) {
        // 단계 완료 → 로그에 [ OK ] 표시하고 다음 단계로
        setProgress(s.to);
        from = s.to;
        idx += 1;
        stageStart = now;
        setStage(idx);
        if (idx >= STAGES.length) doneAt = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(capTimer);
      clearTimeout(exitTimer);
      html.style.overflow = prevOverflow;
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div className={"intro" + (phase === "exit" ? " intro--exit" : "")} aria-hidden="true">
      <div className="intro__topo" />
      <div className="intro__stripe" />

      {/* 좌측 세로 진행 바 */}
      <div className="intro__rail">
        <div className="intro__railFill" ref={railRef} />
      </div>

      <div className="intro__center">
        <EndfieldLogo className="intro__logo" />
        <div className="intro__title">
          <span className="intro__kicker">{"//"} 펠리카의</span>
          <span className="intro__name">AIC OPTIMIZER</span>
        </div>

        {/* 단계별 부팅 로그: 진행 중 [ .. ] → 완료 [ OK ] */}
        <div className="intro__log">
          {STAGES.map((s, i) => {
            const state = i < stage ? "is-done" : i === stage ? "is-active" : "";
            return (
              <div key={s.en} className={`intro__logRow ${i <= stage ? "is-on" : ""} ${state}`}>
                <span className="intro__logTag">{i < stage ? "[ OK ]" : "[ .. ]"}</span>
                <span className="intro__logEn">{s.en}</span>
                <span className="intro__logKo">{s.ko}</span>
              </div>
            );
          })}
        </div>

        {/* 4칸 단계 바 */}
        <div className="intro__steps">
          {STAGES.map((s, i) => (
            <span key={s.en} className={i < stage ? "is-done" : i === stage ? "is-active" : ""} />
          ))}
        </div>

        <div className="intro__tagline">TALOS-II {"//"} AUTOMATED INDUSTRY COMPLEX</div>
      </div>

      <div className="intro__pct">
        <span ref={numRef}>00</span><span className="intro__pctSign">%</span>
      </div>
      <div className="intro__code">ENDFIELD INDUSTRIES · UNOFFICIAL FAN TOOL</div>

      {/* 화면이 걷힐 때 지나가는 노란 스캔 라인 */}
      <div className="intro__wipeLine" />
    </div>
  );
}
