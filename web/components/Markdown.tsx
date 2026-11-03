import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkHeadingIds } from "@/lib/headings";
import { REMARK_GFM_OPTIONS } from "@/lib/markdown";

// 보고서 본문은 웹 자료를 바탕으로 AI가 쓴 글이다. 원시 HTML은 렌더링하지 않는다(기획서 D4, rehype-raw 미사용).
// react-markdown은 기본으로 HTML을 글자 그대로 두고, javascript: 같은 위험한 URL을 지운다.

const isExternal = (href?: string) => !!href && /^https?:\/\//i.test(href);

/** react-markdown이 넘기는 AST 노드(node)는 DOM 속성이 아니라서 뺀다. */
function withoutNode<T extends { node?: unknown }>({ node, ...rest }: T): Omit<T, "node"> {
  void node;
  return rest;
}

const components: Components = {
  // 페이지 제목(h1)은 하나만 두기 위해 본문의 h1은 h2로 낮춘다.
  h1: (props) => <h2 {...withoutNode(props)} />,
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
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="report-prose prose prose-zinc max-w-none [&>*:first-child]:mt-0 dark:prose-invert prose-headings:tracking-tight prose-h2:mt-12 prose-h2:text-xl prose-h3:text-base prose-a:font-normal prose-li:my-1 prose-table:my-0">
      <ReactMarkdown remarkPlugins={[[remarkGfm, REMARK_GFM_OPTIONS], remarkHeadingIds]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
