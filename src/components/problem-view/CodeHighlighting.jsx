// syntax-highlighted code for markdown  - inline `code` and fenced code blocks
import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { useCodeTheme } from "./hooks/useCodeTheme";
import { TYPOGRAPHY } from "./constants";

export const InlineCode = ({ children }) => {
  const { syntaxTheme, backgroundColor, borderColor, commonStyle } = useCodeTheme();

  return (
    <SyntaxHighlighter
      PreTag="span"
      language="javascript"
      style={syntaxTheme}
      customStyle={{
        background: backgroundColor,
        fontSize: TYPOGRAPHY.CODE.INLINE_SIZE,
        borderRadius: 3,
        padding: "0.1em 0.4em",
        border: `1px solid ${borderColor}`,
        ...commonStyle,
        boxShadow: "none",
      }}
      wrapLines={false}
    >
      {String(children).replace(/\n$/, "") /* strip trailing newline */}
    </SyntaxHighlighter>
  );
};

export function CodeBlock({ inline, className, children }) {
  if (inline || !className) {
    return <InlineCode>{children}</InlineCode>;
  }

  const { syntaxTheme, backgroundColor, borderColor, commonStyle } = useCodeTheme();
  const rawCode = String(children).replace(/\n$/, ""); // strip trailing newline
  const lang = className.replace("language-", "") || "text";

  return (
    <SyntaxHighlighter
      language={lang}
      style={syntaxTheme}
      customStyle={{
        background: backgroundColor,
        fontSize: TYPOGRAPHY.CODE.BLOCK_SIZE,
        padding: "1rem",
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        overflowX: "auto",
        ...commonStyle,
      }}
      PreTag="div"
      wrapLongLines
    >
      {rawCode}
    </SyntaxHighlighter>
  );
}
