// RAG 버전 — 공략 DB 검색 후 Claude에 컨텍스트로 전달
export async function POST(req) {
  try {
    const body = await req.json();
    const { messages, system, model, max_tokens, searchQuery, region } = body;

    // 1. 관련 공략글 검색 (searchQuery 있을 때만)
    let guideContext = "";
    let guideImages = [];
    if (searchQuery) {
      try {
        const searchRes = await fetch(
          (req.url.includes("://") ? new URL("/api/search", req.url).toString() : "https://endfield-omtimaizer.vercel.app/api/search"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: searchQuery, region, limit: 3 }),
          }
        );
        const searchData = await searchRes.json();

        if (searchData.results && searchData.results.length > 0) {
          guideContext =
            "\n\n--- 관련 커뮤니티 공략 (참고용) ---\n" +
            searchData.results
              .map(
                (g, i) =>
                  `[공략 ${i + 1}] ${g.title} (${g.region})\n${g.content}`
              )
              .join("\n\n") +
            "\n--- 공략 끝 ---\n";
          // 이미지 URL 목록도 저장
          guideImages = searchData.results
            .filter(g => g.image_url)
            .map(g => ({ title: g.title, image_url: g.image_url }));
        }
      } catch (e) {
        // 검색 실패해도 분석은 계속 진행
        console.error("공략 검색 실패:", e.message);
      }
    }

    // 2. 공략 컨텍스트를 system prompt에 추가
    const enhancedSystem = guideContext
      ? system + "\n\n위의 커뮤니티 공략글을 참고해서 더 구체적이고 게임 특화된 분석을 해줘. 공략 출처도 간략히 언급해줘."
      : system;

    // 3. Claude API 호출
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: max_tokens || 1024,
        system: [
          {
            type: "text",
            text: enhancedSystem,
            cache_control: { type: "ephemeral" }
          }
        ],
        messages,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json(
        { error: data?.error?.message || `HTTP ${res.status}` },
        { status: res.status }
      );
    }

    return Response.json({
      ...data,
      usedGuides: guideContext ? true : false,
      guideImages,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
