/** 보안 리포트 우선순위(P1·P2·P3) 배지. 표 칸과 항목 소제목의 `[P1]`을 이 배지로 보여 준다. */
export const PRIORITIES = ["P1", "P2", "P3"] as const;
export type Priority = (typeof PRIORITIES)[number];

export function isPriority(value: string): value is Priority {
  return (PRIORITIES as readonly string[]).includes(value);
}

const CLASSES: Record<Priority, string> = {
  P1: "text-red-700 bg-red-50 ring-red-600/20 dark:text-red-300 dark:bg-red-500/10 dark:ring-red-400/30",
  P2: "text-orange-800 bg-orange-50 ring-orange-600/20 dark:text-orange-300 dark:bg-orange-500/10 dark:ring-orange-400/30",
  P3: "text-zinc-600 bg-zinc-100 ring-zinc-500/20 dark:text-zinc-300 dark:bg-zinc-500/10 dark:ring-zinc-400/30",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-px align-[0.1em] font-mono text-[0.75em] font-semibold ring-1 ring-inset ${CLASSES[priority]}`}
    >
      {priority}
    </span>
  );
}
