export const LEVELS = ["urgent", "notice", "normal"] as const;

export type Level = (typeof LEVELS)[number];

export const LEVEL_META: Record<
  Level,
  { label: string; dotClass: string; badgeClass: string; ogColor: string }
> = {
  urgent: {
    label: "긴급",
    dotClass: "bg-red-500",
    badgeClass:
      "text-red-700 bg-red-50 ring-red-600/20 dark:text-red-300 dark:bg-red-500/10 dark:ring-red-400/30",
    ogColor: "#ef4444",
  },
  notice: {
    label: "주의",
    dotClass: "bg-amber-500",
    badgeClass:
      "text-amber-800 bg-amber-50 ring-amber-600/20 dark:text-amber-300 dark:bg-amber-500/10 dark:ring-amber-400/30",
    ogColor: "#f59e0b",
  },
  normal: {
    label: "보통",
    dotClass: "bg-zinc-400 dark:bg-zinc-500",
    badgeClass:
      "text-zinc-600 bg-zinc-100 ring-zinc-500/20 dark:text-zinc-300 dark:bg-zinc-500/10 dark:ring-zinc-400/30",
    ogColor: "#a1a1aa",
  },
};

export function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}
