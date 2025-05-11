// src/pages/DynamicProblemPage.jsx
import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useContext,
    useMemo,
} from "react";
import { useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import ProblemPageLayout from "../components/problem-view/ProblemPageLayout";
import ProblemSidebar from "../components/problem-view/ProblemSidebar";
import ProblemDescription from "../components/problem-view/ProblemDescription";
import InteractiveCodeEditor from "../components/InteractiveCodeEditor/InteractiveCodeEditor";
import ChatInterface from "../components/InteractiveChat";
import TestCasesDisplay from "../components/interactivetestcases/InteractiveTestCases.jsx";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ToggleSwitch from "../components/common/ToggleSwitch";
import { UserIdContext } from "../App.jsx";
import useChatInteraction from "../hooks/useChatInteraction";

// Vite specific import for mulitple JSON files
const problemJsonModules = import.meta.glob("../content/problems/*/*.json", {
    import: "default",
});

// Base URL for the Cloudflare worker that handles AI interactions and code execution.
// Cloudflare workers are being used right now, but azure functions should be easy to swap in if we want to do that.
const CLOUDFLARE_WORKER_BASE_URL =
    "https://ai-worker.ericlighthall.workers.dev";

/**
 * Component for rendering a specific coding problem, including its description,
 * interactive steps (chat, code editor, test cases), and managing students progress.
 * Fetches problem data dynamically from JSON based on problemId.
 */
function ProblemSpecificView({
    problemId,
    userId,
    apiBaseUrl,
    devMode,
    isSidebarCollapsed,
    onSidebarToggle,
    sessionToken,
}) {
    const [problemData, setProblemData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeStepId, setActiveStepId] = useState("");
    const [unlockedStepIndex, setUnlockedStepIndex] = useState(0);
    const [stepChatHistories, setStepChatHistories] = useState({});
    const [stepCompletionStatus, setStepCompletionStatus] = useState({});
    const chatEndRef = useRef(null);
    const [hasShownModalIntroForProblem, setHasShownModalIntroForProblem] =
        useState(false);
    const [hasShownEditorIntroForProblem, setHasShownEditorIntroForProblem] =
        useState(false);

    // Fetch problem data from JSON when problemId changes.
    // Right now, we only have the two-sum problem, but this is here so different problems can be added in the future.
    useEffect(() => {
        const fetchProblemData = async () => {
            setIsLoading(true);
            setError("");

            const importPath = `../content/problems/${problemId}/${problemId}.json`;
            const importFn = problemJsonModules[importPath];
            try {
                if (!importFn) {
                    throw new Error(
                        `Problem definition not found for "${problemId}".`
                    );
                }
                const data = await importFn();
                setProblemData(data);
                if (data.steps?.length) {
                    const firstStep = data.steps[0];
                    setActiveStepId(firstStep.id);
                    setStepCompletionStatus({ [firstStep.id]: false });
                } else {
                    setError('Problem data is missing "steps".');
                }
            } catch (err) {
                console.error("Failed to load problem JSON:", err);
                setError(err.message ?? "Unknown error loading problem.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchProblemData();
    }, [problemId]);

    const handleUserDismissedChatIntroModal = useCallback(() => {
        setHasShownModalIntroForProblem(true);
    }, []);

    const handleUserDismissedEditorIntroModal = useCallback(() => {
        setHasShownEditorIntroForProblem(true);
    }, []);

    // Highest step index the user can access, based on completed steps
    const effectiveUnlockedIndex = useMemo(() => {
        if (!problemData?.steps) return 0;
        return devMode ? problemData.steps.length - 1 : unlockedStepIndex;
    }, [devMode, unlockedStepIndex, problemData]);

    // Navigate between steps
    const handleSelectStep = useCallback(
        (stepId, forceSelect = false) => {
            if (!problemData?.steps) return;
            const stepIndex = problemData.steps.findIndex(
                (s) => s.id === stepId
            );
            if (
                stepIndex === -1 ||
                (!forceSelect && stepIndex > effectiveUnlockedIndex)
            ) {
                console.warn(
                    `Step selection blocked: stepIndex=${stepIndex}, effectiveUnlockedIndex=${effectiveUnlockedIndex}, forceSelect=${forceSelect}`
                );
                return;
            }
            setActiveStepId(stepId);
            setError("");
        },
        [problemData, effectiveUnlockedIndex]
    );

    // Advances to the next step or marks the problem as complete.
    // Stores problem completion status in localStorage.
    const completeStepAndGoNext = useCallback(() => {
        if (!problemData?.steps) return;
        const currentIndex = problemData.steps.findIndex(
            (s) => s.id === activeStepId
        );
        const nextIndex = currentIndex + 1;
        if (nextIndex < problemData.steps.length) {
            const nextStepId = problemData.steps[nextIndex].id;
            setUnlockedStepIndex((prevIndex) => Math.max(prevIndex, nextIndex));
            handleSelectStep(nextStepId, true);
        } else {
            alert("Congratulations! You've completed all steps!");
            try {
                const key = `edu_challenge_${userId}`;
                const existing = JSON.parse(localStorage.getItem(key) || "{}");
                existing[problemId] = true;
                localStorage.setItem(key, JSON.stringify(existing));
            } catch (e) {
                console.error("Failed to save challenge completion", e);
            }
        }
    }, [problemData, activeStepId, handleSelectStep, problemId, userId]);

    const handleChatHistoryChangeForStep = useCallback(
        (newHistoryArray) => {
            setStepChatHistories((prev) => ({
                ...prev,
                [activeStepId]: newHistoryArray,
            }));
        },
        [activeStepId]
    );

    const handleStepCompletionChange = useCallback(
        (stepIdToUpdate, isCompleted) => {
            setStepCompletionStatus((prevStatus) => ({
                ...prevStatus,
                [stepIdToUpdate]: isCompleted,
            }));
        },
        []
    );

    const currentStepDetailsForHook = useMemo(
        () => problemData?.steps.find((s) => s.id === activeStepId),
        [problemData, activeStepId]
    );

    // Hook for managing chat interactions with the cloudflare worker for the current step.
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

    // Renders the content for the currently active problem step based on its type.
    const renderActiveStepContent = () => {
        if (isLoading)
            return (
                <div className="flex justify-center items-center h-full">
                    <LoadingSpinner />
                </div>
            );
        if (error && !problemData)
            return (
                <div className="p-4 text-red-400 bg-neutral-800 rounded-xl h-full flex items-center justify-center">
                    Error: {error}
                </div>
            );
        if (!problemData?.steps)
            return (
                <div className="p-4 text-neutral-400 bg-neutral-800 rounded-xl h-full flex items-center justify-center">
                    Invalid problem data.
                </div>
            );

        const step = problemData.steps.find((s) => s.id === activeStepId);
        if (!step)
            return (
                <div className="p-4 text-neutral-400 bg-neutral-800 rounded-xl h-full flex items-center justify-center">
                    Select a step.
                </div>
            );

        const currentIndex = problemData.steps.findIndex(
            (s) => s.id === activeStepId
        );
        const hasNextStep = currentIndex + 1 < problemData.steps.length;
        const historyForCurrentStep = stepChatHistories[activeStepId] || [];
        const currentStepCompleted =
            stepCompletionStatus[activeStepId] || false;

        const isFreshChatStepContentWise =
            step.contentType === "chat" &&
            (historyForCurrentStep.length === 0 ||
                (historyForCurrentStep.length === 1 &&
                    historyForCurrentStep[0].id.startsWith("initial-ai-")));
        const showChatIntroThisTime =
            isFreshChatStepContentWise && !hasShownModalIntroForProblem;

        const isFirstInteractiveCodeStepView =
            step.contentType === "interactiveCode";
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
                        onIntroModalDismissed={
                            handleUserDismissedChatIntroModal
                        }
                    />
                );
            case "interactiveCode":
                return (
                    <InteractiveCodeEditor
                        key={activeStepId}
                        content={step.content ?? []}
                        onCompleteStep={completeStepAndGoNext}
                        hasNextStep={hasNextStep}
                        config={{
                            ...(step.editorConfig ?? {}),
                            runnable: true,
                            readOnly: false,
                            apiBaseUrl,
                            sessionId: sessionToken,
                            userId: userId,
                            problemId,
                            stepId: activeStepId,
                            problemDescription:
                                problemData.descriptionPanel?.mainDescription ||
                                "",
                        }}
                        showIntroInitially={showEditorIntroThisTime}
                        onIntroModalDismissed={
                            handleUserDismissedEditorIntroModal
                        }
                    />
                );
            case "interactiveTestCases":
                return (
                    <TestCasesDisplay
                        key={activeStepId}
                        title={step.title}
                        stepContent={step.content}
                        onCompleteStep={completeStepAndGoNext}
                        hasNextStep={hasNextStep}
                        apiBaseUrl={apiBaseUrl}
                        problemId={problemId}
                        stepId={activeStepId}
                        userId={userId}
                        sessionId={sessionToken}
                    />
                );
            case "staticContent":
                return (
                    <InteractiveCodeEditor
                        key={activeStepId}
                        content={step.content ?? []}
                        onCompleteStep={completeStepAndGoNext}
                        hasNextStep={hasNextStep}
                        config={{
                            ...(step.editorConfig ?? {}),
                            runnable: false,
                            readOnly: true,
                        }}
                    />
                );
            default:
                return (
                    <div className="p-4 text-neutral-400 bg-neutral-800 rounded-xl h-full flex items-center justify-center">
                        Unsupported step type: {step.contentType}
                    </div>
                );
        }
    };

    return (
        // Three-panel layout: problem description, main content, and steps sidebar.
        <ProblemPageLayout
            isStepsCollapsed={isSidebarCollapsed}
            problemPanel={
                isLoading && !problemData ? (
                    <div className="flex justify-center items-center h-full">
                        <LoadingSpinner />
                    </div>
                ) : error && !problemData ? (
                    <div className="p-4 text-red-400 bg-neutral-800 rounded-xl h-full flex items-center justify-center">
                        Error: {error}
                    </div>
                ) : problemData ? (
                    <ProblemDescription
                        data={problemData.descriptionPanel}
                        title={problemData.title}
                        difficulty={problemData.difficulty}
                    />
                ) : null
            }
            mainContent={renderActiveStepContent()}
            stepsPanel={
                isLoading && !problemData ? (
                    <div className="flex justify-center items-center h-full">
                        <LoadingSpinner />
                    </div>
                ) : error && !problemData ? (
                    <div className="p-4 text-red-400 bg-neutral-800 rounded-xl h-full flex items-center justify-center">
                        Error loading steps
                    </div>
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
                    />
                ) : null
            }
        />
    );
}

/**
 * Main page component that wraps `ProblemSpecificView`.
 * Handles URL params to get the problemId, manages global states like
 * Developer Mode, and sidebar visibility, and generates a unique session token.
 */
export default function DynamicProblemPage() {
    const { problemId: routeProblemId } = useParams();
    const userId = useContext(UserIdContext);

    // global state for page, doesnt reset with problemId
    const [devMode, setDevMode] = useState(() =>
        JSON.parse(localStorage.getItem("devMode") ?? "false")
    );
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [sessionToken, setSessionToken] = useState("");

    useEffect(
        () => localStorage.setItem("devMode", JSON.stringify(devMode)),
        [devMode]
    );
    useEffect(() => setSessionToken(uuidv4()), []);

    if (!routeProblemId) {
        return (
            <div className="relative flex-1 flex flex-col min-h-0 items-center justify-center p-4 text-red-400 bg-neutral-900">
                No problem ID specified. Please check the URL.
            </div>
        );
    }

    return (
        <div className="relative flex-1 flex flex-col min-h-0">
            {/* Dev mode toggle */}
            <div className="fixed top-4 right-4 flex flex-col items-end space-y-1 z-50">
                <ToggleSwitch
                    id="dev-mode-toggle"
                    isOn={devMode}
                    onToggle={() => setDevMode((m) => !m)}
                    label="Unlock All Steps"
                    labelPosition="left"
                />
            </div>
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
                />
            )}
        </div>
    );
}
