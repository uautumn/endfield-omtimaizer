"use client";

// 엔드필드 인더스트리 로고 (역삼각형 + 지형도 등고선 + ENDFIELD INDUSTRIES)
// 이미지 대신 SVG로 그려서 어떤 크기에서도 선명하고, 등고선이 떠오르는 애니메이션이 가능함

import { useEffect, useState } from "react";

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
  const levels = [];
  for (let lv = 0.1; lv < 1.5; lv += 0.05) levels.push(lv); // 봉우리 꼭대기까지 채워서 빈 구멍이 안 생기게

  return levels.map((lv) => {
    let d = "";
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
    return d;
  });
}

const TRI = "40,62 360,62 200,338"; // 역삼각형
const BAND = { x: 0, y: 150, w: 400, h: 100 }; // ENDFIELD 글자가 지나가는 띠 (이 영역은 선을 지움)

export default function EndfieldLogo({ className = "" }) {
  // 등고선은 계산량이 있어서 서버 HTML에 넣지 않고 브라우저에서 그림
  const [contours, setContours] = useState([]);
  useEffect(() => { setContours(buildContours()); }, []);

  return (
    <svg className={className} viewBox="0 0 400 400" role="img" aria-label="Endfield Industries">
      <defs>
        <clipPath id="ef-tri">
          <polygon points={TRI} />
        </clipPath>
        {/* 글자 띠 부분만 비워서 선이 글자 뒤로 끊겨 보이게 함 (배경색 박스 없이) */}
        <mask id="ef-band" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
          <rect width="400" height="400" fill="white" />
          <rect x={BAND.x} y={BAND.y} width={BAND.w} height={BAND.h} fill="black" />
        </mask>
      </defs>

      <g mask="url(#ef-band)">
        {/* 바깥쪽 끊어진 삼각형 라인 */}
        <g className="eflogo__frame" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 50 H120 M140 50 H162 M300 50 H378 L210 352" pathLength="1" />
          <path d="M22 50 L70 133" pathLength="1" />
          <path d="M196 357 L178 326" pathLength="1" />
        </g>

        {/* 삼각형 안 등고선 */}
        <g clipPath="url(#ef-tri)">
          <polygon points={TRI} className="eflogo__fill" />
          <g className="eflogo__contours" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            {contours.map((d, i) => (
              <path key={i} d={d} style={{ animationDelay: `${i * 35}ms` }} />
            ))}
          </g>
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
  );
}
