import { LEVEL_META, type Level } from "@/lib/level";

export function LevelDot({ level, className = "" }: { level: Level; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-1.5 shrink-0 rounded-full ${LEVEL_META[level].dotClass} ${className}`}
    />
  );
}

export function LevelBadge({ level }: { level: Level }) {
  const meta = LEVEL_META[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.badgeClass}`}
    >
      <LevelDot level={level} />
      {meta.label}
    </span>
  );
}
