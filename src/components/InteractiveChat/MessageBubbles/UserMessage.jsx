// user message bubble - right-aligned
import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { mdComponents } from "../mdComponents.jsx";

const UserMessage = memo(({ text }) => (
  <div className="flex justify-end mt-4 mb-8 ml-auto max-w-[85%] animate-fade-in-short">
    <div className="bg-neutral-700 rounded-lg py-1.5 px-3 text-white text-sm shadow">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {text}
      </ReactMarkdown>
    </div>
  </div>
));

export default UserMessage;
