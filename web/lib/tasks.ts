export type TaskInfo = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
};

/** 알려진 작업. 배열 순서가 화면 표시 순서다(보안 → AI → S&P500, 실행 순서와 같음). `scheduler/` 작업 파일과 같은 ID를 쓴다. */
export const TASKS: readonly TaskInfo[] = [
  {
    id: "security-daily-report",
    title: "IT 보안 이슈 데일리 리포트",
    shortTitle: "IT 보안",
    description:
      "클라우드(AWS), AI 개발 도구·MCP, 런타임·프레임워크, 데이터베이스, 공급망·CI/CD 분야별로 보안 권고와 CVE, 실제 악용 여부를 매일 정리합니다."
  },
  {
    id: "ai-dev-briefing",
    title: "AI·개발 도구 브리핑",
    shortTitle: "AI·개발 도구",
    description:
      "OpenAI, Google Gemini, Anthropic Claude, MCP 생태계와 AI 개발 도구의 새 소식을 공식 자료 중심으로 매일 정리합니다."
  },
  {
    id: "sp500-morning-check",
    title: "S&P500 실적·금리 아침 점검",
    shortTitle: "S&P500",
    description:
      "S&P500 종가와 주요 기업 실적, Fed 금리 전망, 미국 국채 금리, 원/달러 환율 등 미국 증시 흐름을 매일 아침 점검합니다."
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
