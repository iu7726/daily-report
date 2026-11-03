import type { Options as RemarkGfmOptions } from "remark-gfm";

/**
 * 보고서 본문과 목차가 같이 쓰는 remark-gfm 설정.
 * 시간·날짜 범위의 물결표(`02:27~13:35`)가 한 줄에 두 번 나오면 그 사이가 취소선이 되므로,
 * 물결표 하나로는 취소선을 만들지 않는다. 표준 문법인 `~~두 개~~`는 그대로 쓸 수 있다.
 */
export const REMARK_GFM_OPTIONS: RemarkGfmOptions = { singleTilde: false };
