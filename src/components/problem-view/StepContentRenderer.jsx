// routes the active step's contentType to the right component (chat, code editor, test cases, static)
import React from "react";
import ChatInterface from "../InteractiveChat/ChatInterface";
import InteractiveCodeStepContent from "./step-content/InteractiveCodeStepContent.jsx";
import InteractiveTestCasesStepContent from "./step-content/InteractiveTestCasesStepContent.jsx";
import StaticContentStepContent from "./step-content/StaticContentStepContent.jsx";

const renderCenteredStatus = (message, tone = "neutral") => {
  const toneClasses =
    tone === "error"
      ? "bg-neutral-800 text-red-400"
      : "bg-neutral-800 text-neutral-400";

  return (
    <div
      className={`p-4 rounded-xl h-full flex items-center justify-center ${toneClasses}`}
    >
      {message}
    </div>
  );
};

export function StepContentRenderer({
  error,
  problemData,
  activeStepId,
  stepChatHistories,
  stepCompletionStatus,
  hasShownModalIntroForProblem,
  hasShownEditorIntroForProblem,
  submitChatMessage,
  isProcessingMessage,
  currentStreamingMessageId,
  chatEndRef,
  completeStepAndGoNext,
  handleUserDismissedChatIntroModal,
  handleUserDismissedEditorIntroModal,
  apiBaseUrl,
  sessionToken,
  userId,
  problemId,
  visibleProblemTestCases,
  hiddenTestCasesCount,
}) {
  if (error && !problemData) {
    return renderCenteredStatus(`Error: ${error}`, "error");
  }

  if (!problemData?.steps) {
    return renderCenteredStatus("Invalid problem data.");
  }

  const step = problemData.steps.find((s) => s.id === activeStepId);
  if (!step) {
    return renderCenteredStatus("Select a step.");
  }

  const currentIndex = problemData.steps.findIndex((s) => s.id === activeStepId);
  const hasNextStep = currentIndex + 1 < problemData.steps.length;
  const historyForCurrentStep = stepChatHistories[activeStepId] || [];
  const currentStepCompleted = stepCompletionStatus[activeStepId] || false;

  // "fresh" = no user messages yet (only the auto-injected initial prompt, if any)
  const isFreshChatStepContentWise =
    step.contentType === "chat" &&
    (historyForCurrentStep.length === 0 ||
      (historyForCurrentStep.length === 1 &&
        historyForCurrentStep[0].id.startsWith("initial-ai-")));
  const showChatIntroThisTime =
    isFreshChatStepContentWise && !hasShownModalIntroForProblem;

  const isFirstInteractiveCodeStepView = step.contentType === "interactiveCode";
  const showEditorIntroThisTime =
    isFirstInteractiveCodeStepView && !hasShownEditorIntroForProblem;

  switch (step.contentType) {
    case "chat":
      return (
        <ChatInterface
          key={activeStepId}
          chatHistory={historyForCurrentStep}
          onSendMessage={submitChatMessage}
          isWaitingForResponse={isProcessingMessage}
          streamingMessageId={currentStreamingMessageId}
          chatEndRef={chatEndRef}
          error={error}
          onCompleteStep={completeStepAndGoNext}
          hasNextStep={hasNextStep}
          canGoNext={currentStepCompleted}
          showIntroInitially={showChatIntroThisTime}
          onIntroModalDismissed={handleUserDismissedChatIntroModal}
        />
      );
    case "interactiveCode":
      return (
        <InteractiveCodeStepContent
          key={activeStepId}
          step={step}
          onCompleteStep={completeStepAndGoNext}
          hasNextStep={hasNextStep}
          apiBaseUrl={apiBaseUrl}
          problemId={problemId}
          visibleTestCases={visibleProblemTestCases}
          hiddenTestCasesCount={hiddenTestCasesCount}
          showIntroInitially={showEditorIntroThisTime}
          onIntroModalDismissed={handleUserDismissedEditorIntroModal}
          activeStepId={activeStepId}
        />
      );
    case "interactiveTestCases":
      return (
        <InteractiveTestCasesStepContent
          activeStepId={activeStepId}
          stepTitle={step.title}
          stepContent={step.content}
          onCompleteStep={completeStepAndGoNext}
          hasNextStep={hasNextStep}
          apiBaseUrl={apiBaseUrl}
          problemId={problemId}
          userId={userId}
          sessionToken={sessionToken}
        />
      );
    case "staticContent":
      return (
        <StaticContentStepContent
          activeStepId={activeStepId}
          step={step}
          onCompleteStep={completeStepAndGoNext}
          hasNextStep={hasNextStep}
        />
      );
    default:
      return (
        <div className="p-4 bg-neutral-800 rounded-xl h-full flex items-center justify-center text-neutral-400">
          Unsupported step type: {step.contentType}
        </div>
      );
  }
}

export { renderCenteredStatus };
