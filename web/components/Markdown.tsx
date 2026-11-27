import type { Element, ElementContent } from "hast";
import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { isPriority, PriorityBadge } from "@/components/PriorityBadge";
import { FlowBlock, TimelineBlock, TrendBlock, type TrendContext } from "@/components/ReportBlocks";
import { isBlockLanguage, parseFlow, parseTimeline, parseTrend, type BlockLanguage } from "@/lib/blocks";
import { remarkFoldSections } from "@/lib/fold-sections";
import { remarkHeadingIds } from "@/lib/headings";
import { REMARK_GFM_OPTIONS } from "@/lib/markdown";

// 보고서 본문은 웹 자료를 바탕으로 AI가 쓴 글이다. 원시 HTML은 렌더링하지 않는다(기획서 D4, rehype-raw 미사용).
// react-markdown은 기본으로 HTML을 글자 그대로 두고, javascript: 같은 위험한 URL을 지운다.
// 그림 블록(timeline·flow·trend)도 HTML이 아니라 코드 블록의 글자를 해석해 사이트 컴포넌트로 그린다.

const isExternal = (href?: string) => !!href && /^https?:\/\//i.test(href);

/** react-markdown이 넘기는 AST 노드(node)는 DOM 속성이 아니라서 뺀다. */
function withoutNode<T extends { node?: unknown }>({ node, ...rest }: T): Omit<T, "node"> {
  void node;
  return rest;
}

/** 자식이 글자 하나뿐이면 그 글자 */
function onlyText(children: ReactNode): string | null {
  const list = Children.toArray(children);
  return list.length === 1 && typeof list[0] === "string" ? list[0].trim() : null;
}

/** 코드 블록(pre > code)의 언어와 글자 */
function codeBlock(node: Element | undefined): { language: string; text: string } | null {
  const code = node?.children.find((child): child is Element => child.type === "element" && child.tagName === "code");
  if (!code) return null;
  const classes = Array.isArray(code.properties?.className) ? code.properties.className.map(String) : [];
  const language = classes.find((name) => name.startsWith("language-"))?.slice("language-".length);
  if (!language) return null;
  const text = code.children.map((child: ElementContent) => (child.type === "text" ? child.value : "")).join("");
  return { language, text };
}

function renderBlock(language: BlockLanguage, text: string, trend?: TrendContext): ReactNode | null {
  if (language === "timeline") {
    const events = parseTimeline(text);
    return events && <TimelineBlock events={events} />;
  }
  if (language === "flow") {
    const steps = parseFlow(text);
    return steps && <FlowBlock steps={steps} />;
  }
  const keys = parseTrend(text);
  return keys && trend ? <TrendBlock keys={keys} context={trend} /> : null;
}

/** 소제목 앞의 `① [P1]`을 번호와 배지로 나눈다. */
const HEADING_PRIORITY_RE = /^([①-⑳]\s*)?\[(P[123])\]\s*/;

function withPriorityBadge(children: ReactNode): ReactNode {
  const list = Children.toArray(children);
  const first = list[0];
  if (typeof first !== "string") return children;
  const match = HEADING_PRIORITY_RE.exec(first);
  if (!match || !isPriority(match[2])) return children;
  return [
    match[1] ?? "",
    <PriorityBadge key="priority" priority={match[2]} />,
    " ",
    first.slice(match[0].length),
    ...list.slice(1).map((child, i) => (isValidElement(child) ? child : <span key={`rest-${i}`}>{child}</span>)),
  ];
}

function buildComponents(trend?: TrendContext): Components {
  return {
    // 페이지 제목(h1)은 하나만 두기 위해 본문의 h1은 h2로 낮춘다.
    h1: (props) => <h2 {...withoutNode(props)} />,
    h3: (props) => {
      const rest = withoutNode(props);
      return <h3 {...rest}>{withPriorityBadge(rest.children)}</h3>;
    },
    a: (props) => {
      const rest = withoutNode(props);
      return isExternal(rest.href) ? <a {...rest} target="_blank" rel="noopener noreferrer" /> : <a {...rest} />;
    },
    // 넓은 표는 표만 가로로 스크롤한다(C3).
    table: (props) => (
      <div className="-mx-1 my-6 overflow-x-auto px-1">
        <table {...withoutNode(props)} />
      </div>
    ),
    // 표 칸의 P1·P2·P3는 배지로 보여 준다(기획서 2026-11-27_report-visuals R2).
    td: (props) => {
      const rest = withoutNode(props);
      const text = onlyText(rest.children);
      return text && isPriority(text) ? (
        <td {...rest}>
          <PriorityBadge priority={text} />
        </td>
      ) : (
        <td {...rest} />
      );
    },
    pre: (props) => {
      const block = codeBlock(props.node);
      if (block && isBlockLanguage(block.language)) {
        const rendered = renderBlock(block.language, block.text, trend);
        if (rendered) return rendered;
      }
      return <pre {...withoutNode(props)} />;
    },
  };
}

export function Markdown({ children, trend }: { children: string; trend?: TrendContext }) {
  return (
    <div className="report-prose prose prose-zinc max-w-none [&>*:first-child]:mt-0 dark:prose-invert prose-headings:tracking-tight prose-h2:mt-12 prose-h2:text-xl prose-h3:text-base prose-a:font-normal prose-li:my-1 prose-table:my-0">
      <ReactMarkdown
        // 조사 기록 접기(remarkFoldSections)는 소제목 id가 붙은 뒤에 돌아야 한다.
        remarkPlugins={[[remarkGfm, REMARK_GFM_OPTIONS], remarkHeadingIds, remarkFoldSections]}
        components={buildComponents(trend)}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
