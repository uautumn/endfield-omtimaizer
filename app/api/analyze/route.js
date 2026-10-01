import { FACTORY_SYSTEM_PROMPT } from "../factory-prompt.js";

// RAG + 웹 검색 버전
export async function POST(req) {
  try {
    const body = await req.json();
    const { messages, system, model, max_tokens, searchQuery, region } = body;

    // 1. 관련 공략글 검색 (RAG)
    let guideContext = "";
    let guideImages = [];
    if (searchQuery) {
      try {
        const searchRes = await fetch(
          "https://endfield-omtimaizer.vercel.app/api/search",
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

    // 2. 시스템 프롬프트 — factory-prompt.js의 전용 프롬프트 사용
    // 사용자가 선택한 지역 탭을 프롬프트에 주입
    const regionNote = region
      ? `\n\n⚠️ 중요: 이 스크린샷은 사용자가 선택한 [${region}] 지역의 공장이야. 반드시 ${region} 지역 기준으로만 분석하고 레이아웃을 제안해줘. 다른 지역 레이아웃은 출력하지 마.`
      : "";

    const enhancedSystem = guideContext
      ? FACTORY_SYSTEM_PROMPT + regionNote + "\n\n위의 커뮤니티 공략글을 참고해서 더 구체적이고 게임 특화된 분석을 해줘. 공략 출처도 간략히 언급해줘.\n\n필요하면 웹 검색으로 최신 엔드필드 공략 정보도 찾아서 활용해줘."
      : FACTORY_SYSTEM_PROMPT + regionNote + "\n\n필요하면 웹 검색으로 최신 엔드필드 공략 정보를 찾아서 분석에 활용해줘.";

    // 3. Claude API 호출 — 웹 검색 툴 포함
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: max_tokens || 3000,
        system: enhancedSystem,
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
    const fullText = textBlocks.map(b => b.text).join("\n");
    const usedSearch = data.content?.some(b => b.type === "tool_use" && b.name === "web_search");

    // JSON 그리드 블록 파싱
    let gridData = null;
    let text = fullText;
    const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        gridData = JSON.parse(jsonMatch[1]);
        // 텍스트에서 JSON 블록 제거
        text = fullText.replace(/```json[\s\S]*?```/, "").trim();
      } catch (e) {
        console.error("그리드 JSON 파싱 실패:", e.message);
      }
    }

    return Response.json({
      ...data,
      content: text ? [{ type: "text", text }] : data.content,
      usedGuides: !!guideContext,
      usedSearch: !!usedSearch,
      guideImages,
      gridData,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
