import type { Heading, Root, RootContent } from "mdast";
import { toString } from "mdast-util-to-string";

/**
 * 사이트가 접어서 보여 주는 절. 보고서 마지막의 조사 기록이다.
 * 조사 범위, 이상 없음으로 확인한 대상, 새 소식이 없던 출처처럼 확인 기록만 담는다(scheduler/CLAUDE.md '보고 형식').
 */
export const FOLDED_SECTIONS: readonly string[] = ["조사 기록"];

const NUMBER_PREFIX_RE = /^\d+\.\s*/;

const isSectionBoundary = (node: RootContent): boolean => node.type === "heading" && node.depth <= 2;

function isFoldHeading(node: RootContent): node is Heading {
  if (!isSectionBoundary(node)) return false;
  const title = toString(node).replace(/\s+/g, " ").trim().replace(NUMBER_PREFIX_RE, "");
  return FOLDED_SECTIONS.includes(title);
}

/**
 * 최상위 `## 조사 기록` 소제목부터 다음 h1·h2 전까지를 `<details>`로 묶고, 소제목은 `<summary>`로 바꾼다.
 * 원시 HTML 없이 mdast 노드의 `data.hName`으로 요소를 만든다(보고서 사이트 기획서 D4).
 * 소제목의 id를 `<details>`로 옮겨 목차 링크와 현재 절 표시가 그대로 맞는다. remarkHeadingIds 다음에 써야 한다.
 */
export function remarkFoldSections() {
  return (tree: Root) => {
    const children = tree.children;
    const out: RootContent[] = [];
    let i = 0;
    while (i < children.length) {
      const node = children[i];
      if (!isFoldHeading(node)) {
        out.push(node);
        i += 1;
        continue;
      }
      let end = i + 1;
      while (end < children.length && !isSectionBoundary(children[end])) end += 1;
      const summary = { type: "paragraph", data: { hName: "summary" }, children: node.children };
      const details = {
        type: "foldSection",
        data: { hName: "details", hProperties: { id: node.data?.hProperties?.id, className: ["report-fold"] } },
        children: [summary, ...children.slice(i + 1, end)],
      };
      // mdast에 없는 노드라 mdast-util-to-hast가 div로 만든 뒤 data.hName으로 details로 바꾼다.
      out.push(details as unknown as RootContent);
      i = end;
    }
    tree.children = out;
  };
}
