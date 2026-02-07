import { InlineCode, CodeBlock } from "../problem-view/CodeHighlighting";

export const mdComponents = {
    code: ({ inline, className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || ''); // extract lang from "language-python" etc
        return !inline && match ? (
            <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} {...props} />
        ) : (
            <InlineCode className="text-blue-300 bg-neutral-700/70 py-0.5 px-1.5 rounded-sm text-xs">
                {children}
            </InlineCode>
        );
    },
    pre: ({ children }) => <>{children}</>,
    p: (props) => <p {...props} className="leading-relaxed my-2 text-neutral-300 text-sm" />,
    h1: (props) => <h1 {...props} className="text-lg font-semibold my-3 text-neutral-100" />,
    h2: (props) => <h2 {...props} className="text-md font-semibold my-2 text-neutral-100" />,
    h3: (props) => <h3 {...props} className="text-sm font-semibold my-2 text-neutral-100" />,
    ul: (props) => <ul {...props} className="list-disc pl-6 my-2 space-y-1 text-sm" />,
    ol: (props) => <ol {...props} className="list-decimal pl-6 my-2 space-y-1 text-sm" />,
    li: (props) => <li {...props} className="text-neutral-300" />,
};
