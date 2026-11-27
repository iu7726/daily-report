import Link from "next/link";
import { slugifyTag } from "@/lib/tags";

/*
 * 기간 안에 자주 나온 태그의 가로 막대. 단일 계열이라 색은 파란색 하나이고, 막대 끝에 건수를 적는다.
 * 막대 길이는 가장 많이 나온 태그를 100%로 잡는다.
 */
export function TagBars({ tags }: { tags: { name: string; count: number }[] }) {
  const top = Math.max(1, ...tags.map((tag) => tag.count));
  return (
    <ul className="flex flex-col gap-1.5">
      {tags.map((tag) => {
        const slug = slugifyTag(tag.name);
        return (
          <li key={tag.name} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-center gap-3 text-sm">
            {slug ? (
              <Link href={`/tags/${slug}`} className="truncate text-muted transition-colors hover:text-foreground">
                {tag.name}
              </Link>
            ) : (
              <span className="truncate text-muted">{tag.name}</span>
            )}
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 rounded-r-[4px] bg-[var(--chart-series)]"
                style={{ width: `${Math.max(4, (tag.count / top) * 100)}%` }}
              />
              <span className="shrink-0 text-xs tabular-nums text-muted">{tag.count}편</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
