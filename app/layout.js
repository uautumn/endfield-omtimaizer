import "./globals.css";

export const metadata = {
  title: "펠리카의 AIC 최적화 도구",
  description: "명일방주: 엔드필드 공장 분석 & 최적화",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
