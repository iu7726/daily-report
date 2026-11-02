export type TaskInfo = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
};

/** 알려진 작업. 배열 순서가 화면 표시 순서다. `scheduler/` 작업 파일과 같은 ID를 쓴다. */
export const TASKS: readonly TaskInfo[] = [
  {
    id: "ai-dev-briefing",
    title: "AI·개발 도구 브리핑",
    shortTitle: "AI·개발 도구",
    description:
      "OpenAI, Google Gemini, Anthropic Claude, MCP 생태계와 AI 개발 도구의 새 소식을 공식 자료 중심으로 매일 정리합니다.",
  },
  {
    id: "sp500-morning-check",
    title: "S&P500 실적·금리 아침 점검",
    shortTitle: "S&P500",
    description:
      "S&P500 종가와 주요 기업 실적, Fed 금리 전망, 미국 국채 금리, 원/달러 환율 등 미국 증시 흐름을 매일 아침 점검합니다.",
  },
  {
    id: "security-daily-report",
    title: "IT 보안 이슈 데일리 리포트",
    shortTitle: "IT 보안",
    description:
      "웹 서비스 개발 스택(런타임, 프레임워크, 데이터베이스, 클라우드, CI/CD)의 보안 권고와 CVE, 실제 악용 여부를 매일 정리합니다.",
  },
];

export function getTaskInfo(id: string): TaskInfo | undefined {
  return TASKS.find((task) => task.id === id);
}

/** 알려진 작업은 배열 순서, 모르는 작업은 그 뒤. */
export function taskOrder(id: string): number {
  const index = TASKS.findIndex((task) => task.id === id);
  return index === -1 ? TASKS.length : index;
}
