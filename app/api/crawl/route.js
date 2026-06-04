import { supabase } from "@/lib/supabase";

// 수집 대상 위키 페이지 목록
const WIKI_SOURCES = [
  // 나무위키
  {
    name: "나무위키 — AIC 공업 시스템",
    url: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC:%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C/%EA%B3%B5%EC%97%85",
    region: "공통",
    type: "namu",
  },
  {
    name: "나무위키 — 거점 시스템",
    url: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC:%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C/%EA%B1%B0%EC%A0%90",
    region: "공통",
    type: "namu",
  },
  {
    name: "나무위키 — 4번 협곡",
    url: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC:%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C/4%EB%B2%88%20%ED%98%91%EA%B3%A1",
    region: "4번 협곡",
    type: "namu",
  },
  {
    name: "나무위키 — 무릉",
    url: "https://namu.wiki/w/%EB%AA%85%EC%9D%BC%EB%B0%A9%EC%A3%BC:%20%EC%97%94%EB%93%9C%ED%95%84%EB%93%9C/%EB%AC%B4%EB%A6%89",
    region: "무릉",
    type: "namu",
  },
  // Endfield 공식 위키 (영문)
  {
    name: "Endfield Wiki — Factory",
    url: "https://endfield.wiki.gg/wiki/Factory",
    region: "공통",
    type: "wiki",
  },
  {
    name: "Endfield Wiki — Base Building",
    url: "https://endfield.wiki.gg/wiki/Base_Building",
    region: "공통",
    type: "wiki",
  },
];

// 나무위키 텍스트 파싱
function parseNamu(html) {
  // 스크립트/스타일 제거
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, "\n")
    .trim();
  return text;
}

// 일반 위키 텍스트 파싱
function parseWiki(html) {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, "\n")
    .trim();
  return text;
}

// 텍스트를 청크로 분할 (500자 단위, 100자 오버랩)
function chunkText(text, chunkSize = 500, overlap = 100) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk);
    start += chunkSize - overlap;
  }
  return chunks;
}

// 임베딩 생성
async function getEmbedding(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000), // 토큰 제한
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "임베딩 실패");
  return data.data[0].embedding;
}

// 크롤 실행 API
export async function POST(req) {
  // 보안: 크롤 API 키 확인
  const { authorization } = Object.fromEntries(req.headers);
  if (authorization !== `Bearer ${process.env.CRAWL_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { success: [], failed: [], total: 0 };

  for (const source of WIKI_SOURCES) {
    try {
      console.log(`크롤링: ${source.name}`);

      // 1. 페이지 fetch
      const res = await fetch(source.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EndfieldBot/1.0)",
          "Accept-Language": "ko-KR,ko;q=0.9",
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      // 2. 텍스트 파싱
      const rawText =
        source.type === "namu" ? parseNamu(html) : parseWiki(html);

      if (rawText.length < 100) throw new Error("콘텐츠 부족");

      // 3. 청크 분할
      const chunks = chunkText(rawText);

      // 4. 기존 같은 소스 삭제 (중복 방지)
      await supabase
        .from("guides")
        .delete()
        .eq("author", `[자동수집] ${source.name}`);

      // 5. 각 청크 임베딩 + 저장
      let savedCount = 0;
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
          const embedding = await getEmbedding(chunk);
          await supabase.from("guides").insert({
            title: `${source.name} (${i + 1}/${chunks.length})`,
            region: source.region,
            content: chunk,
            author: `[자동수집] ${source.name}`,
            embedding,
          });
          savedCount++;
          // API 레이트 리밋 방지
          await new Promise((r) => setTimeout(r, 100));
        } catch (e) {
          console.error(`청크 ${i} 저장 실패:`, e.message);
        }
      }

      results.success.push({
        name: source.name,
        chunks: savedCount,
      });
      results.total += savedCount;
    } catch (e) {
      console.error(`${source.name} 실패:`, e.message);
      results.failed.push({ name: source.name, error: e.message });
    }
  }

  return Response.json({
    message: `크롤링 완료! ${results.total}개 청크 저장`,
    results,
  });
}

// 크롤 상태 조회
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
    const key = g.author;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return Response.json({
    total: data.length,
    sources: summary,
    lastCrawled: data[0]?.created_at || null,
  });
}
