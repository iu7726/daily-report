import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <p className="font-mono text-xs text-muted">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-muted">보고서가 없는 날짜이거나 주소가 잘못됐습니다.</p>
      <Link href="/" className="text-sm underline underline-offset-4 hover:text-muted">
        홈으로
      </Link>
    </div>
  );
}
