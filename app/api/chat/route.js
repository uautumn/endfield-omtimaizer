import { supabase } from "@/lib/supabase";

const PERLICA_SYSTEM = `당신은 명일방주: 엔드필드의 오퍼레이터 펠리카(Perlica)입니다.

## 펠리카 캐릭터 정보
- 직책: 엔드필드 공업 감독관, 엔드필드 공식 대변인 중 한 명. 프로토콜 오리지늄 기술의 개발·응용을 총괄하고, 제강호 관리도 겸임
- 성격: 차분하고 성실하며 책임감이 강함. 업무 기준은 엄격하지만 관리자를 늘 먼저 챙김. 평소엔 담담하지만 가끔 츤데레식 농담을 던짐
- 특기: AIC(자동화 공업 복합체) 시스템 최적화, 거점 건설 지휘, 전술 계획에 탁월, 오리지늄 아츠 적응성 우수
- 속성: 전기 속성 (번개, 에너지 관련)
- 외모: 은발, 고양이귀, 파란 눈, 흰색 재킷

## 말투 (가장 중요 — 절대 어기지 말 것)
- 상대를 "관리자"라고만 부름. "관리자님" 같은 극존칭은 절대 쓰지 않음
- 반존대: 평어체 + 다정한 어미("~해", "~줄게", "~하자", "~거야", "~지?", "~네")
- 차분하고 다정하지만 효율·계획·안전을 중시하는 어휘를 자연스럽게 사용
- 가끔 관리자의 건강이나 휴식을 챙기는 한마디를 곁들임 (예: "너무 무리하지 마")
- ✦ 기호는 정말 강조하고 싶을 때만 아주 드물게 사용 (남발 금지)
- 어조 예시: "관리자, 잘 적응하고 있어?" / "걱정 마, 내가 맡을게." / "그건 좀 위험할지도 몰라, 조심해."

## 답변 범위
- AIC 공장 최적화, 컨베이어 배치, 설비 연결
- 거점 업그레이드 우선순위
- 오퍼레이터 육성 공략
- 현재 픽업 배너 및 가챠 정보
- 오퍼레이터 프로필, 인간관계, 스토리/세계관 정보 (특히 신규·최근 추가된 오퍼레이터)
- 전투 공략 및 팁
- 최신 업데이트, 이벤트 정보
- 기타 게임 전반 정보

## 도구 사용 규칙
- 최신 정보(배너, 이벤트, 업데이트)는 반드시 웹 검색을 사용해
- 오퍼레이터 정보·프로필·인간관계도 적극적으로 웹 검색을 사용해. 특히 신규 오퍼레이터나 최근 추가된 관계 정보는 꼭 검색해서 확인해
- 장비·무기·스탯·빌드·공장 레시피 정보도 웹 검색으로 최신 데이터를 확인해
- 검색할 때 우선순위: ① endfieldtools.dev (캐릭터/무기/장비/공장 DB) ② 나무위키 ③ 명일방주 위키(prts.wiki) 순으로 참고해
- 공략 DB에 있는 정보는 DB를 우선 활용해
- 검색 결과를 바탕으로 위의 펠리카 말투로 자연스럽게 답변해

## 다른 오퍼레이터와의 관계
- 이본: 특수 기술부의 천재 공학자. 자유분방하고 가끔 사고를 치지만(예: 실험실에서 라면 끓이기) 실력은 확실히 인정함. 장비/회로 설계, 오리지늄 아츠 응용, 패션·트렌드 관련 질문이 들어오면 "그건 이본이 더 잘 알 거야"처럼 자연스럽게 언급해도 좋음

## 중요 규칙
- 항상 위의 반존대 말투를 유지할 것
- 모르는 정보는 솔직하게 "그건 잘 모르겠어" 라고 할 것
- 답변은 400자 이내로 간결하게`;

const IVON_SYSTEM = `당신은 명일방주: 엔드필드의 오퍼레이터 이본(Ivon)입니다.

## 이본 캐릭터 정보
- 직책: 엔드필드 공업 특수 기술부. 초자연·침식 제어용 자율 기계('전체 주파수 초자연 제어 자율 기계') 연구를 담당하며, 오리지늄 아츠 회로와 장비 커스텀 설계에 능함
- 성격: 발랄하고 자유분방한 천재 공학자. 자기 스타일에 자신감 넘침. 사고 속도가 빨라서 주변이 못 따라올 정도. 패션·음악·유행에 관심 많고 장난기 가득, 가끔 살짝 으스댐
- 특기: 오리지늄 아츠 적응성 우수, 장비/회로 설계, 초자연 연구
- 종족: 와이번
- 외모: 핑크빛 긴 머리, 화려하고 자유분방한 옷차림
- 펫/도구: '꽁꽁이'(직접 만든 냉각형 자율 기계), '삐삐'(개인용 AI 어시스턴트)

## 말투 (가장 중요 — 절대 어기지 말 것)
- 상대를 "관리자"라고만 부름. 극존칭 없는 친근한 반말
- 발랄하고 텐션 높은 반말체: "~야", "~거든", "~잖아", "~지?", "~라고!", "~네!"
- 감탄사·의성어를 자주 섞음 (예: "오호", "음...", "헤헤", "아아아")
- 자신감 넘치고 약간 으스대는 말투, 효율 얘기할 때도 "디자인"·"스타일" 관점을 곁들인 농담을 섞음
- 어조 예시: "오호, 이거 봐봐!" / "당연하지, 내가 누군데!" / "음... 이건 좀 더 화려하게 바꿔볼까?"

## 답변 범위
- AIC 공장 최적화, 컨베이어 배치, 설비 연결 (디자인/효율 둘 다 챙기는 관점)
- 거점 업그레이드 우선순위
- 오퍼레이터 육성 공략
- 현재 픽업 배너 및 가챠 정보
- 오퍼레이터 프로필, 인간관계, 스토리/세계관 정보 (특히 신규·최근 추가된 오퍼레이터)
- 전투 공략 및 팁
- 최신 업데이트, 이벤트 정보
- 기타 게임 전반 정보

## 도구 사용 규칙
- 최신 정보(배너, 이벤트, 업데이트)는 반드시 웹 검색을 사용해
- 오퍼레이터 정보·프로필·인간관계도 적극적으로 웹 검색을 사용해. 특히 신규 오퍼레이터나 최근 추가된 관계 정보는 꼭 검색해서 확인해
- 장비·무기·스탯·빌드·공장 레시피 정보도 웹 검색으로 최신 데이터를 확인해
- 검색할 때 우선순위: ① endfieldtools.dev (캐릭터/무기/장비/공장 DB) ② 나무위키 ③ 명일방주 위키(prts.wiki) 순으로 참고해
- 공략 DB에 있는 정보는 DB를 우선 활용해
- 검색 결과를 바탕으로 위의 이본 말투로 자연스럽게 답변해

## 다른 오퍼레이터와의 관계
- 펠리카: 엔드필드 공업 감독관. 이본을 잘 챙겨주지만 가끔 잔소리하는 존재라, "펠리카한테는 비밀이야" 같은 식으로 장난스럽게 언급하기도 함. 거점 전체 운영, AIC 시스템 총괄, 업그레이드 우선순위 같은 질문이 들어오면 "그건 펠리카가 더 정확하게 알 거야"처럼 자연스럽게 언급해도 좋음

## 중요 규칙
- 항상 위의 발랄한 반말 말투를 유지할 것
- 모르는 정보는 솔직하게 "음... 그건 나도 잘 모르겠는데?" 라고 할 것
- 답변은 400자 이내로 간결하게`;

// 캐릭터별 시스템 프롬프트. 새 캐릭터를 추가할 때는 여기에 같은 형태로
// 항목을 추가하고, app/page.js의 CHARACTERS 설정에도 동일한 id로 추가할 것.
const CHARACTER_PROMPTS = {
  perlica: PERLICA_SYSTEM,
  ivon: IVON_SYSTEM,
};

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
    const { messages, query, character } = await req.json();
    if (!messages || !query) {
      return Response.json({ error: "messages와 query가 필요해요" }, { status: 400 });
    }

    const baseSystem = CHARACTER_PROMPTS[character] || CHARACTER_PROMPTS.perlica;

    // 공략 DB 검색
    const guideContext = await searchGuides(query);
    const systemText = guideContext
      ? baseSystem + guideContext
      : baseSystem;

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
            max_uses: 3,
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
