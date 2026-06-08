import { supabase } from "@/lib/supabase";

const SCRAPER_BASE = "https://api.scraperapi.com";

// ScraperAPI로 페이지 fetch
async function fetchWithScraper(url, json = false, render = true) {
  const renderParam = render ? "true" : "false";
  const scraperUrl = `${SCRAPER_BASE}?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=${renderParam}`;
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
    if (chunk.length > 20) chunks.push(chunk);
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
    url: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC%3A%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C/%EA%B1%B0%EC%A0%90",
    region: "공통",
  },
  {
    name: "나무위키 — 4번 협곡",
    url: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC%3A%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C/4%EB%B2%88%20%ED%98%91%EA%B3%A1",
    region: "4번 협곡",
  },
  {
    name: "나무위키 — 무릉",
    url: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC%3A%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C/%EB%AC%B4%EB%A6%89",
    region: "무릉",
  },
  {
    name: "나무위키 — 엔드필드 메인",
    url: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC%3A%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C",
    region: "공통",
  },
];

// wiki.gg AIC 페이지 — 하위 링크까지 자동 수집
const WIKIGG_ROOT = {
  name: "wiki.gg — AIC",
  url: "https://endfield.wiki.gg/wiki/Automated_Industry_Complex",
  region: "공통",
};

async function crawlWiki(source) {
  const html = await fetchWithScraper(source.url);
  const text = parseHTML(html);
  if (text.length < 30) throw new Error("콘텐츠 부족 (" + text.length + "자)");
  return await saveChunks(chunkText(text), source.name, source.region);
}

// wiki.gg 메인 페이지 + 하위 링크 자동 수집
async function crawlWikiDeep(root) {
  const html = await fetchWithScraper(root.url);
  const mainText = parseHTML(html);
  if (mainText.length < 30) throw new Error("콘텐츠 부족 (" + mainText.length + "자)");

  const chunks = chunkText(mainText);

  // 본문 안의 /wiki/ 링크 추출 (특수 페이지 제외)
  const matches = html.match(/\/wiki\/[A-Za-z0-9_()%]+/g) || [];
  const exclude = ["File:", "Category:", "Template:", "Help:", "Special:", "User:", "Talk:", "Main_Page"];
  const links = [...new Set(matches)]
    .filter(l => !exclude.some(e => l.includes(e)))
    .filter(l => l !== "/wiki/Automated_Industry_Complex")
    .slice(0, 12);

  for (const link of links) {
    try {
      const subHtml = await fetchWithScraper(`https://endfield.wiki.gg${link}`);
      const subText = parseHTML(subHtml);
      if (subText.length > 200) chunks.push(...chunkText(subText));
      await new Promise(r => setTimeout(r, 250));
    } catch (e) { /* 실패해도 계속 */ }
  }

  return await saveChunks(chunks, root.name, root.region);
}

// ── Reddit 크롤링 ────────────────────────────────────────
async function crawlReddit(subreddit) {
  const sourceName = `Reddit r/${subreddit}`;
  const url = `https://www.reddit.com/r/${subreddit}/top.json?t=month&limit=25&raw_json=1`;

  let posts = [];
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "web:endfield-optimizer:v1.0 (by /u/uautumn)",
        "Accept": "application/json",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    posts = data?.data?.children || [];
  } catch (e) {
    try {
      const html = await fetchWithScraper(url);
      const data = JSON.parse(html);
      posts = data?.data?.children || [];
    } catch (e2) {
      throw new Error("Reddit 접근 실패: " + e.message);
    }
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
  if (text.length < 30) throw new Error("아카라이브 콘텐츠 부족 (" + text.length + "자)");

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
    `https://gall.dcinside.com/mgallery/board/lists/?id=${gallId}&sort_type=N`,
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
  if (text.length < 30) throw new Error("디시 콘텐츠 부족 (" + text.length + "자)");

  const chunks = chunkText(text);

  // 개별 글 링크 추출
  const matches = html.match(/\/(mgallery\/)?board\/view\/\?[^"'\s]+/g) || [];
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

// ── 소스 맵 ──────────────────────────────────────────────
const SOURCE_MAP = {
  namu_aic:    () => crawlWiki(WIKI_SOURCES[0]),
  namu_base:   () => crawlWiki(WIKI_SOURCES[1]),
  namu_valley: () => crawlWiki(WIKI_SOURCES[2]),
  namu_wulong: () => crawlWiki(WIKI_SOURCES[3]),
  namu_main:   () => crawlWiki(WIKI_SOURCES[4]),
  wikigg:      () => crawlWikiDeep(WIKIGG_ROOT),
  arcalive:    () => crawlArcalive("akendfield"),
  dcinside:    () => crawlDcInside("endfield"),
};

// ── 크롤링 실행 ──────────────────────────────────────────
export async function POST(req) {
  const authorization = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (authorization !== `Bearer ${process.env.CRAWL_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sourceKey = searchParams.get("source");

  const results = { success: [], failed: [], total: 0 };

  // 특정 소스만 실행
  if (sourceKey) {
    const fn = SOURCE_MAP[sourceKey];
    if (!fn) return Response.json({ error: `알 수 없는 소스: ${sourceKey}` }, { status: 400 });
    try {
      const count = await fn();
      results.success.push({ name: sourceKey, chunks: count });
      results.total += count;
    } catch (e) {
      results.failed.push({ name: sourceKey, error: e.message });
    }
    return Response.json({ message: `${sourceKey} 크롤링 완료! ${results.total}개 청크 저장`, results, debug: { sourceKey } });
  }

  // 전체 실행 (cron용)
  for (const [key, fn] of Object.entries(SOURCE_MAP)) {
    try {
      const count = await fn();
      results.success.push({ name: key, chunks: count });
      results.total += count;
    } catch (e) {
      results.failed.push({ name: key, error: e.message });
    }
  }

  return Response.json({
    message: `전체 크롤링 완료! ${results.total}개 청크 저장`,
    results,
  });
}

// GET — 상태 조회
export async function GET(req) {
  const authorization = req.headers.get("authorization") || req.headers.get("Authorization") || "";
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
