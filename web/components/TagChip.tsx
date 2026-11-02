import Link from "next/link";

type Props = {
  slug: string;
  name: string;
  count?: number;
  /** 보고서 1건짜리처럼 덜 중요한 태그는 흐리게 */
  dim?: boolean;
};

export function TagChip({ slug, name, count, dim = false }: Props) {
  return (
    <Link
      href={`/tags/${slug}`}
      className={`inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-0.5 font-mono text-[11px] transition-colors hover:border-subtle hover:text-foreground ${
        dim ? "text-subtle" : "text-muted"
      }`}
    >
      {name}
      {count !== undefined && <span className="text-subtle">{count}</span>}
    </Link>
  );
}
