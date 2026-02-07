// full-page chat interface for guided conversation steps - center panel
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { FiMessageSquare } from "react-icons/fi";
import Lottie from "lottie-react";

import clsx from "clsx";
import IntroOverlay from "../common/IntroOverlay";
import Button from "../common/Button";
import UserMessage from "./MessageBubbles/UserMessage";
import AnimatedAiMessage from "./MessageBubbles/AnimatedAiMessage";

import chatAnimation from "../../assets/chat.json";

export default function ChatInterface({
  chatHistory = [],
  onSendMessage,
  isWaitingForResponse,
  streamingMessageId,
  chatEndRef,
  error,
  onCompleteStep,
  hasNextStep,
  canGoNext,
  showIntroInitially,
  onIntroModalDismissed,
}) {
  const [input, setInput] = useState("");
  const [showIntro, setShowIntro] = useState(showIntroInitially);

  const textareaRef = useRef(null);

  const visibleChatHistory = showIntro ? [] : chatHistory;

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, []);

  const send = useCallback(() => {
    if (!input.trim() || isWaitingForResponse || showIntro) return;
    onSendMessage?.(input.trim());
    setInput("");
  }, [input, isWaitingForResponse, showIntro, onSendMessage]);

  const handleKey = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send]
  );

  const beginChat = () => {
    setShowIntro(false);
    onIntroModalDismissed?.();
    setTimeout(
      () => document.getElementById("chatInput")?.focus(),
      50
    );
  };

  useEffect(() => autoResize(), [input, autoResize]);

  useEffect(() => {
    setShowIntro(showIntroInitially);
  }, [showIntroInitially]);

  useEffect(() => {
    if (showIntro) return;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isWaitingForResponse, canGoNext, showIntro, chatEndRef]);

  return (
    <div className={clsx(
      "relative flex flex-col h-full overflow-hidden rounded-xl shadow-lg animate-fade-in",
      "border bg-neutral-800 border-neutral-700"
    )}>
      {showIntro && (
        <IntroOverlay
          title="AI Chat Assistant"
          description="Talk with the AI to make sure you understand the current concepts. Answer its questions to unlock the next step."
          buttonText="Begin Chat"
          onBegin={beginChat}
          animationElement={<Lottie animationData={chatAnimation} loop />}
          buttonClassName="bg-green-600 hover:bg-green-700 text-white"
        />
      )}

      <header className={clsx(
        "relative z-20 flex items-center gap-2 h-10 px-4 select-none rounded-t-lg",
        "border-b bg-neutral-700/30 border-neutral-700"
      )}>
        <FiMessageSquare
          size={18}
          className="flex-shrink-0 text-emerald-400"
        />
        <span className="text-sm font-medium tracking-wide text-neutral-200">
          AI Chat
        </span>
      </header>

      <section className="flex flex-col flex-1 max-w-3xl mx-auto w-full overflow-hidden">
        <div className="flex flex-col flex-1 p-6 md:p-8 overflow-hidden">
          <div className="flex-grow mb-4 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {visibleChatHistory.map((m, idx) =>
              m.type === "user" ? (
                <UserMessage key={m.id} text={m.text} />
              ) : (
                <AnimatedAiMessage
                  key={m.id}
                  id={m.id}
                  rawText={m.text}
                  animate={idx === 0 && !m.isStreaming && visibleChatHistory.length <= 1}
                  isStreaming={m.isStreaming && m.id === streamingMessageId}
                />
              )
            )}
            <div ref={chatEndRef} className="h-px" />
          </div>

          {error && (
            <div className="my-2 p-3 text-xs rounded-lg border border-red-700 text-red-300 bg-red-900/50">
              <strong>Error&nbsp;:</strong> {error}
            </div>
          )}

          <footer className="pt-4 border-t border-neutral-700">
            {canGoNext ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium text-green-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12l5 5L19.5 7"
                    />
                  </svg>
                  Congratulations - you've completed this step!
                </span>
                <Button
                  variant="success"
                  onClick={onCompleteStep}
                  className="min-w-[160px]"
                  aria-label={hasNextStep ? "Go to Next Step" : "Finish Problem"}
                >
                  {hasNextStep ? "Continue to Next Step" : "Finish Problem"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 ml-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Button>
              </div>
            ) : (
              <div className="relative pb-4">
                <div className="relative">
                  <textarea
                    id="chatInput"
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    rows={1}
                    placeholder="Send a message..."
                    disabled={showIntro}
                    className={clsx(
                      "w-full pr-12 p-2.5 min-h-[40px] max-h-32 resize-none overflow-y-auto rounded-md border-0",
                      "text-sm shadow-sm transition-shadow duration-150",
                      "focus:outline-none focus:ring-1 focus:ring-inset focus:ring-neutral-500",
                      "bg-neutral-700/60 text-neutral-200 placeholder-neutral-400"
                    )}
                    aria-label="Chat input"
                  />
                  <button
                    onClick={send}
                    disabled={
                      !input.trim() ||
                      isWaitingForResponse ||
                      showIntro
                    }
                    className="absolute right-2 w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed transition-all duration-200"
                    style={{
                      top: input.includes('\n') ? 'auto' : '50%',
                      bottom: input.includes('\n') ? '8px' : 'auto',
                      transform: input.includes('\n') ? 'none' : 'translateY(-50%)'
                    }}
                    title="Send message"
                    aria-label="Send message"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m0-15l6 6m-6-6l-6 6"
                      />
                    </svg>
                  </button>
                </div>

                {!visibleChatHistory.length && !showIntro && (
                  <p className="absolute top-full left-0 right-0 mt-1 px-1 text-center text-xs pointer-events-none text-neutral-400">
                    Answer AI questions to move on to the next step.
                  </p>
                )}
              </div>
            )}
          </footer>
        </div>
      </section>
    </div>
  );
}
