import { supabase } from "@/lib/supabase";

const SCRAPER_BASE = "https://api.scraperapi.com";

// ScraperAPI로 페이지 fetch
async function fetchWithScraper(url, json = false, render = false) {
  const renderParam = render ? "true" : "false";
  const scraperUrl = `${SCRAPER_BASE}?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=${renderParam}&country_code=kr`;
  const res = await fetch(scraperUrl, {
    headers: { "Accept-Language": "ko-KR,ko;q=0.9" }
  });
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
  const factoryRelated = ["Factory", "Conveyor", "Outpost", "Industry", "Production", "Building", "Base", "AIC", "Automated"];
  const links = [...new Set(matches)]
    .filter(l => !exclude.some(e => l.includes(e)))
    .filter(l => l !== "/wiki/Automated_Industry_Complex")
    .filter(l => factoryRelated.some(k => l.includes(k)))
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

// ── 아카라이브 크롤링 (키워드 검색 기반) ────────────────
const FACTORY_KEYWORDS = ["공장", "AIC", "컨베이어", "생산라인", "설비", "자동화"];

async function crawlArcalive(channel) {
  const sourceName = `아카라이브 ${channel}`;
  const allLinks = new Set();

  // 키워드별 검색 결과에서 링크 수집
  for (const kw of FACTORY_KEYWORDS) {
    try {
      const searchUrl = `https://arca.live/b/${channel}?q=${encodeURIComponent(kw)}&sort=recommend`;
      const html = await fetchWithScraper(searchUrl, false, true);
      const matches = html.match(/href="\/b\/[^"?#]+\/\d+"/g) || [];
      matches.map(m => m.replace(/href="|"/g, "")).forEach(l => allLinks.add(l));
      await new Promise(r => setTimeout(r, 200));
    } catch (e) { /* 키워드 하나 실패해도 계속 */ }
  }

  if (allLinks.size === 0) throw new Error("아카라이브 검색 결과 없음");

  // 각 글 본문 수집
  const chunks = [];
  const links = [...allLinks].slice(0, 15);
  for (const link of links) {
    try {
      const postHtml = await fetchWithScraper(`https://arca.live${link}`, false, true);
      const postText = parseHTML(postHtml);
      if (postText.length > 100) {
        // 제목 추출 시도
        const titleMatch = postHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(" - 아카라이브", "").trim() : link;
        chunks.push(`[제목] ${title}\n${postText}`);
      }
      await new Promise(r => setTimeout(r, 300));
    } catch (e) { /* 개별 글 실패 무시 */ }
  }

  if (chunks.length === 0) throw new Error("아카라이브 공장 관련 글 없음");
  return await saveChunks(chunks, sourceName, "공통");
}

// ── 디시인사이드 크롤링 (키워드 검색 기반) ──────────────
async function crawlDcInside(gallId) {
  const sourceName = `디시인사이드 ${gallId}갤`;
  const allLinks = new Set();

  // 키워드별 검색
  for (const kw of ["공장", "AIC", "컨베이어", "설비"]) {
    try {
      const searchUrl = "https://gall.dcinside.com/mgallery/board/lists/?id=" + gallId + "&s_type=search_subject_memo&s_keyword=" + encodeURIComponent(kw);
      const html = await fetchWithScraper(searchUrl, false, true);
      // 디시 글 링크 패턴
      const matches = html.match(/view_url[^"]*"([^"]+)"/g) || [];
      const directMatches = html.match(/href="[^"]*view[^"]*no=\d+[^"]*"/g) || [];
      directMatches.map(m => {
        const match = m.match(/href="([^"]+)"/);
        if (match) allLinks.add(match[1]);
      });
      await new Promise(r => setTimeout(r, 200));
    } catch (e) { /* 계속 */ }
  }

  if (allLinks.size === 0) throw new Error("디시 검색 결과 없음");

  const chunks = [];
  const links = [...allLinks].slice(0, 15);
  for (const link of links) {
    try {
      const fullUrl = link.startsWith("http") ? link : "https://gall.dcinside.com" + link;
      const postHtml = await fetchWithScraper(fullUrl, false, true);
      const postText = parseHTML(postHtml);
      if (postText.length > 100) chunks.push(postText);
      await new Promise(r => setTimeout(r, 300));
    } catch (e) { /* 무시 */ }
  }

  if (chunks.length === 0) throw new Error("디시 공장 관련 글 없음");
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

  // Vercel에서 req.url이 상대경로일 수 있으므로 안전하게 파싱
  let sourceKey = null;
  let debugMode = false;
  try {
    const baseUrl = "https://endfield-omtimaizer.vercel.app";
    const parsedUrl = new URL(req.url.startsWith("http") ? req.url : baseUrl + req.url);
    sourceKey = parsedUrl.searchParams.get("source");
    debugMode = parsedUrl.searchParams.get("debug") === "true";
  } catch (e) {
    // URL 파싱 실패시 body에서 source 읽기 시도
    try {
      const body = await req.json().catch(() => ({}));
      sourceKey = body.source || null;
    } catch (_) {}
  }

  const results = { success: [], failed: [], total: 0 };
  if (debugMode && sourceKey) {
    const urlMap = {
      namu_aic: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC%3A%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C/%EA%B3%B5%EC%97%85",
      arcalive: "https://arca.live/b/akendfield?sort=recommend&p=1",
      dcinside: "https://gall.dcinside.com/mgallery/board/lists/?id=endfield",
      wikigg:   "https://endfield.wiki.gg/wiki/Automated_Industry_Complex",
    };
    const url = urlMap[sourceKey];
    if (!url) return Response.json({ error: "디버그 불가" }, { status: 400 });
    try {
      const html = await fetchWithScraper(url);
      const text = parseHTML(html);
      return Response.json({
        url,
        htmlLength: html.length,
        textLength: text.length,
        textPreview: text.slice(0, 500),
        htmlPreview: html.slice(0, 500),
      });
    } catch (e) {
      return Response.json({ error: e.message });
    }
  }

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
    return Response.json({ message: `${sourceKey} 크롤링 완료! ${results.total}개 청크 저장`, results });
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
