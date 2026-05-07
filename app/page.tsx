import Dashboard from "./Dashboard";

// 매 요청마다 SSR. 빌드 시점에 박힌 stale HTML이 Vercel edge cache에 머무는 걸 방지.
// 라우트 세그먼트 설정은 서버 컴포넌트에서만 안정적으로 적용되므로, page는 서버 컴포넌트로 두고
// 본 화면(클라 훅 사용)은 Dashboard에서 분리한다.
export const dynamic = "force-dynamic";

export default function Page() {
  return <Dashboard />;
}
