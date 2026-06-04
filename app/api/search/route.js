import { supabase } from "@/lib/supabase";

// 벡터 유사도 검색
export async function POST(req) {
  try {
    const { query, region, limit = 3 } = await req.json();

    if (!query) {
      return Response.json({ error: "검색어가 필요해요." }, { status: 400 });
    }

    // 1. 검색어 임베딩 생성
    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
      }),
    });

    const embedData = await embedRes.json();
    if (!embedRes.ok) throw new Error(embedData.error?.message || "임베딩 실패");
    const embedding = embedData.data[0].embedding;

    // 2. Supabase pgvector 유사도 검색
    const { data, error } = await supabase.rpc("search_guides", {
      query_embedding: embedding,
      match_region: region || null,
      match_count: limit,
    });

    if (error) throw new Error(error.message);

    return Response.json({ results: data });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
