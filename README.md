# 펠리카의 AIC 최적화 도구
명일방주: 엔드필드 공장 분석 & 거점 최적화 웹앱

## 파일 구조
```
endfield-app/
├── app/
│   ├── page.js                      ← 메인 UI (펠리카 + 공장 분석)
│   ├── layout.js                    ← 레이아웃
│   ├── globals.css                  ← 전역 스타일
│   ├── admin/page.js                ← 크롤링 관리 페이지 (/admin)
│   ├── guides/page.js               ← 공략 DB 페이지 (/guides)
│   └── api/
│       ├── analyze/route.js         ← Claude API 호출 (핵심)
│       ├── guides/route.js          ← 공략 등록/조회
│       ├── search/route.js          ← 벡터 유사도 검색
│       ├── crawl/route.js           ← 위키 크롤링 실행
│       └── cron/crawl/route.js      ← 매일 새벽 3시 자동 크롤
├── lib/supabase.js                  ← Supabase 클라이언트
├── public/bg.png                    ← 배경 이미지 (엔드필드 키아트)
├── .env.local                       ← 환경변수 (키 입력 필요)
├── package.json
├── next.config.js
├── vercel.json                      ← Vercel cron 설정
└── supabase-setup.sql               ← DB 초기 설정 SQL
```

## 환경변수 (.env.local)
```
ANTHROPIC_API_KEY=     # console.anthropic.com
OPENAI_API_KEY=        # platform.openai.com (임베딩용)
NEXT_PUBLIC_SUPABASE_URL=     # supabase.com 프로젝트 URL
SUPABASE_SERVICE_ROLE_KEY=    # supabase.com service_role 키
CRAWL_SECRET=          # 직접 정한 아무 문자열
CRON_SECRET=           # 직접 정한 아무 문자열
```

## 설정 순서
1. npm install
2. Supabase SQL Editor에서 supabase-setup.sql 실행
3. .env.local 6개 키 입력
4. npm run dev → localhost:3000 확인
5. localhost:3000/admin 에서 크롤링 실행
6. GitHub 푸시 → Vercel 배포 → 환경변수 6개 추가 → Redeploy
