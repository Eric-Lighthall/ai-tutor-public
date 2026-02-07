// main problem-solving page  - creates session, connects state/chat hooks to the layout
import React, { useState, useEffect, useRef, useCallback, useContext, useMemo } from "react";
import { useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import ProblemPageLayout from "../components/problem-view/ProblemPageLayout";
import ProblemSidebar from "../components/problem-view/ProblemSidebar";
import ProblemDescription from "../components/problem-view/ProblemDescription";
import { UserIdContext } from "../App.jsx";
import useChatInteraction from "../hooks/useChatInteraction";
import ConfirmationModal from "../components/common/ConfirmationModal.jsx";
import { StepContentRenderer, renderCenteredStatus } from "../components/problem-view/StepContentRenderer.jsx";
import { useProblemState } from "./useProblemState";
import { useStepProgress } from "./useStepProgress";

const CLOUDFLARE_WORKER_BASE_URL =
  "https://ai-worker.ericlighthall.workers.dev";

function ProblemSpecificView({
  problemId,
  userId,
  apiBaseUrl,
  devMode,
  isSidebarCollapsed,
  onSidebarToggle,
  sessionToken,
  setDevMode,
}) {
  const chatEndRef = useRef(null);
  const [hasShownModalIntroForProblem, setHasShownModalIntroForProblem] =
    useState(false);
  const [hasShownEditorIntroForProblem, setHasShownEditorIntroForProblem] =
    useState(false);
  const [isResetConfirmationModalOpen, setIsResetConfirmationModalOpen] =
    useState(false);

  const {
    problemData,
    error,
    setError,
    activeStepId,
    setActiveStepId,
    setUnlockedStepIndex,
    stepChatHistories,
    setStepChatHistories,
    stepCompletionStatus,
    setStepCompletionStatus,
    effectiveUnlockedIndex,
    visibleProblemTestCases,
    hiddenTestCasesCount,
    resetProgressState,
  } = useProblemState({ problemId, userId, devMode });

  const {
    handleStepCompletionChange,
    handleSelectStep,
    completeStepAndGoNext,
    actuallyResetProgress,
    requestResetProgress,
  } = useStepProgress({
    problemId,
    userId,
    problemData,
    activeStepId,
    effectiveUnlockedIndex,
    setStepCompletionStatus,
    setUnlockedStepIndex,
    setActiveStepId,
    setError,
    resetProgressState,
    onOpenResetConfirm: () => setIsResetConfirmationModalOpen(true),
    onCloseResetConfirm: () => setIsResetConfirmationModalOpen(false),
  });

  const handleUserDismissedChatIntroModal = useCallback(() => {
    setHasShownModalIntroForProblem(true);
  }, []);

  const handleUserDismissedEditorIntroModal = useCallback(() => {
    setHasShownEditorIntroForProblem(true);
  }, []);

  const handleChatHistoryChangeForStep = useCallback(
    (newHistoryArray) => {
      setStepChatHistories((prev) => ({
        ...prev,
        [activeStepId]: newHistoryArray,
      }));
    },
    [activeStepId, setStepChatHistories]
  );

  const currentStepDetailsForHook = useMemo(
    () => problemData?.steps.find((s) => s.id === activeStepId),
    [problemData, activeStepId]
  );

  const {
    submitChatMessage,
    isProcessingMessage,
    currentStreamingMessageId,
  } = useChatInteraction({
    sessionToken,
    problemId,
    activeStepId,
    currentStepDetails: currentStepDetailsForHook,
    currentFullHistoryForStep: stepChatHistories[activeStepId] || [],
    onHistoryChange: handleChatHistoryChangeForStep,
    onCompletionChange: handleStepCompletionChange,
    onFatalError: setError,
    apiBaseUrl,
  });

  return (
    <>
      <ProblemPageLayout
        isStepsCollapsed={isSidebarCollapsed}
        problemPanel={
          error && !problemData ? (
            renderCenteredStatus(`Error: ${error}`, "error")
          ) : problemData ? (
            <ProblemDescription
              data={problemData.descriptionPanel}
              title={problemData.title}
              difficulty={problemData.difficulty}
            />
          ) : null
        }
        mainContent={
          <StepContentRenderer
            error={error}
            problemData={problemData}
            activeStepId={activeStepId}
            stepChatHistories={stepChatHistories}
            stepCompletionStatus={stepCompletionStatus}
            hasShownModalIntroForProblem={hasShownModalIntroForProblem}
            hasShownEditorIntroForProblem={hasShownEditorIntroForProblem}
            submitChatMessage={submitChatMessage}
            isProcessingMessage={isProcessingMessage}
            currentStreamingMessageId={currentStreamingMessageId}
            chatEndRef={chatEndRef}
            completeStepAndGoNext={completeStepAndGoNext}
            handleUserDismissedChatIntroModal={handleUserDismissedChatIntroModal}
            handleUserDismissedEditorIntroModal={handleUserDismissedEditorIntroModal}
            apiBaseUrl={apiBaseUrl}
            sessionToken={sessionToken}
            userId={userId}
            problemId={problemId}
            visibleProblemTestCases={visibleProblemTestCases}
            hiddenTestCasesCount={hiddenTestCasesCount}
          />
        }
        stepsPanel={
          error && !problemData ? (
            renderCenteredStatus("Error loading steps", "error")
          ) : problemData ? (
            <ProblemSidebar
              steps={
                problemData.steps?.map((s, i) => ({
                  id: s.id,
                  title: `${i + 1}. ${s.title}`,
                })) ?? []
              }
              activeStepId={activeStepId}
              onSelectStep={handleSelectStep}
              unlockedStepIndex={effectiveUnlockedIndex}
              isCollapsed={isSidebarCollapsed}
              onToggle={onSidebarToggle}
              devMode={devMode}
              onToggleDevMode={() => setDevMode((m) => !m)}
              onResetProgress={requestResetProgress}
            />
          ) : null
        }
      />
      <ConfirmationModal
        isOpen={isResetConfirmationModalOpen}
        onClose={() => setIsResetConfirmationModalOpen(false)}
        onConfirm={actuallyResetProgress}
        title="Reset Progress"
        message="Are you sure you want to reset all your progress for this problem? This action cannot be undone."
        confirmText="Reset"
        cancelText="Cancel"
        confirmButtonVariant="danger"
      />
    </>
  );
}

export default function DynamicProblemPage() {
  const { problemId: routeProblemId } = useParams();
  const userId = useContext(UserIdContext);

  const [devMode, setDevMode] = useState(() =>
    JSON.parse(localStorage.getItem("devMode") ?? "false")
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  // fresh uuid per page load, used to group api requests into a session
  const [sessionToken, setSessionToken] = useState("");

  useEffect(
    () => localStorage.setItem("devMode", JSON.stringify(devMode)),
    [devMode]
  );
  useEffect(() => setSessionToken(uuidv4()), []);

  if (!routeProblemId) {
    return (
      <div className="relative flex-1 flex flex-col min-h-0 items-center justify-center p-4 bg-neutral-900 text-red-400">
        No problem ID specified. Please check the URL.
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      {sessionToken && (
        <ProblemSpecificView
          key={routeProblemId}
          problemId={routeProblemId}
          userId={userId}
          apiBaseUrl={CLOUDFLARE_WORKER_BASE_URL}
          devMode={devMode}
          isSidebarCollapsed={isSidebarCollapsed}
          onSidebarToggle={() => setIsSidebarCollapsed((c) => !c)}
          sessionToken={sessionToken}
          setDevMode={setDevMode}
        />
      )}
    </div>
  );
}
