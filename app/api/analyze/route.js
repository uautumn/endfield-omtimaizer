// RAG + 웹 검색 버전
export async function POST(req) {
  try {
    const body = await req.json();
    const { messages, system, model, max_tokens, searchQuery, region } = body;

    // 0. 스크린샷이 있으면 이미지로 지역(4번 협곡/무릉) 자동 판별
    let detectedRegion = null;
    let detectDebug = null;
    const imageBlocks = (Array.isArray(messages?.[0]?.content) ? messages[0].content : []).filter(b => b.type === "image");
    if (imageBlocks.length > 0) {
      try {
        const detectRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5",
            max_tokens: 10,
            messages: [
              {
                role: "user",
                content: [
                  ...imageBlocks,
                  {
                    type: "text",
                    text: "이 스크린샷은 명일방주: 엔드필드의 어느 지역 공장이야? '4번 협곡' 또는 '무릉' 중 하나로만 답해. 판단이 어려우면 '불명'이라고 답해.",
                  },
                ],
              },
            ],
          }),
        });
        const detectData = await detectRes.json();
        const raw = detectData?.content?.find(b => b.type === "text")?.text?.trim() || "";
        detectDebug = { status: detectRes.status, raw, apiError: detectData?.error || null };
        if (raw.includes("무릉")) detectedRegion = "무릉";
        else if (raw.includes("4번") || raw.includes("협곡")) detectedRegion = "4번 협곡";
      } catch (e) {
        console.error("지역 판별 실패:", e.message);
        detectDebug = { error: e.message };
      }
    } else {
      detectDebug = { skipped: "이미지 블록 없음", contentType: Array.isArray(messages?.[0]?.content) ? "array" : typeof messages?.[0]?.content };
    }

    // 공략 DB 검색에 사용할 지역: 스크린샷에서 판별된 지역 우선, 실패 시 선택된 탭의 지역 사용
    const effectiveRegion = detectedRegion || region;

    // 1. 관련 공략글 검색 (RAG)
    let guideContext = "";
    let guideImages = [];
    if (searchQuery) {
      try {
        // 지역명이 포함된 검색어는 판별된 지역으로 맞춰서 보정
        const adjustedQuery = (region && effectiveRegion && region !== effectiveRegion)
          ? searchQuery.replace(region, effectiveRegion)
          : searchQuery;
        const searchRes = await fetch(
          "https://endfield-omtimaizer.vercel.app/api/search",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: adjustedQuery, region: effectiveRegion, limit: 3 }),
          }
        );
        const searchData = await searchRes.json();

        if (searchData.results && searchData.results.length > 0) {
          guideContext =
            "\n\n--- 관련 커뮤니티 공략 (참고용) ---\n" +
            searchData.results
              .map((g, i) => `[공략 ${i + 1}] ${g.title} (${g.region})\n${g.content}`)
              .join("\n\n") +
            "\n--- 공략 끝 ---\n";
          guideImages = searchData.results
            .filter(g => g.image_url)
            .map(g => ({ title: g.title, image_url: g.image_url }));
        }
      } catch (e) {
        console.error("공략 검색 실패:", e.message);
      }
    }

    // 2. 시스템 프롬프트 강화
    const enhancedSystem = guideContext
      ? system + "\n\n위의 커뮤니티 공략글을 참고해서 더 구체적이고 게임 특화된 분석을 해줘. 공략 출처도 간략히 언급해줘.\n\n필요하면 웹 검색으로 최신 엔드필드 공략 정보도 찾아서 활용해줘."
      : system + "\n\n필요하면 웹 검색으로 최신 엔드필드 공략 정보를 찾아서 분석에 활용해줘.";

    // 3. Claude API 호출 — 웹 검색 툴 포함
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
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
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 2,
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

    // 텍스트 블록만 추출
    const textBlocks = data.content?.filter(b => b.type === "text") || [];
    const text = textBlocks.map(b => b.text).join("\n");
    const usedSearch = data.content?.some(b => b.type === "tool_use" && b.name === "web_search");

    return Response.json({
      ...data,
      content: text ? [{ type: "text", text }] : data.content,
      usedGuides: !!guideContext,
      usedSearch: !!usedSearch,
      guideImages,
      detectedRegion,
      detectDebug,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
