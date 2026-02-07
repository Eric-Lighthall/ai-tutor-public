// code editor with vertically resizable test panel below  - center of the problem page
import { useState, useCallback, useEffect, useRef } from "react";
import { EditorShell } from "./EditorShell";
import { CodePane } from "./CodePane";
import useInteractiveEditor from "./useInteractiveEditor";
import TestCasesPanel from "./TestCasesPanel";
import IntroOverlay from "../common/IntroOverlay";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import introCodingAnimationSrc from "@/assets/coding.lottie";
import runningLoadingAnimationSrc from "@/assets/loading_dot.lottie";

const MIN_TEST_PANEL_HEIGHT = 40;
const MAX_TEST_PANEL_HEIGHT_PERCENTAGE = 0.8;
const INITIAL_TEST_PANEL_HEIGHT = 250;
const RESIZE_HANDLE_HEIGHT = 10;
const BLUE_HIGHLIGHT_FIXED_THICKNESS = "3px";

export default function InteractiveCodeEditor({
    content = [],
    config = {},
    onCompleteStep,
    hasNextStep,
    showIntroInitially = false,
    onIntroModalDismissed,
}) {
    const {
        runBtnLabel,
        runnable = true,
        showEditor: showEditorConfig = true,
        readOnly = false,
        apiBaseUrl,
        problemId,
        stepId,
        language,
        visibleTestCases: problemVisibleTestCases = [],
        hiddenTestCasesCount: problemHiddenTestCasesCount = 0,
    } = config;

    const [showEditorIntroOverlay, setShowEditorIntroOverlay] =
        useState(showIntroInitially);

    const [testPanelHeight, setTestPanelHeight] = useState(
        INITIAL_TEST_PANEL_HEIGHT
    );
    const [isVerticalDragging, setIsVerticalDragging] = useState(false);
    const verticalDraggingRef = useRef(false);
    const startYRef = useRef(0);
    const startHeightRef = useRef(0);
    const mainContainerRef = useRef(null);

    useEffect(
        () => setShowEditorIntroOverlay(showIntroInitially),
        [showIntroInitially]
    );

    const {
        selectedLanguage,
        code,
        incorrectLines,
        isRunning,
        evaluationStatus,
        evaluationMessage,
        approachFeedback,
        isCorrectApproach,
        visibleTestResults,
        hiddenTestSummary,
        handleChange,
        handleRun,
        changeLanguage,
        clearErrorState,
        resetToStarterCode,
    } = useInteractiveEditor({
        content,
        config: {
            language,
            runnable,
            apiBaseUrl,
            problemId,
            stepId,
        },
        onCompleteStep,
    });

    // lsp not yet wired up
    const isLspReady = false;
    const lspHoverExtension = null;

    const handleLanguageChange = useCallback(
        (newLang) => changeLanguage(newLang.key || newLang),
        [changeLanguage]
    );

    const handleBeginCoding = useCallback(() => {
        setShowEditorIntroOverlay(false);
        onIntroModalDismissed?.();
    }, [onIntroModalDismissed]);

    // drag-to-resize the test panel vertically
    const onVerticalMouseMove = useCallback((e) => {
        if (!verticalDraggingRef.current || !mainContainerRef.current) return;
        e.preventDefault();
        const deltaY = e.clientY - startYRef.current;
        const newHeight = startHeightRef.current - deltaY;

        const totalAvailableHeight = mainContainerRef.current.offsetHeight;
        const editorShellMinHeight = 150;
        const maxPanelHeight = Math.min(
            totalAvailableHeight * MAX_TEST_PANEL_HEIGHT_PERCENTAGE,
            totalAvailableHeight - editorShellMinHeight - RESIZE_HANDLE_HEIGHT
        );

        setTestPanelHeight(
            Math.max(MIN_TEST_PANEL_HEIGHT, Math.min(maxPanelHeight, newHeight))
        );
    }, []);

    const stopVerticalDragging = useCallback(() => {
        if (!verticalDraggingRef.current) return;
        verticalDraggingRef.current = false;
        setIsVerticalDragging(false);
        window.removeEventListener("mousemove", onVerticalMouseMove);
        window.removeEventListener("mouseup", stopVerticalDragging);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
    }, [onVerticalMouseMove]);

    const startVerticalDragging = useCallback(
        (e) => {
            e.preventDefault();
            verticalDraggingRef.current = true;
            setIsVerticalDragging(true);
            startYRef.current = e.clientY;
            startHeightRef.current = testPanelHeight;
            window.addEventListener("mousemove", onVerticalMouseMove);
            window.addEventListener("mouseup", stopVerticalDragging);
            document.body.style.userSelect = "none";
            document.body.style.cursor = "ns-resize";
        },
        [testPanelHeight, onVerticalMouseMove, stopVerticalDragging]
    );

    useEffect(() => {
        return () => {
            if (verticalDraggingRef.current) {
                stopVerticalDragging();
            }
        };
    }, [stopVerticalDragging]);

    const isTestPanelMinimized = testPanelHeight === MIN_TEST_PANEL_HEIGHT;
    const testPanelWrapperClasses = `flex-shrink-0 overflow-hidden ${
        isTestPanelMinimized ? "rounded-xl" : "rounded-t-xl"
    }`;

    const introAnimationElement = (
        <DotLottieReact
            src={introCodingAnimationSrc}
            loop
            autoplay
            style={{ width: "100%", height: "100%" }}
        />
    );

    const runningIndicatorAnimationElement = (
        <DotLottieReact
            src={runningLoadingAnimationSrc}
            loop
            autoplay
            style={{ width: "auto", height: "1.5em" }}
        />
    );

    return (
        <div ref={mainContainerRef} className="flex flex-col h-full">
            <div className="flex-1 flex flex-col min-h-0">
                <EditorShell>
                    {showEditorIntroOverlay && (
                        <IntroOverlay
                            title="Interactive Code Editor"
                            description="Enter your code in the editor. The AI will evaluate your solution. You can proceed to the next step once your code is correct."
                            buttonText="Begin Coding"
                            onBegin={handleBeginCoding}
                            animationElement={introAnimationElement}
                            buttonVariant="primary"
                        />
                    )}
                    <CodePane
                        editorConfig={{
                            showEditor: showEditorConfig,
                            readOnly: readOnly || showEditorIntroOverlay,
                            onLanguageChange: handleLanguageChange,
                        }}
                        editorState={{
                            code,
                            selectedLanguage,
                            handleChange,
                            lspHoverExtension,
                            gutterExtension: null,
                            isLspReady,
                        }}
                        executionState={{
                            runnable:
                                runnable &&
                                !readOnly &&
                                !showEditorIntroOverlay,
                            isRunning,
                            evaluationStatus,
                            evaluationMessage: evaluationMessage || output,
                            approachFeedback,
                            isCorrectApproach,
                            handleRun,
                            runBtnLabel,
                            output,
                            incorrectLines,
                            onDismissError: clearErrorState,
                            runningIndicatorAnimation:
                                runningIndicatorAnimationElement,
                            resetToStarterCode,
                        }}
                        navigation={{
                            onCompleteStep,
                            hasNextStep,
                        }}
                    />
                </EditorShell>
            </div>

            {!showEditorIntroOverlay && showEditorConfig && (
                <div
                    onMouseDown={startVerticalDragging}
                    style={{
                        height: `${RESIZE_HANDLE_HEIGHT}px`,
                        cursor: "ns-resize",
                    }}
                    className="group w-full flex-shrink-0 relative select-none"
                    role="separator"
                    aria-orientation="horizontal"
                    aria-valuenow={testPanelHeight}
                    aria-valuemin={MIN_TEST_PANEL_HEIGHT}
                >
                    <div
                        style={{ height: BLUE_HIGHLIGHT_FIXED_THICKNESS }}
                        className={`absolute top-1/2 left-0 w-full -translate-y-1/2 pointer-events-none rounded-full transition-colors duration-0 z-10 ${
                            isVerticalDragging
                                ? "bg-sky-500"
                                : "bg-transparent group-hover:bg-sky-500"
                        }`}
                    />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[2.5px] w-8 lg:w-10 bg-neutral-600 rounded-full pointer-events-none" />
                </div>
            )}

            {!showEditorIntroOverlay && showEditorConfig && (
                <div
                    className={testPanelWrapperClasses}
                    style={{ height: `${testPanelHeight}px` }}
                >
                    <TestCasesPanel
                        visibleTestCases={problemVisibleTestCases}
                        hiddenTestCasesCount={problemHiddenTestCasesCount}
                        results={visibleTestResults}
                        overallStatus={evaluationStatus}
                        isRunning={isRunning}
                        hiddenTestSummary={hiddenTestSummary}
                        isCorrectApproach={isCorrectApproach}
                        approachFeedback={approachFeedback}
                        className="h-full w-full"
                    />
                </div>
            )}
        </div>
    );
}
