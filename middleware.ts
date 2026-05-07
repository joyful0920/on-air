import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 대시보드(루트)는 항상 새로 받아야 한다. Vercel/CDN/브라우저가 stale HTML을 캐시하면
// 새 빌드의 봇 카드/라이브 데이터가 사용자 첫 방문에서 반영되지 않는 문제가 생김.
// `dynamic = "force-dynamic"`만으로 안 잡히는 케이스가 있어 응답 헤더에서 명시적으로 막는다.
export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export const config = {
  matcher: ["/", "/list/:path*"],
};
