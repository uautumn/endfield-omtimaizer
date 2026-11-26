"use client";

// 엔드필드 인더스트리 로고 (역삼각형 + 지형도 등고선 + ENDFIELD INDUSTRIES)
// 이미지 대신 SVG로 그려서 어떤 크기에서도 선명함
//
// 성능 메모 (크롬에서 끊김 방지):
// - 무거운 등고선은 별도 SVG 레이어로 분리하고, 그 레이어 전체의 opacity만 애니메이션함
//   → 브라우저가 GPU 합성으로 처리해서 매 프레임 SVG를 다시 그리지 않음
// - 글자 뒤 선 지우기는 mask 대신 clipPath(띠 위/아래 사각형 2개)로 처리 → 훨씬 가벼움
// - memo로 감싸서 부모(로딩 화면)가 다시 렌더링돼도 로고는 다시 그리지 않음

import { memo, useEffect, useState } from "react";

// ── 지형 높이 함수: 봉우리 두 개 + 잔물결 → 실제 지형도처럼 서로 안 겹치는 등고선이 나옴
function height(x, y) {
  const g = (cx, cy, sx, sy) => Math.exp(-(((x - cx) ** 2) / (2 * sx * sx) + ((y - cy) ** 2) / (2 * sy * sy)));
  return (
    1.0 * g(250, 118, 62, 50) +
    0.75 * g(140, 250, 48, 42) +
    0.35 * g(205, 190, 120, 90) +
    0.07 * Math.sin(x / 19 + y / 31) +
    0.05 * Math.cos(y / 13 - x / 41)
  );
}

// ── 마칭 스퀘어로 높이별 등고선 경로 계산 (브라우저에서 한 번만 실행)
function buildContours() {
  const STEP = 5, N = 400 / STEP;
  const grid = [];
  for (let j = 0; j <= N; j++) {
    const row = [];
    for (let i = 0; i <= N; i++) row.push(height(i * STEP, j * STEP));
    grid.push(row);
  }
  let d = "";
  for (let lv = 0.1; lv < 1.5; lv += 0.05) { // 봉우리 꼭대기까지 채워서 빈 구멍이 안 생기게
    const lerp = (a, b) => (lv - a) / (b - a);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], e = grid[j + 1][i];
        const idx = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (e > lv ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const x = i * STEP, y = j * STEP;
        const top = [x + STEP * lerp(a, b), y];
        const right = [x + STEP, y + STEP * lerp(b, c)];
        const bottom = [x + STEP * lerp(e, c), y + STEP];
        const left = [x, y + STEP * lerp(a, e)];
        const seg = (p, q) => { d += `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`; };
        switch (idx) {
          case 1: case 14: seg(left, bottom); break;
          case 2: case 13: seg(bottom, right); break;
          case 3: case 12: seg(left, right); break;
          case 4: case 11: seg(top, right); break;
          case 6: case 9: seg(top, bottom); break;
          case 7: case 8: seg(left, top); break;
          case 5: seg(left, top); seg(bottom, right); break;
          case 10: seg(top, right); seg(left, bottom); break;
        }
      }
    }
  }
  return d; // 모든 등고선을 경로 하나로 합침 (DOM 요소 수 최소화)
}

const TRI = "40,62 360,62 200,338"; // 역삼각형

// ENDFIELD 글자 띠(y 150~250)를 뺀 위/아래 영역 → 선이 글자 뒤로 끊겨 보이게 함
function OutsideBand({ id }) {
  return (
    <clipPath id={id}>
      <rect x="0" y="0" width="400" height="150" />
      <rect x="0" y="250" width="400" height="150" />
    </clipPath>
  );
}

function EndfieldLogo({ className = "" }) {
  // 등고선은 계산량이 있어서 서버 HTML에 넣지 않고 브라우저에서 그림
  const [contours, setContours] = useState("");
  useEffect(() => { setContours(buildContours()); }, []);

  return (
    <div className={`eflogo ${className}`} role="img" aria-label="Endfield Industries">
      {/* 1층: 삼각형 채움 + 등고선 (무거움 → 레이어 통째로 페이드인만) */}
      <svg className="eflogo__layer eflogo__contourLayer" viewBox="0 0 400 400" aria-hidden="true">
        <defs>
          <clipPath id="ef-tri"><polygon points={TRI} /></clipPath>
          <OutsideBand id="ef-out-a" />
        </defs>
        <g clipPath="url(#ef-out-a)">
          <g clipPath="url(#ef-tri)">
            <polygon points={TRI} className="eflogo__fill" />
            {contours && (
              <path d={contours} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            )}
          </g>
        </g>
      </svg>

      {/* 2층: 프레임, 삼각형 테두리, 글자 (가벼움 → 선 그리기 애니메이션 가능) */}
      <svg className="eflogo__layer" viewBox="0 0 400 400" aria-hidden="true">
        <defs><OutsideBand id="ef-out-b" /></defs>
        <g clipPath="url(#ef-out-b)">
          <g className="eflogo__frame" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 50 H120 M140 50 H162 M300 50 H378 L210 352" pathLength="1" />
            <path d="M22 50 L70 133" pathLength="1" />
            <path d="M196 357 L178 326" pathLength="1" />
          </g>
          <polygon points={TRI} fill="none" stroke="currentColor" strokeWidth="2.5" />
        </g>

        <text x="200" y="222" textAnchor="middle" className="eflogo__word">ENDFIELD</text>

        {/* — I N D U S T R I E S — */}
        <g stroke="currentColor" strokeWidth="2">
          <line x1="22" y1="244" x2="74" y2="244" />
          <line x1="326" y1="244" x2="378" y2="244" />
        </g>
        <text x="200" y="250" textAnchor="middle" className="eflogo__subText">INDUSTRIES</text>
      </svg>
    </div>
  );
}

export default memo(EndfieldLogo);
