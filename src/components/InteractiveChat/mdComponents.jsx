import React from "react";
import { InlineCode, CodeBlock } from "../problem-view/CodeHighlighting";

const LIST_BASE_CLASSES = "ml-4 my-2 first:mt-0 last:mb-0";
const ELEMENT_BASE_CLASSES = "leading-normal my-2 first:mt-0 last:mb-0";

export const mdComponents = {
  code: InlineCode,
  pre: CodeBlock,
  p: ({ children, ...props }) => (
    <p
      {...props}
      className={ELEMENT_BASE_CLASSES}
    >
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul
      {...props}
      className={`list-disc list-inside ${LIST_BASE_CLASSES}`}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      {...props}
      className={`list-decimal list-inside ${LIST_BASE_CLASSES}`}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li
      {...props}
      className="leading-normal my-1 first:mt-0 last:mb-0"
    >
      {children}
    </li>
  ),
}; 