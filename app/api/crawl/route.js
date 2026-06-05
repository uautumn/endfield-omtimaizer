import { supabase } from "@/lib/supabase";

const SCRAPER_BASE = "https://api.scraperapi.com";

// ScraperAPI로 페이지 fetch
async function fetchWithScraper(url, json = false) {
  const scraperUrl = `${SCRAPER_BASE}?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=false`;
  const res = await fetch(scraperUrl);
  if (!res.ok) throw new Error(`ScraperAPI HTTP ${res.status}`);
  return json ? await res.json() : await res.text();
}

// 텍스트 파싱
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
      await new Promise(r => setTimeout(r, 100));
    } catch (e) { console.error(`청크 ${i} 실패:`, e.message); }
  }
  return count;
}

// ── 크롤러들 ────────────────────────────────────────────

// 위키 크롤링 (나무위키, Fandom)
async function crawlWiki(source) {
  const html = await fetchWithScraper(source.url);
  const text = parseHTML(html);
  if (text.length < 100) throw new Error("콘텐츠 부족");
  const chunks = chunkText(text);
  return await saveChunks(chunks, source.name, source.region);
}

// Reddit 크롤링 (JSON API)
async function crawlReddit(subreddit, region = "공통") {
  const sourceName = `Reddit r/${subreddit}`;
  const url = `https://www.reddit.com/r/${subreddit}/top.json?t=month&limit=25`;
  const data = await fetchWithScraper(url, true);
  const posts = data?.data?.children || [];

  const chunks = [];
  for (const post of posts) {
    const d = post.data;
    // 공략성 글만 필터 (업보트 50 이상, 셀프 포스트)
    if (d.score < 50 || !d.selftext || d.selftext.length < 100) continue;
    const text = `[제목] ${d.title}\n[내용] ${d.selftext}\n[업보트] ${d.score}`;
    chunks.push(...chunkText(text));
  }

  if (chunks.length === 0) throw new Error("유효한 공략 게시물 없음");
  return await saveChunks(chunks, sourceName, region);
}

// 아카라이브 크롤링
async function crawlArcalive(channel = "endfield") {
  const sourceName = `아카라이브 ${channel}`;
  const url = `https://arca.live/b/${channel}?sort=recommend`;
  const html = await fetchWithScraper(url);
  const text = parseHTML(html);
  if (text.length < 100) throw new Error("콘텐츠 부족");

  // 개별 글 링크 파싱
  const linkPattern = /\/b\/[^"'\s]+\/\d+/g;
  const links = [...new Set(html.match(linkPattern) || [])].slice(0, 10);

  const chunks = [text]; // 목록 페이지 텍스트
  for (const link of links) {
    try {
      const postHtml = await fetchWithScraper(`https://arca.live${link}`);
      const postText = parseHTML(postHtml);
      if (postText.length > 200) chunks.push(...chunkText(postText));
      await new Promise(r => setTimeout(r, 200));
    } catch (e) { console.error(`아카라이브 글 실패:`, e.message); }
  }

  return await saveChunks(chunks, sourceName, "공통");
}

// 디시인사이드 크롤링
async function crawlDcInside(gallId = "endfield") {
  const sourceName = `디시인사이드 ${gallId}갤`;
  const url = `https://gall.dcinside.com/board/lists/?id=${gallId}&sort_type=recommend`;
  const html = await fetchWithScraper(url);
  const text = parseHTML(html);
  if (text.length < 100) throw new Error("콘텐츠 부족");

  // 개별 글 링크 파싱
  const linkPattern = /\/board\/view\/\?id=[^&"'\s]+&no=\d+/g;
  const links = [...new Set(html.match(linkPattern) || [])].slice(0, 10);

  const chunks = [text];
  for (const link of links) {
    try {
      const postHtml = await fetchWithScraper(`https://gall.dcinside.com${link}`);
      const postText = parseHTML(postHtml);
      if (postText.length > 200) chunks.push(...chunkText(postText));
      await new Promise(r => setTimeout(r, 200));
    } catch (e) { console.error(`디시 글 실패:`, e.message); }
  }

  return await saveChunks(chunks, sourceName, "공통");
}

// ── 크롤 소스 목록 ───────────────────────────────────────
const WIKI_SOURCES = [
  { name: "나무위키 — AIC 공업 시스템", url: "https://namu.wiki/w/명일방주: 엔드필드/공업", region: "공통" },
  { name: "나무위키 — 거점 시스템", url: "https://namu.wiki/w/명일방주: 엔드필드/거점", region: "공통" },
  { name: "나무위키 — 4번 협곡", url: "https://namu.wiki/w/명일방주: 엔드필드/4번 협곡", region: "4번 협곡" },
  { name: "나무위키 — 무릉", url: "https://namu.wiki/w/명일방주: 엔드필드/무릉", region: "무릉" },
  { name: "Fandom — Factory", url: "https://arknights-endfield.fandom.com/wiki/Factory", region: "공통" },
  { name: "Fandom — Base Building", url: "https://arknights-endfield.fandom.com/wiki/Base_Building", region: "공통" },
  { name: "Fandom — Valley No.4", url: "https://arknights-endfield.fandom.com/wiki/Valley_No.4", region: "4번 협곡" },
  { name: "Fandom — Wulong", url: "https://arknights-endfield.fandom.com/wiki/Wulong", region: "무릉" },
];

// POST — 크롤링 실행
export async function POST(req) {
  const { authorization } = Object.fromEntries(req.headers);
  if (authorization !== `Bearer ${process.env.CRAWL_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { success: [], failed: [], total: 0 };

  // 1. 위키 크롤링
  for (const source of WIKI_SOURCES) {
    try {
      const count = await crawlWiki(source);
      results.success.push({ name: source.name, chunks: count });
      results.total += count;
    } catch (e) {
      results.failed.push({ name: source.name, error: e.message });
    }
  }

  // 2. Reddit 크롤링
  try {
    const count = await crawlReddit("EndfieldGlobal", "공통");
    results.success.push({ name: "Reddit r/EndfieldGlobal", chunks: count });
    results.total += count;
  } catch (e) {
    results.failed.push({ name: "Reddit r/EndfieldGlobal", error: e.message });
  }

  // 3. 아카라이브 크롤링
  try {
    const count = await crawlArcalive("endfield");
    results.success.push({ name: "아카라이브 endfield", chunks: count });
    results.total += count;
  } catch (e) {
    results.failed.push({ name: "아카라이브 endfield", error: e.message });
  }

  // 4. 디시인사이드 크롤링
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

// GET — 크롤 상태 조회
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

  return Response.json({ total: data.length, sources: summary, lastCrawled: data[0]?.created_at || null });
}
