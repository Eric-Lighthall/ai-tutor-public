// ai message bubble - left-aligned with avatar and markdown content
import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";
import { mdComponents } from "../mdComponents.jsx";
import AiIcon from "../../../assets/icons/ai.svg";

const LOADING_DELAYS = [0, 0.15, 0.3];

const LoadingDots = () => (
  <div className="flex items-center gap-2 py-1">
    {LOADING_DELAYS.map((delay) => (
      <span
        key={delay}
        style={{ animationDelay: `${delay}s` }}
        className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"
      />
    ))}
  </div>
);

const AiMessage = memo(({ text, isStreaming }) => {
  return (
    <div className="mb-4 animate-fade-in-short">
      <div
        className={clsx(
          "text-sm flex gap-2 w-full text-neutral-200",
          isStreaming && text === "" ? "items-center" : "items-start"
        )}
      >
        <img src={AiIcon} alt="AI" className="w-6 h-6 flex-shrink-0" />
        <div className="w-full">
          {isStreaming && text === "" ? (
            <LoadingDots />
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={mdComponents}
            >
              {text}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
});

export default AiMessage;
