// floating "ask the ai" chat panel - slides in from the right on any step
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { InlineCode, CodeBlock } from '../problem-view/CodeHighlighting';
import { sendChatMessage } from './chatService';
import ChatHeader from './ChatHeader';

const PROMPT_SUGGESTIONS = [
  "How do I declare a hashmap?",
  "Give me 1 suggestion about how to improve my code.",
  "Help me with a concept I don't understand."
];

const mdChatComponents = {
  pre: CodeBlock,
  code: InlineCode,
  p: ({ children, ...props }) => (
    <p {...props} className="leading-normal my-1 first:mt-0 last:mb-0 whitespace-pre-wrap">
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => <ul {...props} className="list-disc list-inside ml-4 my-2">{children}</ul>,
  ol: ({ children, ...props }) => <ol {...props} className="list-decimal list-inside ml-4 my-2">{children}</ol>,
  li: ({ children, ...props }) => <li {...props} className="leading-normal my-0.5">{children}</li>
};

const EmptyState = ({ onPromptClick }) => (
  <>
    <div className="text-sm text-left py-8 px-4 space-y-3 text-neutral-400">
      <p className="text-lg font-semibold mb-3 text-white">
        Support where you need it
      </p>
      <p className="mb-2">
        Your personal AI Learning Assistant is ready to help with your coding
        questions.
      </p>
      <p>Ask about concepts, get unstuck, or explore new ideas!</p>
    </div>
    <PromptSuggestions onPromptClick={onPromptClick} />
  </>
);

const PromptSuggestions = ({ onPromptClick }) => (
  <div className="px-6 pb-4 flex-shrink-0">
    <p className="text-sm mb-2 text-neutral-400">
      Get started with a prompt:
    </p>
    <div className="flex flex-col items-start space-y-2">
      {PROMPT_SUGGESTIONS.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onPromptClick(prompt)}
          className="text-left px-2 py-1 border text-xs cursor-pointer border-blue-500 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
        >
          {prompt}
        </button>
      ))}
    </div>
  </div>
);

const ChatMessage = ({ message }) => (
  <div className={`flex my-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div
      className={`max-w-[85%] p-3 rounded-lg ${
        message.role === 'user'
          ? 'bg-blue-500 text-white'
          : 'bg-neutral-700 text-neutral-100'
      } ${message.isError ? 'border-red-500 border' : ''}`}
    >
      <ReactMarkdown components={mdChatComponents} remarkPlugins={[remarkGfm]}>
        {message.content}
      </ReactMarkdown>
    </div>
  </div>
);


const ChatInput = ({ inputValue, setInputValue, onSubmit, isLoading, inputRef }) => (
  <form onSubmit={onSubmit} className="p-4 border-t flex-shrink-0 border-neutral-700">
    <div className="flex space-x-2">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={isLoading ? "AI is responding..." : "Type your message..."}
        disabled={isLoading}
        className="flex-1 p-2.5 border placeholder-neutral-500 outline-none bg-neutral-700 text-white border-neutral-600"
      />
      <button
        type="submit"
        disabled={isLoading || !inputValue.trim()}
        className="px-4 py-2.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
      >
        Send
      </button>
    </div>
  </form>
);


export default function ChatPanel({ isOpen, onClose, onClearChat: propOnClearChat }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && !isLoading && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 0);
    }
  }, [isOpen, isLoading]);

  const handleMessageUpdate = useCallback((action, messageOrId, content, isError = false, isStreaming = true) => {
    setMessages((prevMessages) => {
      if (action === 'add') return [...prevMessages, messageOrId];
      if (action === 'update') {
        return prevMessages.map((msg) =>
          msg.id === messageOrId ? { ...msg, content, isError, isStreaming } : msg
        );
      }
      if (action === 'finalize') {
        return prevMessages.map((msg) =>
          msg.id === messageOrId ? { ...msg, isStreaming: false } : msg
        );
      }
      return prevMessages;
    });
  }, []);

  const handleError = useCallback((errMessage) => {
    setError(errMessage);
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      if (lastMessage?.role === 'assistant' && lastMessage.content === '' && lastMessage.isStreaming) {
        return prevMessages.slice(0, -1);
      }
      return prevMessages.map((msg) =>
        msg.isStreaming ? { ...msg, isStreaming: false, content: 'Error connecting.', isError: true } : msg
      );
    });
  }, []);

  const handleSendMessage = useCallback(
    async (messageContent) => {
      if (!messageContent.trim()) return;

      const newUserMessage = {
        role: 'user',
        content: messageContent,
        id: `user-${Date.now()}`,
      };

      setMessages((prev) => [...prev, newUserMessage]);
      setInputValue('');
      setIsLoading(true);
      setError(null);

      try {
        await sendChatMessage(messageContent, messages, handleMessageUpdate, handleError);
      } catch (err) {
        handleError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, handleMessageUpdate, handleError]
  );

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setIsLoading(false);
    setInputValue('');
    propOnClearChat?.();
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0 && !isLoading && !error;

  return (
    <div
      className={`fixed top-0 bottom-0 right-0 shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out flex flex-col w-[450px] bg-neutral-800 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <ChatHeader onClose={onClose} onClearChat={clearChat} />

      <div ref={chatContainerRef} className="flex-1 p-4 pb-4 overflow-y-auto custom-scrollbar space-y-1">
        {isEmpty ? (
          <EmptyState onPromptClick={handleSendMessage} />
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
      </div>

      {error && (
        <div className="px-4 py-2 text-center text-red-500 text-xs">
          Error: {error}
        </div>
      )}

      <ChatInput
        inputValue={inputValue}
        setInputValue={setInputValue}
        onSubmit={handleFormSubmit}
        isLoading={isLoading}
        inputRef={inputRef}
      />
    </div>
  );
}
