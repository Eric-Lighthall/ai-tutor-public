// codemirror editor area with toolbar, status bar, and error popups
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { pythonRuffLinterExtension } from "@/linters/pythonLinter";
import { EditorStatusBar } from "./EditorStatusBar";
import { EditorToolbar } from "./EditorToolbar";
import { EditorPopup } from "./EditorPopup";
import { SuccessBanner, FatalErrorBanner } from "./EditorStatusBanner";
import {
    FATAL_STATUSES,
    lspTooltipTheme,
    createCursorUpdateListener,
    createEditorKeymaps,
    createErrorHighlighter,
    buildBaseExtensions,
    buildAdditionalExtensions,
} from "./codeMirrorSetup";

const getCenteredPopupPosition = (containerRect) => ({
    top: Math.max(50, containerRect.height / 3),
    left: Math.max(50, containerRect.width / 4),
});

const getPopupPositionForLine = (editorView, lineNumber, containerRect) => {
    if (!editorView || !lineNumber) return null;
    if (lineNumber <= 0 || lineNumber > editorView.state.doc.lines) return null;

    const lineInfo = editorView.state.doc.line(lineNumber);
    const coords = editorView.coordsAtPos(lineInfo.from);
    if (!coords) return null;

    return {
        top: coords.bottom - containerRect.top + 8,
        left: Math.max(20, coords.left - containerRect.left - 10),
    };
};

export function CodePane({ editorConfig, editorState, executionState, navigation }) {
    const { showEditor = true, readOnly = false, onLanguageChange } = editorConfig;
    const {
        code,
        selectedLanguage,
        handleChange: handleChangeProp,
        lspHoverExtension,
        gutterExtension,
        isLspReady,
    } = editorState;
    const {
        runnable,
        isRunning,
        evaluationStatus,
        evaluationMessage,
        approachFeedback,
        isCorrectApproach,
        handleRun,
        runBtnLabel = "Run",
        output,
        incorrectLines = [],
        onDismissError,
        runningIndicatorAnimation,
        resetToStarterCode,
    } = executionState;
    const { onCompleteStep, hasNextStep } = navigation;

    const isSuccess =
        evaluationStatus === "all_passed" || evaluationStatus === "wrong_approach";
    const isFailure = evaluationStatus === "some_failed";
    const isFatalError = FATAL_STATUSES.has(evaluationStatus);
    const normalizedIncorrectLines = Array.isArray(incorrectLines) ? incorrectLines : [];

    const editorContainerRef = useRef(null);
    const popupShownRef = useRef(false); // prevents re-showing popup on re-renders
    const [editorView, setEditorView] = useState(null);
    const [showPopup, setShowPopup] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
    const [cursor, setCursor] = useState({ line: 1, col: 1 });
    const [tabSize, setTabSize] = useState(4);

    const errorHighlighter = useMemo(
        () => createErrorHighlighter(normalizedIncorrectLines),
        [normalizedIncorrectLines]
    );

    const cursorUpdateListener = createCursorUpdateListener(setCursor);

    const editorKeymaps = useMemo(
        () => createEditorKeymaps(tabSize),
        [tabSize]
    );

    const baseExtensions = useMemo(
        () => buildBaseExtensions({ selectedLanguage, tabSize, editorKeymaps, cursorUpdateListener }),
        [selectedLanguage, tabSize, editorKeymaps, cursorUpdateListener]
    );

    const pythonExtensions = useMemo(() => {
        if (selectedLanguage !== "python") return [];
        const exts = [];
        if (lspHoverExtension) exts.push(lspHoverExtension, lspTooltipTheme);
        if (!readOnly) exts.push(pythonRuffLinterExtension);
        return exts;
    }, [selectedLanguage, lspHoverExtension, readOnly]);

    const additionalExtensions = useMemo(
        () => buildAdditionalExtensions({ gutterExtension, readOnly, normalizedIncorrectLines, errorHighlighter }),
        [gutterExtension, readOnly, normalizedIncorrectLines.length, errorHighlighter]
    );

    const extensions = useMemo(
        () => [...baseExtensions, ...pythonExtensions, ...additionalExtensions],
        [baseExtensions, pythonExtensions, additionalExtensions]
    );

    useEffect(() => {
        if (popupShownRef.current) return;

        const containerRect = editorContainerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        const openPopup = (position) => {
            setPopupPosition(position);
            setShowPopup(true);
            popupShownRef.current = true;
        };

        if (evaluationStatus === "all_passed" && !isCorrectApproach && approachFeedback) {
            openPopup(getCenteredPopupPosition(containerRect));
            return;
        }

        const shouldShowEvaluationPopup =
            (evaluationStatus === "wrong_approach" || isFailure) &&
            Boolean(output || evaluationMessage) &&
            Boolean(editorView);

        if (!shouldShowEvaluationPopup) return;

        if (evaluationStatus === "wrong_approach" && normalizedIncorrectLines.length === 0) {
            openPopup(getCenteredPopupPosition(containerRect));
            return;
        }

        const linePosition = getPopupPositionForLine(
            editorView,
            normalizedIncorrectLines[0] || 1,
            containerRect
        );
        openPopup(linePosition || getCenteredPopupPosition(containerRect));
    }, [
        evaluationStatus, isFailure, isCorrectApproach, approachFeedback,
        normalizedIncorrectLines, output, evaluationMessage, editorView,
    ]);

    useEffect(() => {
        popupShownRef.current = false;
    }, [evaluationStatus]);

    const handleChange = useCallback(
        (value) => {
            setShowPopup(false);
            onDismissError?.();
            handleChangeProp(value);
        },
        [handleChangeProp, onDismissError]
    );

    if (!showEditor) return null;

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
            <EditorToolbar
                selectedLanguage={selectedLanguage}
                onLanguageChange={onLanguageChange}
                readOnly={readOnly}
                isRunning={isRunning}
                runnable={runnable}
                handleRun={handleRun}
                runBtnLabel={runBtnLabel}
                runningIndicatorAnimation={runningIndicatorAnimation}
                resetToStarterCode={resetToStarterCode}
            />

            <div
                ref={editorContainerRef}
                className="flex-1 overflow-hidden relative transition-all duration-300 ease-in-out h-full"
            >
                <CodeMirror
                    indentWithTab={false}
                    value={code}
                    height="100%"
                    theme={vscodeDark}
                    extensions={extensions}
                    key={selectedLanguage}
                    onChange={handleChange}
                    style={{ height: "100%" }}
                    onCreateEditor={setEditorView}
                />

                {showPopup && (
                    <EditorPopup
                        popupPosition={popupPosition}
                        evaluationStatus={evaluationStatus}
                        isCorrectApproach={isCorrectApproach}
                        approachFeedback={approachFeedback}
                        output={output}
                        evaluationMessage={evaluationMessage}
                        onDismiss={() => {
                            setShowPopup(false);
                            popupShownRef.current = true;
                            onDismissError?.();
                        }}
                    />
                )}
            </div>

            {isSuccess && (isCorrectApproach || !approachFeedback) && (
                <SuccessBanner
                    evaluationMessage={evaluationMessage}
                    output={output}
                    onCompleteStep={onCompleteStep}
                    hasNextStep={hasNextStep}
                />
            )}

            {isFatalError && (
                <FatalErrorBanner
                    evaluationMessage={evaluationMessage}
                    output={output}
                    onDismissError={onDismissError}
                />
            )}

            <EditorStatusBar
                cursor={cursor}
                tabSize={tabSize}
                onTabSizeChange={setTabSize}
                readOnly={readOnly}
            />
        </div>
    );
}
