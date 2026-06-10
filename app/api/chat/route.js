import { supabase } from "@/lib/supabase";

const PERLICA_SYSTEM = `당신은 명일방주: 엔드필드의 오퍼레이터 펠리카(Perlica)입니다.

## 펠리카 캐릭터 정보
- 직책: 엔드필드 공업 감독관, 프로토콜 기술 전문가
- 성격: 친근하고 발랄하며 전문적. 관리자를 잘 챙겨줌
- 특기: AIC(자동화 공업 복합체) 시스템 최적화, 거점 건설 지휘
- 속성: 전기 속성 (번개, 에너지 관련)
- 말투: 친근하고 발랄하게. "관리자님" 호칭 사용. 가끔 ✦ 사용
- 외모: 은발, 고양이귀, 파란 눈, 흰색 재킷

## 답변 범위
- AIC 공장 최적화, 컨베이어 배치, 설비 연결
- 거점 업그레이드 우선순위
- 오퍼레이터 육성 공략
- 현재 픽업 배너 및 가챠 정보
- 스토리, 세계관, 캐릭터 정보
- 전투 공략 및 팁
- 최신 업데이트, 이벤트 정보
- 기타 게임 전반 정보

## 도구 사용 규칙
- 최신 정보(배너, 이벤트, 업데이트)는 반드시 웹 검색을 사용해요
- 공략 DB에 있는 정보는 DB를 우선 활용해요
- 검색 결과를 바탕으로 펠리카 말투로 자연스럽게 답변해요

## 중요 규칙
- 항상 펠리카 말투를 유지해요
- 모르는 정보는 솔직하게 "잘 모르겠어요" 라고 해요
- 답변은 400자 이내로 간결하게`;

// 공략 DB 검색
async function searchGuides(query) {
  try {
    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query.slice(0, 1000),
      }),
    });
    const embedData = await embedRes.json();
    if (!embedRes.ok) return "";
    const embedding = embedData.data[0].embedding;
    const { data } = await supabase.rpc("search_guides", {
      query_embedding: embedding,
      match_region: null,
      match_count: 2,
    });
    if (!data?.length) return "";
    return "\n\n[공략 DB 참고]\n" + data.map(g => g.content).join("\n---\n");
  } catch (e) {
    return "";
  }
}

export async function POST(req) {
  try {
    const { messages, query } = await req.json();
    if (!messages || !query) {
      return Response.json({ error: "messages와 query가 필요해요" }, { status: 400 });
    }

    // 공략 DB 검색
    const guideContext = await searchGuides(query);
    const systemText = guideContext
      ? PERLICA_SYSTEM + guideContext
      : PERLICA_SYSTEM;

    // Claude API 호출 — 웹 검색 툴 포함
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text: systemText,
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
        messages: messages.slice(-10),
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);

    // 텍스트 응답 추출 (웹 검색 결과 포함)
    const textBlocks = data.content?.filter(b => b.type === "text") || [];
    const text = textBlocks.map(b => b.text).join("\n");
    if (!text) throw new Error("응답이 비어있어요");

    // 웹 검색 사용 여부 확인
    const usedSearch = data.content?.some(b => b.type === "tool_use" && b.name === "web_search");

    return Response.json({
      reply: text,
      usedGuides: !!guideContext,
      usedSearch: !!usedSearch,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
