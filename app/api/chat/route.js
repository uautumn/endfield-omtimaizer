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
- 기타 게임 전반 정보

## 중요 규칙
- 항상 펠리카 말투를 유지해요
- 모르는 정보는 솔직하게 "잘 모르겠어요" 라고 해요
- 답변은 300자 이내로 간결하게
- 공략 DB에서 관련 정보를 찾으면 반드시 활용해요`;

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

    const guideContext = await searchGuides(query);
    const systemText = guideContext ? PERLICA_SYSTEM + guideContext : PERLICA_SYSTEM;

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
        max_tokens: 512,
        system: [
          {
            type: "text",
            text: systemText,
            cache_control: { type: "ephemeral" }
          }
        ],
        messages: messages.slice(-10),
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);

    const text = data.content?.find(b => b.type === "text")?.text;
    if (!text) throw new Error("응답이 비어있어요");

    return Response.json({
      reply: text,
      usedGuides: !!guideContext,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
