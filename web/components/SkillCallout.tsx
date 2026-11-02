import { REPO_URL, SECURITY_SKILL_URL } from "@/lib/site";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

/** 홈 하단: 저장소를 fork하면 직접 쓸 수 있다는 안내 */
export function SkillCallout() {
  return (
    <section
      aria-labelledby="try-heading"
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
    >
      <div className="flex max-w-2xl flex-col gap-2">
        <h2 id="try-heading" className="text-sm font-semibold tracking-tight">
          직접 써 보기
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          이 사이트는 공개 저장소 하나로 돌아갑니다. fork하면 Claude Code 루틴으로 나만의 아침 브리핑을 받을 수 있고, 함께
          들어 있는 <code className="font-mono text-[13px] text-foreground">security-check</code> 스킬로 보안 리포트를 내
          컴퓨터의 프로젝트에 대 볼 수 있습니다. lockfile에 실제로 설치된 버전을 기준으로 즉시 조치할 것과 업데이트 명령을
          알려 줍니다.
        </p>
      </div>
      <div className="flex shrink-0 gap-2 text-sm">
        <a
          href={`${REPO_URL}#readme`}
          {...external}
          className="rounded-lg bg-foreground px-3.5 py-2 font-medium text-background transition-opacity hover:opacity-85"
        >
          GitHub에서 보기
        </a>
        <a
          href={SECURITY_SKILL_URL}
          {...external}
          className="rounded-lg border border-line px-3.5 py-2 text-muted transition-colors hover:border-subtle hover:text-foreground"
        >
          스킬 설명
        </a>
      </div>
    </section>
  );
}

/** 보안 리포트 목록 위: 내 프로젝트에 대 보는 방법 한 줄 */
export function SecuritySkillNote() {
  return (
    <p className="rounded-lg border border-line px-4 py-3 text-sm leading-relaxed text-muted">
      이 리포트를 내 프로젝트에 대 보고 싶다면, 저장소를 clone해 Claude Code에서 &ldquo;보안 점검해 줘&rdquo;라고
      해 보세요. 설치된 버전 기준으로 영향 여부를 알려 주는{" "}
      <a
        href={SECURITY_SKILL_URL}
        {...external}
        className="whitespace-nowrap text-foreground underline underline-offset-4 hover:text-muted"
      >
        security-check 스킬
      </a>
      이 들어 있습니다.
    </p>
  );
}
