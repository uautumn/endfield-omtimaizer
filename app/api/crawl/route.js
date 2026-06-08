import { supabase } from "@/lib/supabase";

const SCRAPER_BASE = "https://api.scraperapi.com";
const FACTORY_KEYWORDS = ["공장", "AIC", "컨베이어", "생산라인", "설비", "자동화"];

// ScraperAPI fetch
async function fetchWithScraper(url, render = false) {
  const scraperUrl = `${SCRAPER_BASE}?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=${render}&country_code=kr`;
  const res = await fetch(scraperUrl, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`ScraperAPI HTTP ${res.status}`);
  return await res.text();
}

// HTML → 텍스트
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

// 텍스트 청크 분할
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

// 임베딩 생성
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

// ── 1단계: 링크 수집 ─────────────────────────────────────

async function collectArcaliveLinks() {
  const links = new Set();
  for (const kw of FACTORY_KEYWORDS) {
    try {
      const url = `https://arca.live/b/akendfield?q=${encodeURIComponent(kw)}&sort=recommend`;
      const html = await fetchWithScraper(url, true);
      const matches = html.match(/href="\/b\/akendfield\/\d+[^"]*"/g) || [];
      matches.forEach(m => {
        const path = m.match(/href="([^"]+)"/)?.[1];
        if (path) links.add({ url: `https://arca.live${path.split("?")[0]}`, source: "아카라이브", region: "공통" });
      });
    } catch (e) { console.error("아카라이브 링크 수집 실패:", kw, e.message); }
  }
  return [...links];
}

async function collectDcInsideLinks() {
  const links = new Set();
  for (const kw of ["공장", "AIC", "컨베이어", "설비"]) {
    try {
      const url = `https://gall.dcinside.com/mgallery/board/lists/?id=endfield&s_type=search_subject_memo&s_keyword=${encodeURIComponent(kw)}`;
      const html = await fetchWithScraper(url, true);
      const matches = html.match(/href="[^"]*\/mgallery\/board\/view\/\?[^"]+"/g) || [];
      matches.forEach(m => {
        const path = m.match(/href="([^"]+)"/)?.[1];
        if (path) {
          const fullUrl = path.startsWith("http") ? path : `https://gall.dcinside.com${path}`;
          links.add({ url: fullUrl, source: "디시인사이드", region: "공통" });
        }
      });
    } catch (e) { console.error("디시 링크 수집 실패:", kw, e.message); }
  }
  return [...links];
}

async function collectWikiLinks() {
  const links = [];
  try {
    const html = await fetchWithScraper("https://endfield.wiki.gg/wiki/Automated_Industry_Complex");
    const factoryRelated = ["Factory", "Conveyor", "Outpost", "Industry", "Production", "Building", "Base"];
    const matches = html.match(/\/wiki\/[A-Za-z0-9_()%]+/g) || [];
    const exclude = ["File:", "Category:", "Template:", "Special:", "Main_Page"];
    [...new Set(matches)]
      .filter(l => !exclude.some(e => l.includes(e)))
      .filter(l => factoryRelated.some(k => l.includes(k)))
      .slice(0, 10)
      .forEach(l => links.push({ url: `https://endfield.wiki.gg${l}`, source: "wiki.gg", region: "공통" }));
  } catch (e) { console.error("wiki.gg 링크 수집 실패:", e.message); }
  return links;
}

async function collectNamuLinks() {
  const pages = [
    { url: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC%3A%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C/%EA%B3%B5%EC%97%85", region: "공통" },
    { url: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC%3A%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C/%EA%B1%B0%EC%A0%90", region: "공통" },
    { url: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC%3A%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C/4%EB%B2%88%20%ED%98%91%EA%B3%A1", region: "4번 협곡" },
    { url: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC%3A%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C/%EB%AC%B4%EB%A6%89", region: "무릉" },
  ];
  return pages.map(p => ({ url: p.url, source: "나무위키", region: p.region }));
}

// 링크를 큐에 저장 (중복 제외)
async function saveLinksToQueue(links) {
  let saved = 0;
  for (const link of links) {
    const { error } = await supabase.from("crawl_queue").upsert(
      { url: link.url, source: link.source, region: link.region, status: "pending" },
      { onConflict: "url", ignoreDuplicates: true }
    );
    if (!error) saved++;
  }
  return saved;
}

// ── 2단계: 본문 수집 ─────────────────────────────────────

async function processQueue(limit = 3) {
  // pending 상태 링크 가져오기
  const { data: items, error } = await supabase
    .from("crawl_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !items?.length) return { processed: 0, message: "처리할 링크 없음" };

  let processed = 0;
  for (const item of items) {
    try {
      // 본문 fetch
      const isArcalive = item.url.includes("arca.live");
      const isDc = item.url.includes("dcinside.com");
      const html = await fetchWithScraper(item.url, isArcalive || isDc);
      const text = parseHTML(html);

      if (text.length < 50) throw new Error("내용 부족");

      // 제목 추출
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch
        ? titleMatch[1].replace(/[-|].*$/, "").trim()
        : item.source + " 공략";

      // 임베딩 생성 및 저장
      const chunks = chunkText(text);
      for (let i = 0; i < Math.min(chunks.length, 5); i++) {
        const embedding = await getEmbedding(chunks[i]);
        await supabase.from("guides").insert({
          title: `${title} (${i + 1}/${Math.min(chunks.length, 5)})`,
          region: item.region,
          content: chunks[i],
          author: `[자동수집] ${item.source}`,
          source_url: item.url,
          embedding,
        });
      }

      // 처리 완료 표시
      await supabase.from("crawl_queue")
        .update({ status: "done", processed_at: new Date().toISOString() })
        .eq("id", item.id);

      processed++;
    } catch (e) {
      await supabase.from("crawl_queue")
        .update({ status: "failed" })
        .eq("id", item.id);
      console.error(`처리 실패: ${item.url}`, e.message);
    }
  }

  return { processed };
}

// ── API 핸들러 ────────────────────────────────────────────

export async function POST(req) {
  // GET은 헤더 인증만 지원
  let body = {};
  try { body = await req.json(); } catch (_) {}

  // 헤더 또는 body._secret 둘 다 지원
  const authHeader = req.headers.get("authorization") || "";
  const authBody = body._secret ? `Bearer ${body._secret}` : "";
  const auth = authHeader || authBody;
  if (auth !== `Bearer ${process.env.CRAWL_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = body.action || "collect";
  const source = body.source || "all";

  // 상태 조회
  if (action === "status") {
    const [queueRes, guidesRes] = await Promise.all([
      supabase.from("crawl_queue").select("status").then(({ data }) => {
        const counts = { pending: 0, done: 0, failed: 0 };
        data?.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
        return counts;
      }),
      supabase.from("guides")
        .select("author, created_at")
        .like("author", "[자동수집]%")
        .order("created_at", { ascending: false }),
    ]);
    const summary = {};
    guidesRes.data?.forEach(g => { summary[g.author] = (summary[g.author] || 0) + 1; });
    return Response.json({
      total: guidesRes.data?.length || 0,
      sources: summary,
      lastCrawled: guidesRes.data?.[0]?.created_at || null,
      queue: queueRes,
    });
  }

  // 2단계: 본문 처리
  if (action === "process") {
    const result = await processQueue(3);
    return Response.json({ message: `본문 처리 완료`, ...result });
  }

  // 1단계: 링크 수집
  const allLinks = [];
  const results = { success: [], failed: [] };

  const collectors = {
    arcalive: collectArcaliveLinks,
    dcinside: collectDcInsideLinks,
    wikigg: collectWikiLinks,
    namu: collectNamuLinks,
  };

  const toRun = source === "all"
    ? Object.entries(collectors)
    : [[source, collectors[source]]].filter(([, fn]) => fn);

  for (const [key, fn] of toRun) {
    try {
      const links = await fn();
      allLinks.push(...links);
      results.success.push({ name: key, links: links.length });
    } catch (e) {
      results.failed.push({ name: key, error: e.message });
    }
  }

  const saved = await saveLinksToQueue(allLinks);

  // 큐 상태
  const { count: pending } = await supabase
    .from("crawl_queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  return Response.json({
    message: `링크 수집 완료! ${saved}개 저장`,
    results,
    queueStatus: { pending: pending || 0 },
  });
}

// GET: 상태 조회
export async function GET(req) {
  // GET은 헤더 인증만 지원
  const authorization = req.headers.get("authorization") || "";
  if (authorization !== `Bearer ${process.env.CRAWL_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [queueRes, guidesRes] = await Promise.all([
    supabase.from("crawl_queue").select("status").then(({ data }) => {
      const counts = { pending: 0, done: 0, failed: 0 };
      data?.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
      return counts;
    }),
    supabase.from("guides").select("author, created_at")
      .like("author", "[자동수집]%")
      .order("created_at", { ascending: false }),
  ]);

  const summary = {};
  guidesRes.data?.forEach(g => { summary[g.author] = (summary[g.author] || 0) + 1; });

  return Response.json({
    total: guidesRes.data?.length || 0,
    sources: summary,
    lastCrawled: guidesRes.data?.[0]?.created_at || null,
    queue: queueRes,
  });
}
