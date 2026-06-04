// Vercel Cron Job — 매일 새벽 3시에 자동 크롤링
export async function GET(req) {
  // Vercel cron 인증 확인
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(
      new URL("/api/crawl", req.url).toString(),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CRAWL_SECRET}`,
        },
      }
    );
    const data = await res.json();
    console.log("자동 크롤링 완료:", data.message);
    return Response.json({ ok: true, ...data });
  } catch (e) {
    console.error("자동 크롤링 실패:", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
