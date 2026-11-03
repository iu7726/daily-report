import type { Root } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { REMARK_GFM_OPTIONS } from "./markdown";

/** 목차 항목. 본문의 h1은 화면에서 h2로 낮추므로(Markdown.tsx) depth는 2 또는 3이다. */
export type TocHeading = { id: string; text: string; depth: 2 | 3 };

/** 글자·숫자·밑줄·공백·하이픈만 남긴다(GitHub 소제목 앵커와 같은 방식). */
const NOT_SLUG_CHAR_RE = /[^\p{L}\p{M}\p{N}\p{Pc} -]/gu;

export function slugifyHeading(text: string): string {
  return text.trim().toLowerCase().replace(NOT_SLUG_CHAR_RE, "").replace(/ /g, "-");
}

const HAS_WORD_RE = /[\p{L}\p{N}]/u;

/** 같은 slug가 또 나오면 `-1`, `-2`를 붙인다. 글자·숫자가 하나도 안 남으면 `section-N`. */
function createSlugger() {
  const seen = new Map<string, number>();
  return (text: string, index: number): string => {
    const slugged = slugifyHeading(text);
    const base = HAS_WORD_RE.test(slugged) ? slugged : `section-${index}`;
    let slug = base;
    while (seen.has(slug)) {
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      slug = `${base}-${count}`;
    }
    seen.set(slug, 0);
    return slug;
  };
}

/**
 * 모든 소제목에 id를 붙이고 목차 항목(h1·h2·h3)을 돌려준다.
 * 본문 렌더링(remarkHeadingIds)과 목차(getHeadings)가 이 함수 하나를 써서 id가 어긋나지 않는다.
 */
function assignHeadingIds(tree: Root): TocHeading[] {
  const slug = createSlugger();
  const headings: TocHeading[] = [];
  let index = 0;
  visit(tree, "heading", (node) => {
    index += 1;
    const text = toString(node).replace(/\s+/g, " ").trim();
    const id = slug(text, index);
    node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } };
    if (text && node.depth <= 3) headings.push({ id, text, depth: node.depth === 3 ? 3 : 2 });
  });
  return headings;
}

/** react-markdown에 넣는 remark 플러그인. 소제목에 id 속성을 붙인다. */
export function remarkHeadingIds() {
  return (tree: Root) => {
    assignHeadingIds(tree);
  };
}

/** 보고서 본문에서 목차 항목을 뽑는다. Markdown.tsx와 같은 파서 설정(remark-gfm)을 쓴다. */
export function getHeadings(markdown: string): TocHeading[] {
  return assignHeadingIds(unified().use(remarkParse).use(remarkGfm, REMARK_GFM_OPTIONS).parse(markdown));
}
