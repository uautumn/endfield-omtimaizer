import { supabase } from "@/lib/supabase";

const SCRAPER_BASE = "https://api.scraperapi.com";

// ScraperAPI로 페이지 fetch
async function fetchWithScraper(url, json = false) {
  const scraperUrl = `${SCRAPER_BASE}?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=false`;
  const res = await fetch(scraperUrl);
  if (!res.ok) throw new Error(`ScraperAPI HTTP ${res.status}`);
  return json ? await res.json() : await res.text();
}

// HTML → 텍스트 파싱
function parseHTML(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, "\n").trim();
}

// 청크 분할
function chunkText(text, size = 500, overlap = 100) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const chunk = text.slice(start, Math.min(start + size, text.length)).trim();
    if (chunk.length > 50) chunks.push(chunk);
    start += size - overlap;
  }
  return chunks;
}

// 임베딩
async function getEmbedding(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 8000) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "임베딩 실패");
  return data.data[0].embedding;
}

// DB 저장
async function saveChunks(chunks, sourceName, region) {
  await supabase.from("guides").delete().eq("author", `[자동수집] ${sourceName}`);
  let count = 0;
  for (let i = 0; i < chunks.length; i++) {
    try {
      const embedding = await getEmbedding(chunks[i]);
      await supabase.from("guides").insert({
        title: `${sourceName} (${i + 1}/${chunks.length})`,
        region,
        content: chunks[i],
        author: `[자동수집] ${sourceName}`,
        embedding,
      });
      count++;
      await new Promise(r => setTimeout(r, 120));
    } catch (e) { console.error(`청크 ${i} 실패:`, e.message); }
  }
  return count;
}

// ── 위키 크롤링 ──────────────────────────────────────────
const WIKI_SOURCES = [
  // 나무위키 — URL 인코딩 처리
  {
    name: "나무위키 — AIC 공업 시스템",
    url: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC%3A%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C%2F%EA%B3%B5%EC%97%85",
    region: "공통",
  },
  {
    name: "나무위키 — 거점 시스템",
    url: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC%3A%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C%2F%EA%B1%B0%EC%A0%90",
    region: "공통",
  },
  {
    name: "나무위키 — 4번 협곡",
    url: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC%3A%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C%2F4%EB%B2%88%20%ED%98%91%EA%B3%A1",
    region: "4번 협곡",
  },
  {
    name: "나무위키 — 무릉",
    url: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC%3A%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C%2F%EB%AC%B4%EB%A6%89",
    region: "무릉",
  },
  // wiki.gg — Fandom보다 안정적
  {
    name: "wiki.gg — Factory",
    url: "https://endfield.wiki.gg/wiki/Factory",
    region: "공통",
  },
  {
    name: "wiki.gg — Base Building",
    url: "https://endfield.wiki.gg/wiki/Base_Building",
    region: "공통",
  },
  {
    name: "wiki.gg — Outpost",
    url: "https://endfield.wiki.gg/wiki/Outpost",
    region: "공통",
  },
  {
    name: "wiki.gg — Conveyor",
    url: "https://endfield.wiki.gg/wiki/Conveyor_Belt",
    region: "공통",
  },
];

async function crawlWiki(source) {
  const html = await fetchWithScraper(source.url);
  const text = parseHTML(html);
  if (text.length < 100) throw new Error("콘텐츠 부족");
  return await saveChunks(chunkText(text), source.name, source.region);
}

// ── Reddit 크롤링 ────────────────────────────────────────
async function crawlReddit(subreddit) {
  const sourceName = `Reddit r/${subreddit}`;
  // JSON 직접 요청
  const url = `https://www.reddit.com/r/${subreddit}/top.json?t=month&limit=25&raw_json=1`;
  const html = await fetchWithScraper(url);

  let posts = [];
  try {
    const data = JSON.parse(html);
    posts = data?.data?.children || [];
  } catch (e) {
    throw new Error("Reddit JSON 파싱 실패");
  }

  const chunks = [];
  for (const post of posts) {
    const d = post.data;
    if (!d || d.score < 30) continue;
    const text = `[제목] ${d.title || ""}\n[내용] ${d.selftext || d.url || ""}\n[업보트] ${d.score}`;
    if (text.length > 100) chunks.push(...chunkText(text));
  }

  if (chunks.length === 0) throw new Error("유효한 게시물 없음");
  return await saveChunks(chunks, sourceName, "공통");
}

// ── 아카라이브 크롤링 ────────────────────────────────────
async function crawlArcalive(channel) {
  const sourceName = `아카라이브 ${channel}`;
  const url = `https://arca.live/b/${channel}?sort=recommend&p=1`;
  const html = await fetchWithScraper(url);
  const text = parseHTML(html);
  if (text.length < 100) throw new Error("콘텐츠 부족");

  const chunks = chunkText(text);

  // 개별 글 링크 추출해서 추가 수집
  const matches = html.match(/href="\/b\/[^"]+\/\d+"/g) || [];
  const links = [...new Set(matches.map(m => m.replace(/href="|"/g, "")))].slice(0, 8);

  for (const link of links) {
    try {
      const postHtml = await fetchWithScraper(`https://arca.live${link}`);
      const postText = parseHTML(postHtml);
      if (postText.length > 200) chunks.push(...chunkText(postText));
      await new Promise(r => setTimeout(r, 300));
    } catch (e) { /* 실패해도 계속 */ }
  }

  return await saveChunks(chunks, sourceName, "공통");
}

// ── 디시인사이드 크롤링 ──────────────────────────────────
async function crawlDcInside(gallId) {
  const sourceName = `디시인사이드 ${gallId}갤`;
  // 마이너 갤러리로 시도
  const urls = [
    `https://gall.dcinside.com/mgallery/board/lists/?id=${gallId}&sort_type=N&search_head=111`,
    `https://gall.dcinside.com/board/lists/?id=${gallId}`,
    `https://m.dcinside.com/board/${gallId}`,
  ];

  let html = "";
  let succeeded = false;
  for (const url of urls) {
    try {
      html = await fetchWithScraper(url);
      if (html.length > 500) { succeeded = true; break; }
    } catch (e) { continue; }
  }

  if (!succeeded) throw new Error("디시 접근 실패");
  const text = parseHTML(html);
  if (text.length < 100) throw new Error("콘텐츠 부족");

  const chunks = chunkText(text);

  // 개별 글 링크 추출
  const matches = html.match(/\/board\/view\/\?[^"'\s]+/g) || [];
  const links = [...new Set(matches)].slice(0, 8);

  for (const link of links) {
    try {
      const postHtml = await fetchWithScraper(`https://gall.dcinside.com${link}`);
      const postText = parseHTML(postHtml);
      if (postText.length > 200) chunks.push(...chunkText(postText));
      await new Promise(r => setTimeout(r, 300));
    } catch (e) { /* 실패해도 계속 */ }
  }

  return await saveChunks(chunks, sourceName, "공통");
}

// ── 메인 크롤링 실행 ─────────────────────────────────────
export async function POST(req) {
  const { authorization } = Object.fromEntries(req.headers);
  if (authorization !== `Bearer ${process.env.CRAWL_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { success: [], failed: [], total: 0 };

  // 위키
  for (const source of WIKI_SOURCES) {
    try {
      const count = await crawlWiki(source);
      results.success.push({ name: source.name, chunks: count });
      results.total += count;
    } catch (e) {
      results.failed.push({ name: source.name, error: e.message });
    }
  }

  // Reddit
  try {
    const count = await crawlReddit("EndfieldGlobal");
    results.success.push({ name: "Reddit r/EndfieldGlobal", chunks: count });
    results.total += count;
  } catch (e) {
    results.failed.push({ name: "Reddit r/EndfieldGlobal", error: e.message });
  }

  // 아카라이브
  try {
    const count = await crawlArcalive("endfield");
    results.success.push({ name: "아카라이브 endfield", chunks: count });
    results.total += count;
  } catch (e) {
    results.failed.push({ name: "아카라이브 endfield", error: e.message });
  }

  // 디시인사이드
  try {
    const count = await crawlDcInside("endfield");
    results.success.push({ name: "디시인사이드 endfield갤", chunks: count });
    results.total += count;
  } catch (e) {
    results.failed.push({ name: "디시인사이드 endfield갤", error: e.message });
  }

  return Response.json({
    message: `크롤링 완료! ${results.total}개 청크 저장`,
    results,
  });
}

// GET — 상태 조회
export async function GET(req) {
  const { authorization } = Object.fromEntries(req.headers);
  if (authorization !== `Bearer ${process.env.CRAWL_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("guides")
    .select("region, author, created_at")
    .like("author", "[자동수집]%")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const summary = data.reduce((acc, g) => {
    acc[g.author] = (acc[g.author] || 0) + 1;
    return acc;
  }, {});

  return Response.json({
    total: data.length,
    sources: summary,
    lastCrawled: data[0]?.created_at || null,
  });
}
