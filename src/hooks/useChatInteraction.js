import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_CLOUDFLARE_WORKER_BASE_URL = "https://ai-worker.ericlighthall.workers.dev";
export default function useChatInteraction({
  sessionToken,
  problemId,
  activeStepId,
  currentStepDetails,
  currentFullHistoryForStep,
  onHistoryChange,
  onCompletionChange,
  onFatalError,
  apiBaseUrl = DEFAULT_CLOUDFLARE_WORKER_BASE_URL,
}) {
  const [isProcessingMessage, setIsProcessingMessage] = useState(false);
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState(null);

  useEffect(() => {
    if (
      currentStepDetails?.contentType === "chat" &&
      currentStepDetails.content?.initialPrompt &&
      activeStepId === currentStepDetails.id &&
      (!currentFullHistoryForStep || currentFullHistoryForStep.length === 0)
    ) {
      onHistoryChange([{
        id: `initial-ai-${activeStepId}-${uuidv4()}`,
        type: "ai",
        text: currentStepDetails.content.initialPrompt,
      }]);
    }
  }, [activeStepId, currentStepDetails, currentFullHistoryForStep, onHistoryChange]);

  const buildApiHistory = (history, userInput) => [
    ...history.map((m) => ({
      role: m.type === "ai" ? "assistant" : "user",
      content: m.text,
    })),
    { role: "user", content: userInput }
  ];

  const submitChatMessage = useCallback(async (userInput) => {
    const processStreamingResponse = async (reader, aiMsgId, baseHistory, onHistoryChange, onCompletionChange) => {
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";
      let updatedHistory = baseHistory;

      const updateMessage = (text, isStreaming = true) => {
        updatedHistory = updatedHistory.map((m) =>
          m.id === aiMsgId ? { ...m, text, isStreaming } : m
        );
        onHistoryChange(updatedHistory);
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // sse chunks are delimited by double newlines
      let boundaryIndex;
        while ((boundaryIndex = buffer.indexOf("\n\n")) >= 0) {
          const chunk = buffer.slice(0, boundaryIndex);
          buffer = buffer.slice(boundaryIndex + 2);

          if (!chunk.startsWith("data:")) continue;
          const payloadStr = chunk.substring(5).trim();
          if (payloadStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payloadStr);
            if (parsed.error) throw new Error(parsed.error);
            
            if (parsed.content) {
              accumulatedText += parsed.content;
              updateMessage(accumulatedText);
            }
            
            if (parsed.status) {
              updateMessage(accumulatedText, false);
              onCompletionChange(activeStepId, parsed.status === "completed");
            }
          } catch (err) {
            if (err.message !== payloadStr) throw err;
            console.warn("Skipping malformed SSE chunk:", payloadStr);
          }
        }
      }
    };
    if (!userInput.trim() || !sessionToken || isProcessingMessage || !problemId || !activeStepId) {
      return;
    }

    onFatalError("");
    setIsProcessingMessage(true);

    const userMsg = { id: uuidv4(), type: "user", text: userInput };
    const aiMsgId = uuidv4();
    const aiPlaceholder = { id: aiMsgId, type: "ai", text: "", isStreaming: true };
    
    let newHistory = [...(currentFullHistoryForStep || []), userMsg, aiPlaceholder];
    onHistoryChange(newHistory);
    setCurrentStreamingMessageId(aiMsgId);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/tutor/interact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          session_id: sessionToken,
          problem_id: problemId,
          step_id: activeStepId,
          chat_history: buildApiHistory(currentFullHistoryForStep || [], userInput),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status} – ${response.statusText}. ${errText || ""}`.trim());
      }

      await processStreamingResponse(response.body.getReader(), aiMsgId, newHistory, onHistoryChange, onCompletionChange);
    } catch (err) {
      onFatalError(err.message);
      newHistory = newHistory.map((m) =>
        m.id === aiMsgId ? { ...m, text: `[ERROR: ${err.message}]`, isStreaming: false } : m
      );
      onHistoryChange(newHistory);
    } finally {
      setIsProcessingMessage(false);
      setCurrentStreamingMessageId(null);
    }
  }, [sessionToken, problemId, activeStepId, apiBaseUrl, currentFullHistoryForStep, isProcessingMessage, onHistoryChange, onCompletionChange, onFatalError]);

  return {
    submitChatMessage,
    isProcessingMessage,
    currentStreamingMessageId,
  };
}
