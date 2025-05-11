import { useState, useMemo, useCallback, useEffect } from "react";
import { EditorShell } from "./EditorShell";
import { CodePane } from "./CodePane";
import useInteractiveEditor from "./useInteractiveEditor";
import IntroOverlay from "../common/IntroOverlay";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import introCodingAnimationSrc from "@/assets/coding.lottie";
import runningLoadingAnimationSrc from "@/assets/loading.lottie";

// Language server would be ideal and was previously implemented, but it would add significant overhead for the server.
// Unless this is a really wanted feature, it's probably best to leave it out.
// import { useLspWebSocket } from "@/hooks/useLspWebSocket";
// import "highlight.js/styles/github-dark.css";

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
        sessionId,
        userId,
        problemId,
        stepId,
        language,
    } = config;

    const [showEditorIntroOverlay, setShowEditorIntroOverlay] =
        useState(showIntroInitially);

    useEffect(() => {
        setShowEditorIntroOverlay(showIntroInitially);
    }, [showIntroInitially]);

    const {
        selectedLanguage,
        code,
        output,
        incorrectLines,
        isRunning,
        evaluationStatus,
        handleChange,
        handleRun,
        changeLanguage,
        clearErrorState,
    } = useInteractiveEditor({
        content,
        config: {
            language,
            runnable,
            apiBaseUrl,
            sessionId,
            userId,
            problemId,
            stepId,
        },
        onCompleteStep,
    });

    const wsUrl = useMemo(() => {
        if (!apiBaseUrl) return null;
        const url = new URL(apiBaseUrl);
        const wsProto = url.protocol === "https:" ? "wss:" : "ws:";
        return `${wsProto}//${url.host}/v1/ws`;
    }, [apiBaseUrl]);

    /*
    const { isReady: isLspReady, lspHoverExtension } = useLspWebSocket(
        wsUrl,
        selectedLanguage,
        code,
        // Enable LSP only for Python and if editor is not read-only
        selectedLanguage === "python" && !readOnly
    );
    */
    const isLspReady = false;
    const lspHoverExtension = null;

    const handleLanguageChange = useCallback(
        (newLang) => changeLanguage(newLang),
        [changeLanguage]
    );

    const handleBeginCoding = useCallback(() => {
        setShowEditorIntroOverlay(false);
        onIntroModalDismissed?.();
    }, [onIntroModalDismissed]);

    // Intro overlay overrides
    const editorButtonColorClass = "bg-blue-600 hover:bg-blue-700";
    const introAnimationElement = (
        <DotLottieReact
            src={introCodingAnimationSrc}
            loop
            autoplay
            style={{ width: "100%", height: "100%" }}
        />
    );

    // Code running lottie annimation
    const runningIndicatorAnimationElement = (
        <DotLottieReact
            src={runningLoadingAnimationSrc}
            loop
            autoplay
            style={{ width: "auto", height: "1.5em" }}
        />
    );

    return (
        <EditorShell>
            {/* Intro overlay */}
            {showEditorIntroOverlay && (
                <IntroOverlay
                    title="Interactive Code Editor"
                    description="Enter your code in the editor. The AI will evaluate your solution. You can proceed to the next step once your code is correct."
                    buttonText="Begin Coding"
                    onBegin={handleBeginCoding}
                    animationElement={introAnimationElement}
                    buttonClassName={editorButtonColorClass}
                />
            )}
            {/* Code window */}
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
                    runnable: runnable && !readOnly && !showEditorIntroOverlay,
                    isRunning,
                    evaluationStatus,
                    handleRun,
                    runBtnLabel,
                    output,
                    incorrectLines,
                    onDismissError: clearErrorState,
                    runningIndicatorAnimation: runningIndicatorAnimationElement,
                }}
                navigation={{
                    onCompleteStep,
                    hasNextStep,
                }}
            />
        </EditorShell>
    );
}
