"use client";

import { useEffect, useRef, useState } from "react";
import EndfieldLogo from "./EndfieldLogo";

// 사이트에 처음 들어왔을 때 한 번만 보여주는 로딩 화면
// - 진행률은 실제 로딩(페이지 load, 폰트, 배경 이미지)에 맞춰 올라감
// - 같은 탭에서 다시 들어오면(sessionStorage) 바로 건너뜀
//   → layout.js의 인라인 스크립트가 첫 화면이 그려지기 전에 숨겨줌
const SEEN_KEY = "aic-intro-seen";
const MIN_SHOW_MS = 1400; // 너무 빨리 사라져서 깜빡이는 느낌이 나지 않도록 최소 노출 시간
const MAX_WAIT_MS = 6000; // 로딩이 늦어져도 이 시간이 지나면 강제로 진행
const EXIT_MS = 600;      // 화면이 걷히는 애니메이션 길이 (globals.css와 맞춤)

const STATUS = [
  [30, "PROTOCOL SYNC", "프로토콜 동기화"],
  [60, "LOADING AIC DATA", "AIC 설비 데이터 로드"],
  [90, "LINKING OPERATORS", "오퍼레이터 연결"],
  [101, "SYSTEM READY", "가동 준비 완료"],
];

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = resolve;
    img.src = src;
  });
}

export default function IntroLoader() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("boot"); // boot → exit → gone
  const rafRef = useRef(0);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch {}
    if (seen) { setPhase("gone"); return; }

    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden"; // 로딩 중 스크롤 잠금

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let loaded = false;
    let finished = false;
    let p = 0;
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
      setProgress(100);
      setPhase("exit");
      exitTimer = setTimeout(() => {
        setPhase("gone");
        html.style.overflow = prevOverflow;
        try { sessionStorage.setItem(SEEN_KEY, "1"); } catch {}
      }, reduceMotion ? 200 : EXIT_MS);
    };

    const tick = () => {
      const elapsed = performance.now() - start;
      if (reduceMotion) {
        // 움직임 줄이기 설정이면 숫자 애니메이션 없이 로딩만 기다림
        if (loaded) return finish();
      } else if (!loaded) {
        p += (90 - p) * 0.025;            // 로딩 중엔 90%까지 천천히 다가감
      } else {
        p += Math.max(1.2, (100 - p) * 0.12); // 로딩 끝나면 100%까지 빠르게
      }
      p = Math.min(p, 100);
      setProgress(Math.floor(p));
      if (p >= 100 && elapsed >= MIN_SHOW_MS) return finish();
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

  const [, statusEn, statusKo] = STATUS.find(([max]) => progress < max) || STATUS[STATUS.length - 1];

  return (
    <div className={"intro" + (phase === "exit" ? " intro--exit" : "")} aria-hidden="true">
      <div className="intro__topo" />
      <div className="intro__stripe" />

      {/* 좌측 세로 진행 바 */}
      <div className="intro__rail">
        <div className="intro__railFill" style={{ transform: `scaleY(${progress / 100})` }} />
      </div>

      <div className="intro__center">
        <EndfieldLogo className="intro__logo" />
        <div className="intro__title">
          <span className="intro__kicker">{"//"} 펠리카의</span>
          <span className="intro__name">AIC OPTIMIZER</span>
        </div>
        <div className="intro__status">
          <span className="intro__dot" />
          <span className="intro__statusEn">{statusEn}</span>
          <span className="intro__statusKo">{statusKo}</span>
        </div>
        <div className="intro__tagline">TALOS-II {"//"} AUTOMATED INDUSTRY COMPLEX</div>
      </div>

      <div className="intro__pct">
        {String(progress).padStart(2, "0")}<span>%</span>
      </div>
      <div className="intro__code">ENDFIELD INDUSTRIES · UNOFFICIAL FAN TOOL</div>

      {/* 화면이 걷힐 때 지나가는 노란 스캔 라인 */}
      <div className="intro__wipeLine" />
    </div>
  );
}
