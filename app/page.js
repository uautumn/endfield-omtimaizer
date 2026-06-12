"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

const CHARACTERS = {
  perlica: {
    id: "perlica",
    name: "펠리카",
    nameEn: "PERLICA",
    tag: "[ 펠리카 ]",
    accent: "#E8D800",
    accentDark: "#b8a800",
    images: {
      idle: "/characters/perlica/idle.jpg",
      checking: "/characters/perlica/idle.jpg",
      analyzing: "/characters/perlica/analyzing.jpg",
      done: "/characters/perlica/done.jpg",
      result: "/characters/perlica/done.jpg",
      illustration: "/characters/perlica/illustration.jpg",
    },
    greeting: "관리자, 왔구나. 공장 공략이든 육성이든 배너 정보든, 필요한 거 있으면 물어봐.",
    placeholder: "펠리카에게 물어봐...",
  },
  ivon: {
    id: "ivon",
    name: "이본",
    nameEn: "IVON",
    tag: "[ 이본 ]",
    accent: "#FF4FA0",
    accentDark: "#B8005C",
    images: {
      idle: "/characters/ivon/idle.jpg",
      checking: "/characters/ivon/idle.jpg",
      analyzing: "/characters/ivon/analyzing.jpg",
      done: "/characters/ivon/done.jpg",
      result: "/characters/ivon/done.jpg",
      illustration: "/characters/ivon/illustration.jpg",
    },
    greeting: "오, 관리자! 마침 잘 왔어. 공장이든 장비든 뭐든 물어봐, 내가 더 멋지게 손봐줄게!",
    placeholder: "이본한테 물어봐!",
  },
  // 캐릭터 추가 시 여기에 동일한 형태로 항목을 추가하고,
  // /public/characters/<id>/ 에 idle.jpg, analyzing.jpg, done.jpg, illustration.jpg 를 넣고,
  // app/api/chat/route.js 의 CHARACTER_PROMPTS 에 페르소나를 추가하면 됨
};
const FI = CHARACTERS.perlica.images; // 펠리카 헤더(분석 영역)는 항상 펠리카 고정

// hex 색상을 "r,g,b" 문자열로 변환 (rgba() 동적 사용용)
const hexToRgb = hex => {
  const h = hex.replace("#","");
  const n = parseInt(h.length===3 ? h.split("").map(c=>c+c).join("") : h, 16);
  return `${(n>>16)&255},${(n>>8)&255},${n&255}`;
};

// ── 테마 팔레트 ──────────────────────────────────────────
// 4번 협곡: PPT 원본색 (#FF6B00 오렌지 계열)
// 무릉: 민트 계열 (#1ec8a0)
const THEME = {
  "4번 협곡": {
    accent:   "#FF6B00",
    accent2:  "#cc5500",
    accentDim:"#FF6B0018",
    accentBd: "#FF6B0055",
    accentGlow:"#FF6B0088",
    bg:       "#0D1324",
    bg2:      "#111827",
    bg3:      "#1a2234",
    line:     "#FF6B0030",
    text:     "#e8e0d8",
    sub:      "#94A3B8",
    dim:      "#475569",
    dark:     "#1a1008",
    label:    "4번 협곡",
    sub_en:   "VALLEY NO.4",
    icon:     "⚡",
  },
  "무릉": {
    accent:   "#1ec8a0",
    accent2:  "#14a882",
    accentDim:"#1ec8a018",
    accentBd: "#1ec8a044",
    accentGlow:"#1ec8a088",
    bg:       "#03080f",
    bg2:      "#071220",
    bg3:      "#0a1828",
    line:     "#1ec8a028",
    text:     "#c8e8e0",
    sub:      "#4a7a6e",
    dim:      "#1a3830",
    dark:     "#020608",
    label:    "무릉",
    sub_en:   "WULONG REGION",
    icon:     "🌊",
  }
};

const REGIONS = {
  "4번 협곡": {
    cores:{"통합 핵심구역":[
      {id:"c1",label:"구역 확장 · 1"},{id:"c2",label:"구역 확장 · 2"},
      {id:"c3",label:"창고 입출력 라인 · Ⅰ"},{id:"c4",label:"창고 입출력 라인 · Ⅱ"},
      {id:"c5",label:"창고 입출력 라인 · Ⅲ"},{id:"c6",label:"창고 입출력 라인 · Ⅳ"},
      {id:"c7",label:"창고 입출력 라인 · Ⅴ"},{id:"c8",label:"창고 입출력 라인 · Ⅵ"},
    ]},
    outposts:{
      "유랑자 임시 거주지":[{id:"a1",label:"구역 확장 · 1"},{id:"a2",label:"구역 확장 · 2"},{id:"a3",label:"창고 입출력 라인 · Ⅰ"},{id:"a4",label:"창고 입출력 라인 · Ⅱ"},{id:"a5",label:"창고 입출력 라인 · Ⅲ"}],
      "기초 건설 주둔지":[{id:"b1",label:"구역 확장 · 1"},{id:"b2",label:"구역 확장 · 2"},{id:"b3",label:"창고 입출력 라인 · Ⅰ"},{id:"b4",label:"창고 입출력 라인 · Ⅱ"},{id:"b5",label:"창고 입출력 라인 · Ⅲ"}],
      "재건 지휘부":[{id:"d1",label:"구역 확장 · 1"},{id:"d2",label:"구역 확장 · 2"},{id:"d3",label:"창고 입출력 라인 · Ⅰ"},{id:"d4",label:"창고 입출력 라인 · Ⅱ"},{id:"d5",label:"창고 입출력 라인 · Ⅲ"}],
    }
  },
  "무릉":{
    cores:{"무릉성":[
      {id:"m1",label:"구역 확장 · 1"},{id:"m2",label:"구역 확장 · 2"},
      {id:"m3",label:"무릉 창고 입출력 라인 해제"},
      {id:"m4",label:"창고 입출력 라인 기초 장치 증가"},{id:"m5",label:"창고 입출력 라인 기초 장치 증가 Ⅱ"},
      {id:"m6",label:"창고 입출력 라인 핵심 및 기초 장치 증가"},{id:"m7",label:"창고 입출력 라인 기초 장치 증가 Ⅲ"},
    ]},
    outposts:{
      "천왕 평지 건설 지원소":[{id:"t1",label:"구역 확장 · 1"},{id:"t2",label:"구역 확장 · 2"},{id:"t3",label:"무릉 창고 입출력 라인 해제"},{id:"t4",label:"창고 입출력 라인 기초 장치 증가"},{id:"t5",label:"창고 입출력 라인 기초 장치 증가 Ⅱ"},{id:"t6",label:"창고 입출력 라인 핵심 및 기초 장치 증가"}],
      "심장 수복실":[{id:"s1",label:"구역 확장 · 1"},{id:"s2",label:"구역 확장 · 2"},{id:"s3",label:"무릉 창고 입출력 라인 해제"},{id:"s4",label:"창고 입출력 라인 기초 장치 증가"},{id:"s5",label:"창고 입출력 라인 기초 장치 증가 Ⅱ"},{id:"s6",label:"창고 입출력 라인 핵심 및 기초 장치 증가"}],
    }
  }
};

const MSGS = {
  idle:["관리자, 공장 스크린샷을 올려주면 배치까지 분석해 줄게.","탈로스 II의 AIC 최적화, 나한테 맡겨둬.","엔드필드 공업 가동 준비 완료 — 스크린샷 올려봐."],
  checking:["차근차근 확인하고 있네. 그 속도면 충분해.","완료 항목이 늘어날수록 AIC 효율도 올라가.","꼼꼼하게 확인 중이군, 좋아."],
  done:["전부 완료됐네. 수고했어, 관리자.","오늘은 여기까지면 충분해. 너무 무리하지 말고."],
  analyzing:["공장 데이터 분석 중... AIC 시스템 풀가동.","프로토콜 연산 처리 중... 곧 끝나."],
  result:["분석 완료. 맞춤 최적화 플랜이야.","이대로면 AIC 효율이 확실히 올라갈 거야."],
};

const SYS = `당신은 명일방주: 엔드필드의 펠리카입니다. 엔드필드 공업 감독관이자 엔드필드 공식 대변인으로, 프로토콜 오리지늄 기술과 AIC 최적화를 총괄해.
스크린샷이 있으면 공장 배치, 컨베이어 라인, 설비 연결 상태를 분석하고 병목과 개선점을 구체적으로 찾아줘.
거점 업그레이드 정보도 있으면 미완료 항목 우선순위도 함께 추천해줘.
말투: 차분하고 다정한 반존대. 상대를 "관리자"라고만 부르고 "관리자님" 같은 극존칭은 쓰지 않음. 평어체+다정한 어미("~해","~줄게","~하자"). 강조할 때만 ✦ 아주 가끔 사용.
형식: 📊현황요약(2줄) / ⚠️주요문제점(2~3개) / ✅펠리카추천순서(3단계) / 💡기대효과(1줄). 400자 이내.`;

const STEPS = ["거점 데이터 수집...","공장 배치 분석...","병목 탐지...","최적화 플랜 생성...","분석 완료 ✦"];
const rnd = arr => arr[Math.floor(Math.random()*arr.length)];
const allIds = rd => [...Object.values(rd.cores).flat(),...Object.values(rd.outposts).flat()];
const CP16 = "polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))";
const CP8  = "polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px))";

export default function Home() {
  const initChecks = () => {
    const c={};
    Object.values(REGIONS).forEach(r=>{
      Object.values(r.cores).forEach(arr=>arr.forEach(u=>{c[u.id]=false;}));
      Object.values(r.outposts).forEach(arr=>arr.forEach(u=>{c[u.id]=false;}));
    });
    return c;
  };

  const [checks,setChecks] = useState(initChecks);
  const [levels,setLevels] = useState({"4번 협곡":12,"무릉":15});
  const [region,setRegion] = useState("4번 협곡");
  const [mood,setMood] = useState("idle");
  const [msg,setMsg] = useState(null);
  const [mounted,setMounted] = useState(false);
  useEffect(()=>{ setMounted(true); setMsg(rnd(MSGS.idle)); },[]);
  const [shots,setShots] = useState([]);
  const [dragOver,setDragOver] = useState(false);
  const [analyzing,setAnalyzing] = useState(false);
  const [step,setStep] = useState(0);
  const [result,setResult] = useState(null);
  const [error,setError] = useState(null);
  const [usedGuides,setUsedGuides] = useState(false);
  const [usedSearch,setUsedSearch] = useState(false);
  const [guideImages,setGuideImages] = useState([]);
  const [chatOpen,setChatOpen] = useState(false);
  const [chatChar,setChatChar] = useState("perlica");
  const chatCharData = CHARACTERS[chatChar];
  const chatAccent = chatCharData.accent;
  const chatAccentDark = chatCharData.accentDark || chatCharData.accent;
  const chatAccentRgb = hexToRgb(chatAccent);
  const [chatMessagesByChar,setChatMessagesByChar] = useState(() => {
    const init = {};
    Object.values(CHARACTERS).forEach(c=>{ init[c.id] = [{ role:"assistant", content:c.greeting, usedGuides:false }]; });
    return init;
  });
  const chatMessages = chatMessagesByChar[chatChar];
  const setChatMessages = updater => {
    setChatMessagesByChar(prev => ({
      ...prev,
      [chatChar]: typeof updater === "function" ? updater(prev[chatChar]) : updater
    }));
  };
  const [chatInput,setChatInput] = useState("");
  const [chatLoading,setChatLoading] = useState(false);
  const fileRef = useRef();
  const chatEndRef = useRef();

  const T = THEME[region];
  const rdata = REGIONS[region];
  const totalDone = Object.values(checks).filter(Boolean).length;
  const totalAll = Object.values(checks).length;
  const pct = Math.round(totalDone/totalAll*100);
  const stepPct = Math.round(step/(STEPS.length-1)*100);
  const prog = items => { const d=items.filter(u=>checks[u.id]).length; return {done:d,total:items.length,pct:Math.round(d/items.length*100)}; };

  const toggle = id => {
    setChecks(prev=>{
      const next={...prev,[id]:!prev[id]};
      const all=Object.values(next).every(Boolean);
      setMood(all?"done":"checking");
      setMsg(rnd(all?MSGS.done:MSGS.checking));
      return next;
    });
  };

  const handleFiles = files => {
    Array.from(files).filter(f=>f.type.startsWith("image/")).forEach(file=>{
      const reader=new FileReader();
      reader.onload=e=>setShots(prev=>[...prev,{preview:e.target.result,data:e.target.result.split(",")[1],type:file.type,name:file.name}]);
      reader.readAsDataURL(file);
    });
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role:"user", content:chatInput.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          messages: newMessages.map(m=>({role:m.role,content:m.content})),
          query: chatInput.trim(),
          character: chatChar
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||"오류");
      setChatMessages(prev=>[...prev,{role:"assistant",content:data.reply,usedGuides:data.usedGuides,usedSearch:data.usedSearch}]);
    } catch(e) {
      setChatMessages(prev=>[...prev,{role:"assistant",content:"앗, 오류가 났네... 다시 시도해 줘.",usedGuides:false}]);
    }
    setChatLoading(false);
  };

  const doAnalyze = async () => {
    setAnalyzing(true); setStep(0); setResult(null); setError(null); setGuideImages([]); setUsedSearch(false);
    setMood("analyzing"); setMsg(rnd(MSGS.analyzing));
    let s=0;
    const timer=setInterval(()=>{ s=Math.min(s+1,STEPS.length-1); setStep(s); },700);
    const lines=[];
    Object.entries(REGIONS).forEach(([rname,rd])=>{
      lines.push("◆ "+rname+" (건설 레벨 "+levels[rname]+")");
      Object.entries(rd.cores).forEach(([cn,items])=>{ const u=items.filter(x=>!checks[x.id]).map(x=>x.label); lines.push("  [코어:"+cn+"] 미완료:"+(u.join(", ")||"없음")); });
      Object.entries(rd.outposts).forEach(([on,items])=>{ const u=items.filter(x=>!checks[x.id]).map(x=>x.label); lines.push("  [거점:"+on+"] 미완료:"+(u.join(", ")||"없음")); });
    });
    const upgradeInfo = "전체 완료율:"+pct+"%\n"+lines.join("\n");
    const userContent = shots.length>0
      ? [...shots.map(s=>({type:"image",source:{type:"base64",media_type:s.type,data:s.data}})),{type:"text",text:upgradeInfo+"\n\n위 스크린샷의 공장 배치와 업그레이드 현황을 종합해서 분석해줘."}]
      : upgradeInfo;
    try {
      // 검색 쿼리 생성 (지역 + 미완료 항목 키워드)
      const undoneLabels = Object.entries(REGIONS).flatMap(([rname,rd])=>
        [...Object.values(rd.cores).flat(),...Object.values(rd.outposts).flat()]
          .filter(u=>!checks[u.id]).slice(0,3).map(u=>u.label)
      ).join(" ");
      const searchQuery = region + " " + undoneLabels + " 공장 최적화";

      const res = await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1024,system:SYS,messages:[{role:"user",content:userContent},],searchQuery,region})});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||"API 오류 ("+res.status+")");
      const text = data.content&&data.content.find(b=>b.type==="text")&&data.content.find(b=>b.type==="text").text;
      if (!text) throw new Error("응답이 비어있어요.");
      clearInterval(timer); setStep(STEPS.length-1);
      setUsedGuides(data.usedGuides || false);
      setUsedSearch(data.usedSearch || false);
      setGuideImages(data.guideImages || []);
      setTimeout(()=>{ setResult(text); setAnalyzing(false); setMood("result"); setMsg(rnd(MSGS.result)); },400);
    } catch(e) {
      clearInterval(timer); setError(e.message); setAnalyzing(false); setMood("idle"); setMsg(rnd(MSGS.idle));
    }
  };

  const Block = ({title,items,isCore}) => {
    const {done,total,pct:p}=prog(items);
    const allChecked=items.every(u=>checks[u.id]);
    const toggleAll=()=>{
      const next={...checks}; items.forEach(u=>{next[u.id]=!allChecked;});
      setChecks(next);
      const ad=Object.values(next).every(Boolean);
      setMood(ad?"done":allChecked?"idle":"checking");
      setMsg(rnd(ad?MSGS.done:allChecked?MSGS.idle:MSGS.checking));
    };
    return (
      <div style={{marginBottom:"8px",background:"rgba(0,0,0,0.55)",borderLeft:"2px solid "+(isCore?T.accent:T.dim),clipPath:CP8,backdropFilter:"blur(6px)"}}>
        <div style={{padding:"8px 12px 6px",display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:"8px",color:T.dim,letterSpacing:"0.15em",marginBottom:"1px"}}>{isCore?"// PROTOCOL CORE":"// OUTPOST"}</div>
            <div style={{fontSize:"15px",color:isCore?T.accent:T.text,fontWeight:"600"}}>{title}</div>
          </div>
          <div style={{textAlign:"right",marginRight:"6px"}}>
            <div style={{fontSize:"18px",fontWeight:"bold",color:p===100?"#4ecb80":T.accent,lineHeight:1}}>{p===100?"✓":done}</div>
            <div style={{fontSize:"8px",color:T.sub}}>/ {total}</div>
          </div>
          <button onClick={toggleAll} style={{fontSize:"9px",padding:"3px 8px",background:"transparent",border:"1px solid "+(allChecked?T.accent+"88":T.accentBd),color:allChecked?T.accent:T.sub,cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.06em",clipPath:"polygon(0 0,calc(100%-4px) 0,100% 4px,100% 100%,4px 100%,0 calc(100%-4px))"}}>
            {allChecked?"RESET":"ALL"}
          </button>
        </div>
        <div style={{height:"2px",background:"rgba(255,255,255,0.08)"}}>
          <div style={{height:"100%",width:p+"%",background:p===100?"#4ecb80":T.accent,transition:"width 0.4s",boxShadow:"0 0 6px "+T.accent}}/>
        </div>
        <div style={{padding:"0 10px 6px"}}>
          {items.map(u=>(
            <div key={u.id} onClick={()=>toggle(u.id)} style={{display:"flex",alignItems:"center",gap:"10px",padding:"7px 2px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.05)",userSelect:"none"}}>
              <div style={{width:"16px",height:"16px",flexShrink:0,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{width:"12px",height:"12px",border:"1px solid "+(checks[u.id]?T.accent:T.sub),background:checks[u.id]?T.accentDim:"transparent",transform:"rotate(45deg)",transition:"all 0.15s"}}/>
                {checks[u.id]&&<div style={{position:"absolute",width:"5px",height:"5px",background:T.accent,transform:"rotate(45deg)",boxShadow:"0 0 4px "+T.accent}}/>}
              </div>
              <span style={{fontSize:"14px",color:checks[u.id]?"rgba(255,255,255,0.2)":T.text,textDecoration:checks[u.id]?"line-through":"none",fontFamily:"monospace",transition:"all 0.15s"}}>{u.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 지역별 배경 그라디언트 색상
  const bgGrad = region==="4번 협곡"
    ? "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,107,0,0.18) 0%, rgba(13,19,36,0.5) 60%, transparent 100%)"
    : "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(30,200,160,0.15) 0%, rgba(3,8,15,0.5) 60%, transparent 100%)";

  return (
    <div style={{minHeight:"100vh",fontFamily:"monospace",color:T.text,position:"relative",background:"#030609",transition:"background 0.4s"}}>

      {/* ── 배경 이미지 — opacity 높여서 더 잘 보이게 ── */}
      <div style={{position:"fixed",inset:0,zIndex:0}}>
        <img src="/bg.png" alt="" style={{
          width:"100%", height:"100%",
          objectFit:"cover", objectPosition:"center 20%",
          opacity:0.28,
          filter:"saturate(0.7) brightness(0.75)"
        }}/>
        {/* 지역별 컬러 오버레이 — 상단만 살짝 */}
        <div style={{position:"absolute",inset:0,background:bgGrad,transition:"background 0.5s"}}/>
        {/* 하단 페이드아웃 — 콘텐츠 가독성 확보 */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg, transparent 0%, transparent 30%, rgba(3,6,9,0.7) 60%, rgba(3,6,9,0.95) 85%, #030609 100%)"}}/>
        {/* 스캔라인 */}
        <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.012) 3px,rgba(255,255,255,0.012) 4px)"}}/>
      </div>

      <div style={{position:"relative",zIndex:1,maxWidth:"880px",margin:"0 auto",padding:"0 0 64px"}}>

        {/* ── 펠리카 헤더 — 퍼스널 컬러 (전기/옐로) ── */}
        <div style={{padding:"28px 20px 20px",borderBottom:"1px solid "+T.accentBd,marginBottom:"16px",position:"relative",overflow:"hidden"}}>

          {/* 펠리카 배경 — 옐로 글로우 */}
          <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 60% 80% at 85% 50%, rgba(232,216,0,0.13) 0%, transparent 70%)",pointerEvents:"none"}}/>
          {/* 대각선 스트라이프 — 엔드필드 UI 특징 */}
          <div style={{position:"absolute",right:"20px",top:0,bottom:0,width:"120px",opacity:0.06,
            backgroundImage:"repeating-linear-gradient(-45deg,#E8D800,#E8D800 1px,transparent 1px,transparent 8px)",
            pointerEvents:"none"}}/>
          {/* 좌측 수직선 */}
          <div style={{position:"absolute",left:0,top:0,bottom:0,width:"3px",background:"linear-gradient(180deg,#E8D800,#b8a800 60%,transparent)"}}/>
          <div style={{position:"absolute",top:0,left:"3px",right:0,height:"1px",background:"linear-gradient(90deg,#E8D800,transparent)"}}/>

          <div style={{marginLeft:"10px",position:"relative",zIndex:1}}>

            {/* // OPERATOR 레이블 — 사진 UI 그대로 */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"6px",background:"rgba(0,0,0,0.5)",border:"1px solid rgba(232,216,0,0.4)",padding:"3px 10px 3px 8px",clipPath:"polygon(0 0,calc(100%-4px) 0,100% 4px,100% 100%,0 100%)"}}>
                <span style={{fontSize:"9px",color:"rgba(232,216,0,0.7)",letterSpacing:"0.18em",fontWeight:"bold"}}>{"//"} OPERATOR</span>
                <div style={{marginLeft:"6px",width:"12px",height:"12px",border:"1px solid rgba(232,216,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:"9px",color:"rgba(232,216,0,0.7)",lineHeight:1}}>+</span>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                <div style={{width:"6px",height:"6px",background:"#4ecb80",boxShadow:"0 0 8px #4ecb80",animation:"pulse 2s infinite"}}/>
                <span style={{fontSize:"9px",color:"#4ecb80",letterSpacing:"0.12em"}}>ONLINE</span>
              </div>
            </div>

            {/* 펠리카 이름 카드 + 이미지 */}
            <div style={{display:"flex",alignItems:"flex-end",gap:"14px",marginBottom:"14px"}}>

              {/* 펠리카 이미지 */}
              <div style={{flexShrink:0,position:"relative"}}>
                {/* 이미지 배경 박스 — 사진의 검정 아이콘 박스 참고 */}
                <div style={{width:"100px",height:"100px",background:"rgba(0,0,0,0.7)",border:"1px solid rgba(232,216,0,0.6)",overflow:"hidden",clipPath:"polygon(0 0,calc(100%-10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100%-10px))",boxShadow:"0 0 16px rgba(232,216,0,0.2)"}}>
                  <img src={FI[mood]||FI.idle} alt="펠리카" style={{width:"100%",height:"100%",objectFit:"cover",filter:mood==="analyzing"?"brightness(1.1) saturate(1.2)":"none"}}/>
                  {/* 전기 속성 글로우 오버레이 */}
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(232,216,0,0.08),transparent,rgba(232,216,0,0.05))"}}/>
                </div>
                {/* 상태 표시등 */}
                <div style={{position:"absolute",bottom:"-2px",right:"-2px",width:"11px",height:"11px",
                  background:mood==="analyzing"?"#E8D800":mood==="result"?"#4ecb80":"#E8D800",
                  border:"2px solid #030609",
                  boxShadow:"0 0 8px "+(mood==="analyzing"?"#E8D800":mood==="result"?"#4ecb80":"#E8D800"),
                  animation:mood==="analyzing"?"pulseYellow 0.8s infinite":"none"}}/>
              </div>

              {/* PERLICA 네임플레이트 + 말풍선 */}
              <div style={{flex:1}}>
                {/* 네임플레이트 — 사진의 흰 박스 스타일 */}
                <div style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(232,216,0,0.35)",padding:"7px 12px",clipPath:"polygon(0 0,calc(100%-8px) 0,100% 8px,100% 100%,0 100%)",marginBottom:"8px",backdropFilter:"blur(6px)"}}>
                  <div style={{fontSize:"20px",fontWeight:"bold",color:"#FFFFFF",letterSpacing:"0.1em",lineHeight:1.2,textShadow:"0 0 20px rgba(232,216,0,0.4)"}}>PERLICA</div>
                  <div style={{fontSize:"13px",color:"rgba(232,216,0,0.8)",letterSpacing:"0.08em",marginTop:"2px"}}>[ 펠리카 ]</div>
                </div>
                {/* 메시지 */}
                <div style={{background:"rgba(0,0,0,0.5)",border:"1px solid rgba(232,216,0,0.2)",padding:"8px 12px",clipPath:"polygon(0 0,calc(100%-6px) 0,100% 6px,100% 100%,0 100%)",backdropFilter:"blur(8px)"}}>
                  <div style={{fontSize:"8px",color:"rgba(232,216,0,0.5)",letterSpacing:"0.12em",marginBottom:"3px"}}>Perlica — MSG_INCOMING</div>
                  <p suppressHydrationWarning style={{margin:0,fontSize:"14px",color:"#f0ede8",lineHeight:"1.8",minHeight:"20px"}}>
                    {mounted ? msg : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* 속성 아이콘 행 */}
            <div style={{display:"flex",alignItems:"center",marginBottom:"14px"}}>
              <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                {["⚡","⚡","⚡","⚡","⚡"].map((icon,i)=>(
                  <div key={i} style={{width:"22px",height:"22px",border:"1px solid rgba(232,216,0,"+(i<3?"0.7":"0.3")+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",background:i<3?"rgba(232,216,0,0.1)":"transparent",clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)"}}>
                    <span style={{opacity:i<3?1:0.3}}>{icon}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 전체 진행률 */}
            <div style={{borderTop:"1px solid rgba(232,216,0,0.2)",paddingTop:"12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"5px"}}>
                <span style={{fontSize:"8px",color:"rgba(232,216,0,0.5)",letterSpacing:"0.15em"}}>AIC UPGRADE STATUS</span>
                <div style={{display:"flex",alignItems:"baseline",gap:"2px"}}>
                  <span style={{fontSize:"30px",fontWeight:"bold",color:pct===100?"#4ecb80":"#E8D800",textShadow:"0 0 12px rgba(232,216,0,0.6)"}}>{pct}</span>
                  <span style={{fontSize:"10px",color:"rgba(232,216,0,0.5)"}}>%</span>
                </div>
              </div>
              <div style={{height:"3px",background:"rgba(255,255,255,0.07)"}}>
                <div style={{height:"100%",width:pct+"%",background:pct===100?"#4ecb80":"linear-gradient(90deg,#b8a800,#E8D800)",transition:"width 0.6s",boxShadow:"0 0 10px rgba(232,216,0,0.8)"}}/>
              </div>
            </div>
          </div>
        </div>
        <div style={{padding:"0 24px"}}>

          {/* ── 지역 탭 ── */}
          <div style={{display:"flex",gap:"0",marginBottom:"12px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
            {Object.entries(THEME).map(([rname,th])=>(
              <button key={rname} onClick={()=>setRegion(rname)}
                style={{flex:1,padding:"11px 8px 13px",border:"none",
                  borderBottom:"2px solid "+(region===rname?th.accent:"transparent"),
                  background:"transparent",
                  color:region===rname?th.accent:th.sub,
                  fontSize:"15px",fontWeight:region===rname?"bold":"normal",
                  cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.06em",
                  transition:"all 0.25s",marginBottom:"-1px"}}>
                <div style={{fontSize:"8px",letterSpacing:"0.14em",marginBottom:"3px",color:region===rname?th.accent2:"rgba(255,255,255,0.15)"}}>{th.sub_en}</div>
                {th.icon} {rname}
              </button>
            ))}
          </div>

          {/* ── 스크린샷 업로드 ── */}
          <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault();setDragOver(false);handleFiles(e.dataTransfer.files);}}
            onClick={()=>fileRef.current.click()}
            style={{border:"1px dashed "+(dragOver?T.accent:T.accentBd),
              background:dragOver?"rgba(0,0,0,0.4)":"rgba(0,0,0,0.35)",
              padding:shots.length>0?"10px":"20px 16px",textAlign:"center",cursor:"pointer",
              marginBottom:"10px",clipPath:"polygon(0 0,calc(100%-10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100%-10px))",
              transition:"all 0.2s",backdropFilter:"blur(6px)",position:"relative"}}>
            <div style={{position:"absolute",left:0,top:0,bottom:0,width:"2px",background:dragOver?T.accent:T.accentBd}}/>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
            {shots.length===0?(
              <div>
                <div style={{fontSize:"8px",color:T.sub,letterSpacing:"0.2em",marginBottom:"8px"}}>// FACTORY SCREENSHOT INPUT</div>
                <div style={{fontSize:"22px",marginBottom:"6px"}}>📷</div>
                <div style={{fontSize:"13px",color:T.accent,letterSpacing:"0.06em",fontWeight:"bold"}}>공장 스크린샷 업로드</div>
                <div style={{fontSize:"9px",color:T.sub,marginTop:"3px"}}>배치 분석 가능 — 클릭 또는 드래그</div>
              </div>
            ):(
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center"}}>
                {shots.map((s,i)=>(
                  <div key={i} style={{position:"relative"}}>
                    <img src={s.preview} alt={s.name} style={{width:"58px",height:"58px",objectFit:"cover",border:"1px solid "+T.accent+"66",clipPath:"polygon(0 0,calc(100%-6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100%-6px))"}}/>
                    <button onClick={e=>{e.stopPropagation();setShots(prev=>prev.filter((_,j)=>j!==i));}} style={{position:"absolute",top:"-5px",right:"-5px",width:"16px",height:"16px",borderRadius:"50%",background:"#030609",border:"1px solid #ff4444",color:"#ff6666",fontSize:"9px",cursor:"pointer",padding:0}}>✕</button>
                  </div>
                ))}
                <div style={{fontSize:"9px",color:T.sub}}>+ ADD</div>
              </div>
            )}
          </div>

          {/* ── 건설 레벨 ── */}
          <div style={{display:"flex",alignItems:"center",padding:"8px 14px",marginBottom:"12px",
            background:"rgba(0,0,0,0.45)",borderLeft:"2px solid "+T.accent,
            borderBottom:"1px solid "+T.accentBd,backdropFilter:"blur(6px)"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:"8px",color:T.sub,letterSpacing:"0.15em",marginBottom:"1px"}}>// CONSTRUCTION LEVEL</div>
              <div style={{fontSize:"10px",color:T.text}}>{T.label} · {T.sub_en}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
              <button onClick={()=>setLevels(p=>({...p,[region]:Math.max(0,p[region]-1)}))} style={{width:"24px",height:"24px",border:"1px solid "+T.accentBd,background:"transparent",color:T.accent,fontSize:"16px",cursor:"pointer",lineHeight:1}}>−</button>
              <span style={{fontSize:"32px",fontWeight:"bold",color:T.accent,width:"46px",textAlign:"center",textShadow:"0 0 12px "+T.accentGlow}}>{levels[region]}</span>
              <button onClick={()=>setLevels(p=>({...p,[region]:p[region]+1}))} style={{width:"24px",height:"24px",border:"1px solid "+T.accentBd,background:"transparent",color:T.accent,fontSize:"16px",cursor:"pointer",lineHeight:1}}>+</button>
            </div>
          </div>

          {/* ── 업그레이드 블록 ── */}
          {Object.entries(rdata.cores).map(([name,items])=><Block key={name} title={name} items={items} isCore={true}/>)}
          {Object.entries(rdata.outposts).map(([name,items])=><Block key={name} title={name} items={items} isCore={false}/>)}

          {/* ── 일괄 버튼 ── */}
          <div style={{display:"flex",gap:"6px",marginBottom:"12px"}}>
            {[
              [()=>{const ids=allIds(rdata);const ac=ids.every(u=>checks[u.id]);const next={...checks};ids.forEach(u=>{next[u.id]=!ac;});setChecks(next);const ad=Object.values(next).every(Boolean);setMood(ad?"done":ac?"idle":"checking");setMsg(rnd(ad?MSGS.done:ac?MSGS.idle:MSGS.checking));}, allIds(rdata).every(u=>checks[u.id])?"[ REGION RESET ]":"[ REGION ALL ]"],
              [()=>{const all=Object.values(REGIONS).flatMap(r=>allIds(r));const ac=all.every(u=>checks[u.id]);const next={...checks};all.forEach(u=>{next[u.id]=!ac;});setChecks(next);setMood(ac?"idle":"done");setMsg(rnd(ac?MSGS.idle:MSGS.done));}, Object.values(REGIONS).flatMap(r=>allIds(r)).every(u=>checks[u.id])?"[ ALL RESET ]":"[ ALL COMPLETE ]"],
            ].map(([fn,label],i)=>(
              <button key={i} onClick={fn} style={{flex:1,padding:"7px",border:"1px solid "+(i===0?T.accentBd:"rgba(255,255,255,0.08)"),background:"rgba(0,0,0,0.35)",color:i===0?T.sub:T.dim,fontSize:"9px",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.06em",backdropFilter:"blur(4px)"}}>{label}</button>
            ))}
          </div>

          {/* ── 분석 진행률 ── */}
          {analyzing&&(
            <div style={{marginBottom:"10px",background:"rgba(0,0,0,0.6)",borderLeft:"2px solid "+T.accent,padding:"12px 14px",clipPath:"polygon(0 0,calc(100%-10px) 0,100% 10px,100% 100%,0 100%)",backdropFilter:"blur(8px)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"8px"}}>
                <span style={{fontSize:"9px",color:T.sub,letterSpacing:"0.1em"}}>{STEPS[step]}</span>
                <div style={{display:"flex",alignItems:"baseline",gap:"2px"}}>
                  <span style={{fontSize:"22px",fontWeight:"bold",color:T.accent,textShadow:"0 0 10px "+T.accentGlow}}>{stepPct}</span>
                  <span style={{fontSize:"9px",color:T.sub}}>%</span>
                </div>
              </div>
              <div style={{height:"2px",background:"rgba(255,255,255,0.07)"}}>
                <div style={{height:"100%",width:stepPct+"%",background:"linear-gradient(90deg,"+T.accent2+","+T.accent+")",transition:"width 0.6s",boxShadow:"0 0 8px "+T.accent}}/>
              </div>
              <div style={{display:"flex",gap:"3px",marginTop:"8px"}}>
                {STEPS.slice(0,-1).map((_,i)=>(
                  <div key={i} style={{flex:1,height:"2px",background:i<step?"#4ecb80":i===step?T.accent:"rgba(255,255,255,0.07)",transition:"all 0.3s"}}/>
                ))}
              </div>
            </div>
          )}

          {/* ── 분석 버튼 ── */}
          <button onClick={doAnalyze} disabled={analyzing}
            style={{width:"100%",padding:"17px",
              border:"1px solid "+(analyzing?T.accentBd:T.accent+"99"),
              background:analyzing?"rgba(0,0,0,0.4)":"linear-gradient(135deg,"+T.accentDim+",rgba(0,0,0,0.2))",
              color:analyzing?"rgba(255,255,255,0.2)":T.accent,
              fontSize:"16px",fontWeight:"bold",cursor:analyzing?"not-allowed":"pointer",
              fontFamily:"monospace",letterSpacing:"0.18em",
              clipPath:CP16,
              boxShadow:analyzing?"none":"0 0 24px "+T.accentDim,
              backdropFilter:"blur(8px)",
              transition:"all 0.25s",position:"relative",overflow:"hidden"}}>
            {!analyzing&&<div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,"+T.accentDim+",transparent)",animation:"shimmer 3s infinite"}}/>}
            {analyzing?"[ ANALYZING... ]":"[ Perlica ANALYZE ]"}
          </button>

          {/* ── 에러 ── */}
          {error&&(
            <div style={{marginTop:"10px",padding:"10px 14px",background:"rgba(0,0,0,0.7)",borderLeft:"2px solid #ff4444",fontSize:"10px",color:"#ff6666",fontFamily:"monospace"}}>
              !! ERROR — {error}
            </div>
          )}

          {/* ── 결과 ── */}
          {result&&(
            <div style={{marginTop:"14px",background:"rgba(0,0,0,0.65)",border:"1px solid "+T.accentBd,clipPath:CP16,position:"relative",overflow:"hidden",backdropFilter:"blur(12px)"}}>
              <div style={{position:"absolute",left:0,top:0,bottom:0,width:"3px",background:"linear-gradient(180deg,"+T.accent+","+T.accent2+",transparent)"}}/>
              <div style={{position:"absolute",top:0,left:"3px",right:0,height:"1px",background:"linear-gradient(90deg,"+T.accent+",transparent)"}}/>
              <div style={{padding:"10px 14px 8px 16px",borderBottom:"1px solid "+T.accentBd,display:"flex",alignItems:"center",gap:"10px"}}>
                <img src={FI.analyzing} alt="펠리카" style={{width:"24px",height:"24px",objectFit:"cover",border:"1px solid "+T.accent+"66",clipPath:"polygon(0 0,calc(100%-4px) 0,100% 4px,100% 100%,4px 100%,0 calc(100%-4px))"}}/>
                <div>
                  <div style={{fontSize:"8px",color:T.sub,letterSpacing:"0.12em"}}>// ANALYSIS REPORT</div>
                  <div style={{fontSize:"10px",color:T.accent,letterSpacing:"0.06em"}}>Perlica — AIC OPTIMIZER</div>
                </div>
                <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"8px"}}>
                  {usedGuides&&(
                    <span style={{fontSize:"8px",padding:"2px 7px",background:"rgba(30,200,160,0.15)",border:"1px solid rgba(30,200,160,0.4)",color:"#1ec8a0",letterSpacing:"0.06em"}}>✦ 공략 DB</span>
                  )}
                  {usedSearch&&(
                    <span style={{fontSize:"8px",padding:"2px 7px",background:"rgba(100,180,255,0.15)",border:"1px solid rgba(100,180,255,0.4)",color:"#64b4ff",letterSpacing:"0.06em"}}>🔍 웹 검색</span>
                  )}
                  <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                    <div style={{width:"5px",height:"5px",background:"#4ecb80",boxShadow:"0 0 5px #4ecb80"}}/>
                    <span style={{fontSize:"8px",color:"#4ecb80",letterSpacing:"0.1em"}}>COMPLETE</span>
                  </div>
                </div>
              </div>
              <div style={{padding:"14px 16px"}}>
                <p style={{margin:0,fontSize:"12px",color:"#dde8e4",lineHeight:"2",whiteSpace:"pre-wrap",fontFamily:"monospace"}}>{result}</p>
              </div>
            </div>
          )}

          {/* ── 참고 공략 이미지 ── */}
          {guideImages.length > 0 && (
            <div style={{marginTop:"12px",background:"rgba(0,0,0,0.5)",border:"1px solid "+T.accentBd,clipPath:CP16,overflow:"hidden",backdropFilter:"blur(8px)"}}>
              <div style={{padding:"8px 14px",borderBottom:"1px solid "+T.accentBd}}>
                <span style={{fontSize:"8px",color:T.accent,letterSpacing:"0.12em"}}>// 참고 공략 이미지</span>
              </div>
              <div style={{padding:"10px 14px",display:"flex",gap:"10px",flexWrap:"wrap"}}>
                {guideImages.map((g,i)=>(
                  <div key={i} style={{flex:"1 1 140px"}}>
                    <img src={g.image_url} alt={g.title}
                      style={{width:"100%",height:"120px",objectFit:"cover",border:"1px solid "+T.accentBd,display:"block"}}/>
                    <div style={{fontSize:"9px",color:T.sub,marginTop:"4px",letterSpacing:"0.04em"}}>{g.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 푸터 ── */}
          <div style={{marginTop:"24px",borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:"12px"}}>
            <Link href="/guides" style={{display:"block",width:"100%",padding:"10px",border:"1px solid rgba(30,200,160,0.25)",background:"rgba(30,200,160,0.05)",color:"#1ec8a0",fontSize:"10px",textAlign:"center",textDecoration:"none",fontFamily:"monospace",letterSpacing:"0.1em",marginBottom:"12px",clipPath:"polygon(0 0,calc(100%-8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100%-8px))"}}>
              📋 커뮤니티 공략 DB 보기 / 공략 제출하기 →
            </Link>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:"8px",color:"rgba(255,255,255,0.15)",letterSpacing:"0.12em"}}>ENDFIELD INDUSTRIES</span>
              <span style={{fontSize:"8px",color:"rgba(255,255,255,0.15)",letterSpacing:"0.12em"}}>AIC OPTIMIZER v1.0</span>
              <span style={{fontSize:"8px",color:"rgba(255,255,255,0.15)",letterSpacing:"0.12em"}}>TALOS-II</span>
            </div>
          </div>
      </div>

      {/* ── 펠리카 챗봇 (fixed 오버레이) ── */}
      <div>
          {/* 챗봇 토글 버튼 (항상 우하단 고정) */}
          {!chatOpen && (
            <button onClick={()=>setChatOpen(true)}
              style={{position:"fixed",right:"16px",bottom:"24px",width:"56px",height:"56px",borderRadius:"50%",background:`linear-gradient(135deg,${chatAccent},${chatAccentDark})`,border:"none",cursor:"pointer",boxShadow:`0 0 20px rgba(${chatAccentRgb},0.5)`,display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
              <img src={chatCharData.images.idle} alt={chatCharData.name} style={{width:"40px",height:"40px",objectFit:"cover",borderRadius:"50%"}}/>
            </button>
          )}

          {/* 챗봇 패널 */}
          {chatOpen && (
            <div style={{position:"fixed",right:"16px",bottom:"16px",width:"340px",height:"560px",background:"rgba(3,8,15,0.96)",border:`1px solid rgba(${chatAccentRgb},0.4)`,clipPath:"polygon(0 0,calc(100%-12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100%-12px))",display:"flex",flexDirection:"column",zIndex:100,boxShadow:`0 0 30px rgba(${chatAccentRgb},0.15)`,backdropFilter:"blur(12px)",overflow:"hidden"}}>
              {/* 펠리카 일러스트 배경 */}
              <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none"}}>
                <img src={chatCharData.images.illustration} alt=""
                  style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",height:"80%",width:"auto",objectFit:"contain",objectPosition:"bottom center",opacity:0.15,filter:"saturate(0.8)"}}/>
              </div>

              {/* 챗봇 헤더 */}
              <div style={{padding:"10px 14px",borderBottom:`1px solid rgba(${chatAccentRgb},0.2)`,display:"flex",alignItems:"center",gap:"10px",background:`rgba(${chatAccentRgb},0.05)`,flexShrink:0,position:"relative",zIndex:1}}>
                <div style={{width:"32px",height:"32px",overflow:"hidden",clipPath:"polygon(0 0,calc(100%-6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100%-6px))",border:`1px solid rgba(${chatAccentRgb},0.6)`,flexShrink:0}}>
                  <img src={chatCharData.images.idle} alt={chatCharData.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                </div>
                <div style={{flex:1}}>
                  <select value={chatChar} onChange={e=>setChatChar(e.target.value)}
                    style={{background:"transparent",border:"none",color:chatAccent,fontSize:"11px",fontWeight:"bold",letterSpacing:"0.06em",fontFamily:"monospace",cursor:"pointer",outline:"none",padding:0}}>
                    {Object.values(CHARACTERS).map(c=>(
                      <option key={c.id} value={c.id} style={{background:"#0a0f17",color:c.accent}}>{c.nameEn}</option>
                    ))}
                  </select>
                  <div style={{fontSize:"8px",color:`rgba(${chatAccentRgb},0.5)`,letterSpacing:"0.1em"}}>{chatLoading?"SEARCHING & THINKING...":"ONLINE ✦"}</div>
                </div>
                <button onClick={()=>setChatOpen(false)}
                  style={{background:"transparent",border:"none",color:`rgba(${chatAccentRgb},0.5)`,cursor:"pointer",fontSize:"16px",padding:"0",lineHeight:1}}>✕</button>
              </div>

              {/* 메시지 목록 */}
              <div style={{flex:1,overflowY:"auto",padding:"10px 12px",display:"flex",flexDirection:"column",gap:"8px",position:"relative",zIndex:1}}>
                {chatMessages.map((msg,i)=>(
                  <div key={i} style={{display:"flex",flexDirection:"column",alignItems:msg.role==="user"?"flex-end":"flex-start"}}>
                    {msg.role==="assistant" && (
                      <div style={{display:"flex",alignItems:"flex-end",gap:"6px",maxWidth:"85%"}}>
                        <img src={chatLoading&&i===chatMessages.length-1?chatCharData.images.analyzing:chatCharData.images.idle} alt={chatCharData.name}
                          style={{width:"22px",height:"22px",objectFit:"cover",flexShrink:0,border:`1px solid rgba(${chatAccentRgb},0.4)`,clipPath:"polygon(0 0,calc(100%-3px) 0,100% 3px,100% 100%,3px 100%,0 calc(100%-3px))"}}/>
                        <div style={{background:`rgba(${chatAccentRgb},0.08)`,border:`1px solid rgba(${chatAccentRgb},0.2)`,padding:"8px 10px",fontSize:"11px",color:"#f0ede8",lineHeight:"1.7",clipPath:"polygon(0 0,calc(100%-6px) 0,100% 6px,100% 100%,0 100%)"}}>
                          {msg.content}
                          <div style={{display:"flex",gap:"6px",marginTop:"4px",flexWrap:"wrap"}}>
                            {msg.usedGuides && <span style={{fontSize:"8px",color:"rgba(30,200,160,0.7)"}}>✦ 공략 DB</span>}
                            {msg.usedSearch && <span style={{fontSize:"8px",color:"rgba(100,180,255,0.8)"}}>🔍 웹 검색</span>}
                          </div>
                        </div>
                      </div>
                    )}
                    {msg.role==="user" && (
                      <div style={{background:`rgba(${chatAccentRgb},0.12)`,border:`1px solid rgba(${chatAccentRgb},0.3)`,padding:"8px 10px",fontSize:"11px",color:chatAccent,lineHeight:"1.7",maxWidth:"85%",clipPath:"polygon(6px 0,100% 0,100% calc(100%-6px),calc(100%-6px) 100%,0 100%,0 6px)"}}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                    <img src={chatCharData.images.analyzing} alt={chatCharData.name}
                      style={{width:"22px",height:"22px",objectFit:"cover",border:`1px solid rgba(${chatAccentRgb},0.4)`,clipPath:"polygon(0 0,calc(100%-3px) 0,100% 3px,100% 100%,3px 100%,0 calc(100%-3px))"}}/>
                    <div style={{background:`rgba(${chatAccentRgb},0.08)`,border:`1px solid rgba(${chatAccentRgb},0.2)`,padding:"8px 12px",clipPath:"polygon(0 0,calc(100%-6px) 0,100% 6px,100% 100%,0 100%)"}}>
                      <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
                        {[0,1,2].map(i=><div key={i} style={{width:"5px",height:"5px",background:chatAccent,borderRadius:"50%",animation:`chatDot 1.2s ${i*0.2}s infinite`}}/>)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef}/>
              </div>

              {/* 입력창 */}
              <div style={{padding:"10px 12px",borderTop:`1px solid rgba(${chatAccentRgb},0.2)`,display:"flex",gap:"6px",flexShrink:0,position:"relative",zIndex:1,background:"rgba(3,8,15,0.8)"}}>
                <input
                  value={chatInput}
                  onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendChat(); } }}
                  placeholder={chatCharData.placeholder}
                  style={{flex:1,background:`rgba(${chatAccentRgb},0.06)`,border:`1px solid rgba(${chatAccentRgb},0.25)`,color:"#f0ede8",fontSize:"11px",padding:"8px 10px",fontFamily:"monospace",outline:"none"}}
                />
                <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()}
                  style={{padding:"8px 12px",background:chatLoading||!chatInput.trim()?"transparent":`rgba(${chatAccentRgb},0.15)`,border:`1px solid rgba(${chatAccentRgb},${chatLoading||!chatInput.trim()?"0.15":"0.5"})`,color:chatLoading||!chatInput.trim()?`rgba(${chatAccentRgb},0.3)`:chatAccent,cursor:chatLoading||!chatInput.trim()?"not-allowed":"pointer",fontSize:"12px",fontFamily:"monospace"}}>
                  ↑
                </button>
              </div>
            </div>
          )}
      </div>
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes chatDot{0%,100%{opacity:0.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}
        @keyframes pulseYellow{0%,100%{opacity:1;box-shadow:0 0 8px #E8D800}50%{opacity:0.4;box-shadow:0 0 16px #E8D800}}
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
        *{box-sizing:border-box}
        body{background:#030609;margin:0}
        button:hover:not(:disabled){filter:brightness(1.25)}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:#030609}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15)}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
      `}</style>
    </div>
  );
}
