import { supabase } from "@/lib/supabase";

// 공략글 등록
export async function POST(req) {
  try {
    const { title, region, content, author } = await req.json();

    if (!title || !content) {
      return Response.json({ error: "제목과 내용은 필수예요." }, { status: 400 });
    }

    // 1. OpenAI Embeddings API로 벡터 생성
    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: `${title}\n${content}`,
      }),
    });

    const embedData = await embedRes.json();
    if (!embedRes.ok) throw new Error(embedData.error?.message || "임베딩 실패");
    const embedding = embedData.data[0].embedding;

    // 2. Supabase에 저장
    const { data, error } = await supabase
      .from("guides")
      .insert({
        title,
        region: region || "공통",
        content,
        author: author || "익명",
        embedding,
      })
      .select("id, title, region, author, created_at")
      .single();

    if (error) throw new Error(error.message);

    return Response.json({ success: true, guide: data });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// 공략글 목록 조회
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const region = searchParams.get("region");

    let query = supabase
      .from("guides")
      .select("id, title, region, author, created_at, content")
      .order("created_at", { ascending: false })
      .limit(50);

    if (region && region !== "전체") {
      query = query.eq("region", region);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return Response.json({ guides: data });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
