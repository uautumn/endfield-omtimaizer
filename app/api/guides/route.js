import { supabase } from "@/lib/supabase";

// 공략글 등록 (이미지 포함)
export async function POST(req) {
  try {
    const { title, region, content, author, imageData, imageType, sourceUrl } = await req.json();

    if (!title || !content) {
      return Response.json({ error: "제목과 내용은 필수예요." }, { status: 400 });
    }

    let imageUrl = null;
    let imageAnalysis = "";
    let urlContent = "";

    // 0. URL이 있으면 내용 스크래핑
    if (sourceUrl && sourceUrl.trim()) {
      try {
        urlContent = await scrapeUrl(sourceUrl.trim());
      } catch (e) {
        console.error("URL 스크래핑 실패:", e.message);
      }
    }

    // 1. 이미지가 있으면 Claude Vision으로 분석
    if (imageData && imageType) {
      const visionRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: imageType, data: imageData }
              },
              {
                type: "text",
                text: "이 엔드필드 공장 배치 이미지를 분석해서 한국어로 설명해줘. 설비 배치, 컨베이어 연결, 생산 라인 구성을 구체적으로 설명해줘. 400자 이내로."
              }
            ]
          }]
        })
      });

      const visionData = await visionRes.json();
      if (visionRes.ok) {
        imageAnalysis = visionData.content?.find(b => b.type === "text")?.text || "";
      }

      // 2. Supabase Storage에 이미지 저장
      const fileName = `guides/${Date.now()}.${imageType.split("/")[1]}`;
      const imageBuffer = Buffer.from(imageData, "base64");

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("guide-images")
        .upload(fileName, imageBuffer, { contentType: imageType });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("guide-images")
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    }

    // 3. 임베딩 생성 (텍스트 + 이미지 분석 합쳐서)
    const embedInput = `${title}\n${content}${urlContent ? "\n[URL 내용]\n" + urlContent : ""}${imageAnalysis ? "\n[이미지 분석]\n" + imageAnalysis : ""}`;

    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: embedInput,
      }),
    });

    const embedData = await embedRes.json();
    if (!embedRes.ok) throw new Error(embedData.error?.message || "임베딩 실패");
    const embedding = embedData.data[0].embedding;

    // 4. Supabase DB에 저장
    const { data, error } = await supabase
      .from("guides")
      .insert({
        title,
        region: region || "공통",
        content: content + (urlContent ? "\n\n[참고 URL 내용]\n" + urlContent : "") + (imageAnalysis ? "\n\n[AI 이미지 분석]\n" + imageAnalysis : ""),
        source_url: sourceUrl || null,
        author: author || "익명",
        image_url: imageUrl,
        embedding,
      })
      .select("id, title, region, author, created_at, image_url")
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
    const urlStr = req.url.includes("://") ? req.url : `https://endfield-omtimaizer.vercel.app${req.url}`;
    const { searchParams } = new URL(urlStr);
    const region = searchParams.get("region");

    let query = supabase
      .from("guides")
      .select("id, title, region, author, created_at, content, image_url, source_url")
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

// 공략글 수정
export async function PUT(req) {
  try {
    const { id, title, region, content, author, sourceUrl } = await req.json();
    if (!id || !title || !content) {
      return Response.json({ error: "id, 제목, 내용은 필수예요." }, { status: 400 });
    }

    // 임베딩 재생성
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

    const { data, error } = await supabase
      .from("guides")
      .update({ title, region: region || "공통", content, author: author || "익명", embedding, source_url: sourceUrl || null })
      .eq("id", id)
      .select("id, title, region, author, created_at")
      .single();

    if (error) throw new Error(error.message);
    return Response.json({ success: true, guide: data });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// 공략글 삭제
export async function DELETE(req) {
  try {
    const urlStr = req.url.includes("://") ? req.url : `https://endfield-omtimaizer.vercel.app${req.url}`;
    const { searchParams } = new URL(urlStr);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "id가 필요해요." }, { status: 400 });

    const { error } = await supabase.from("guides").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
