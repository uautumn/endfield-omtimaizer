import "./globals.css";
import IntroLoader from "./components/IntroLoader";

export const metadata = {
  title: "펠리카의 AIC 최적화 도구",
  description: "명일방주: 엔드필드 공장 분석 & 최적화",
};

// 같은 탭에서 이미 인트로를 봤다면 첫 화면이 그려지기 전에 표시해 둠
// (이게 없으면 새로고침할 때마다 로딩 화면이 잠깐 번쩍임)
const introSeenScript = `try{if(sessionStorage.getItem("aic-intro-seen")==="1")document.documentElement.setAttribute("data-intro-seen","")}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introSeenScript }} />
      </head>
      <body suppressHydrationWarning>
        <IntroLoader />
        {children}
      </body>
    </html>
  );
}
