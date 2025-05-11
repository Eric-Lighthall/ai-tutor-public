// Integrates all subcomponents of code editor
// Uses codemirror for editor, editortoolbar for language selection and running code, editorstatusbar for bottom status display
// Displays various UI elements for feedback
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { EditorView, Decoration, keymap } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { indentUnit } from "@codemirror/language";
import { indentationMarkers } from "@replit/codemirror-indentation-markers"; // Thanks to https://github.com/replit/codemirror-indentation-markers
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { indentMore } from "@codemirror/commands";
import { acceptCompletion } from "@codemirror/autocomplete";
import { usePythonLinter } from "@/linters/pythonLinter";
import { FiCheck, FiAlertTriangle } from "react-icons/fi";
import { EditorStatusBar } from "./EditorStatusBar";
import { EditorToolbar } from "./EditorToolbar";

const lspTooltipTheme = EditorView.theme({}, { dark: true });
const greenGutterTheme = EditorView.theme({
    ".cm-lineNumbers .cm-gutterElement": {
        position: "relative",
        paddingLeft: "8px",
    },
    ".cm-lineNumbers .cm-gutterElement::before": {
        content: '""',
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: "3px",
        backgroundColor: "#046113",
    },
    ".cm-lineNumbers .cm-gutterElement.cm-activeLineGutter::before": {
        backgroundColor: "#009118",
    },
});

const langExtensionMap = {
    python: python(),
    java: java(),
    c: cpp(),
    cpp: cpp(),
    csharp: cpp(),
    javascript: javascript(),
};
const getLangExtension = (key) => langExtensionMap[key] || python();

export function CodePane({
    editorConfig,
    editorState,
    executionState,
    navigation,
}) {
    const {
        showEditor = true,
        readOnly = false,
        onLanguageChange,
    } = editorConfig;

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
        handleRun,
        runBtnLabel = "Run",
        output,
        incorrectLines = [],
        onDismissError,
        runningIndicatorAnimation,
    } = executionState;

    const { onCompleteStep, hasNextStep } = navigation;

    const editorContainerRef = useRef(null);
    const [editorView, setEditorView] = useState(null);
    const [showPopup, setShowPopup] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
    const [cursor, setCursor] = useState({ line: 1, col: 1 });
    const [tabSize, setTabSize] = useState(4);

    const {
        isReady: isPyLinterReady,
        initializationError: pyLinterError,
        linter: pythonLinterExt,
        gutter: pythonGutterExt,
    } = usePythonLinter({ delay: 300 });

    // Create red highlighting effect for incorrect lines
    const errorHighlighter = useMemo(() => {
        return EditorView.decorations.compute([incorrectLines], (state) => {
            const builder = new RangeSetBuilder();
            (Array.isArray(incorrectLines) ? incorrectLines : []).forEach(
                (ln) => {
                    if (
                        typeof ln !== "number" ||
                        ln <= 0 ||
                        ln > state.doc.lines
                    )
                        return; // Fix to highlight only valid lines. Sometimes the AI would respond with lines out of the range of the users code
                    try {
                        const line = state.doc.line(ln);
                        builder.add(
                            line.from,
                            line.from,
                            Decoration.line({
                                attributes: {
                                    style: "background-color: rgba(255,0,0,0.15)",
                                },
                            })
                        );
                    } catch {}
                }
            );
            return builder.finish();
        });
    }, [incorrectLines]);

    const cursorUpdateListener = EditorView.updateListener.of((update) => {
        if (update.selectionSet) {
            const pos = update.view.state.selection.main.head;
            const lineObj = update.view.state.doc.lineAt(pos);
            setCursor({ line: lineObj.number, col: pos - lineObj.from + 1 });
        }
    });

    // Tab key map to insert spaces based on tab size
    const editorKeymaps = useMemo(
        () => [
            {
                key: "Tab",
                run: (view) => {
                    if (acceptCompletion(view)) return true;
                    const spaces = " ".repeat(tabSize);
                    const { from, to } = view.state.selection.main;
                    view.dispatch({
                        changes: { from, to, insert: spaces },
                        selection: { anchor: from + spaces.length },
                    });
                    return true;
                },
            },
            { key: "Shift-Tab", run: indentMore },
        ],
        [tabSize]
    );

    // Codemirror configuration
    const baseExtensions = useMemo(
        () => [
            getLangExtension(selectedLanguage),
            EditorView.lineWrapping,
            indentationMarkers({
                highlightActiveBlock: false,
                hideFirstIndent: false,
                markerType: "codeOnly",
                thickness: 1,
                colors: { dark: "#444", activeDark: "#666" },
            }),
            indentUnit.of(" ".repeat(tabSize)),
            keymap.of(editorKeymaps),
            cursorUpdateListener,
            greenGutterTheme,
        ],
        [selectedLanguage, tabSize, editorKeymaps]
    );

    // Python specific codemirror extensions
    // LSP hover is not used.
    const pythonExtensions = useMemo(() => {
        if (selectedLanguage !== "python") return [];
        const exts = [];
        if (lspHoverExtension) {
            exts.push(lspHoverExtension, lspTooltipTheme);
        }
        if (!readOnly && isPyLinterReady) {
            if (pythonLinterExt) exts.push(pythonLinterExt);
            if (pythonGutterExt) exts.push(pythonGutterExt);
        }
        return exts;
    }, [
        selectedLanguage,
        lspHoverExtension,
        readOnly,
        isPyLinterReady,
        pythonLinterExt,
        pythonGutterExt,
    ]);

    // Conditional extensions
    const additionalExtensions = useMemo(() => {
        const exts = [];
        if (gutterExtension) {
            exts.push(gutterExtension);
        }
        if (readOnly) {
            exts.push(EditorView.editable.of(false));
            exts.push(
                EditorView.theme({
                    "&": { opacity: 0.8 },
                    ".cm-content": { cursor: "default" },
                })
            );
        } else if (incorrectLines.length > 0) {
            exts.push(errorHighlighter);
        }
        return exts;
    }, [gutterExtension, readOnly, incorrectLines, errorHighlighter]);

    const extensions = useMemo(
        () => [...baseExtensions, ...pythonExtensions, ...additionalExtensions],
        [baseExtensions, pythonExtensions, additionalExtensions]
    );

    const editorKey = selectedLanguage;

    // Display error popup when incorrect evaluation input and output lines are given
    useEffect(() => {
        setShowPopup(false);

        if (
            evaluationStatus === "incorrect" &&
            output &&
            editorView &&
            incorrectLines.length > 0
        ) {
            const firstLine =
                (Array.isArray(incorrectLines) ? incorrectLines : [1])[0] || 1;
            if (firstLine > 0 && firstLine <= editorView.state.doc.lines) {
                const lineInfo = editorView.state.doc.line(firstLine);
                const coords = editorView.coordsAtPos(lineInfo.from);
                const containerRect =
                    editorContainerRef.current?.getBoundingClientRect();
                if (coords && containerRect) {
                    setPopupPosition({
                        top: coords.bottom - containerRect.top + 5,
                        left: Math.max(0, coords.left - containerRect.left),
                    });
                    setShowPopup(true);
                }
            }
        }
    }, [evaluationStatus, incorrectLines, output, editorView]);

    const handleChange = useCallback(
        (value) => {
            setShowPopup(false);
            onDismissError?.();
            handleChangeProp(value);
        },
        [handleChangeProp, onDismissError]
    );

    // Break error popup into multiple lines
    // Without this, AI error output appears as one big string
    const renderPopup = () =>
        output
            ?.split(/[\r\n]+/)
            .filter((ln) => ln.trim())
            .map((ln, i) => (
                <p key={i} className="mb-2 last:mb-0 leading-snug">
                    {ln}
                </p>
            ));

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
                    key={editorKey}
                    onChange={handleChange}
                    style={{ height: "100%" }}
                    onCreateEditor={setEditorView}
                />

                {/* Error popup */}
                {showPopup && (
                    <div
                        className="absolute bg-neutral-900 border-2 border-red-500/80 text-neutral-200 p-3 rounded-lg shadow-xl max-w-md text-[0.8rem] z-30 animate-fade-in-short"
                        style={{
                            top: popupPosition.top,
                            left: popupPosition.left,
                        }}
                    >
                        {renderPopup()}
                        <div className="flex justify-end mt-2">
                            <button
                                onClick={() => {
                                    setShowPopup(false);
                                    onDismissError?.();
                                }}
                                className="px-3 py-1 text-xs rounded bg-red-600/80 hover:bg-red-500/80 text-white transition-colors"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Green success message */}
            {evaluationStatus === "correct" && (
                <div className="flex-none p-4 border-t border-green-700/50 bg-green-900/30 text-green-200 animate-fade-in">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <FiCheck
                                size={18}
                                className="text-green-400 flex-shrink-0"
                            />
                            <span className="text-sm font-medium">
                                {output || "Step completed successfully."}
                            </span>
                        </div>
                        {onCompleteStep && (
                            <button
                                onClick={onCompleteStep}
                                className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-400/75 flex items-center gap-2"
                                aria-label={
                                    hasNextStep
                                        ? "Go to Next Step"
                                        : "Finish Problem"
                                }
                            >
                                {hasNextStep
                                    ? "Continue to Next Step"
                                    : "Finish Problem"}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    className="w-4 h-4 inline-block"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Error message */}
            {(evaluationStatus === "error" ||
                (evaluationStatus === "incorrect" &&
                    incorrectLines.length === 0)) &&
                output && (
                    <div className="flex-none p-4 border-t border-red-700/50 bg-red-900/30 text-red-200 animate-fade-in">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <FiAlertTriangle
                                    size={18}
                                    className="text-red-400 flex-shrink-0"
                                />
                                <div className="text-sm font-medium">
                                    {/* Safely handle formatting LLM response to prevent malformed AI output */}
                                    {output
                                        ?.split(/[\r\n]+/)
                                        .filter((ln) => ln.trim())
                                        .map((ln, i) => (
                                            <p
                                                key={i}
                                                className="mb-1 last:mb-0 leading-snug"
                                            >
                                                {ln}
                                            </p>
                                        ))}
                                    {evaluationStatus === "error" && (
                                        <p className="mt-2 text-xs text-red-300/80">
                                            (This is likely an issue with the
                                            server itself, not with your code or
                                            connection.)
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    onDismissError?.();
                                }}
                                className="px-3 py-1 text-xs rounded bg-red-600/80 hover:bg-red-500/80 text-white transition-colors"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

            <EditorStatusBar
                selectedLanguage={selectedLanguage}
                isLspReady={isLspReady}
                isPyLinterReady={isPyLinterReady}
                pyLinterError={pyLinterError}
                cursor={cursor}
                tabSize={tabSize}
                onTabSizeChange={setTabSize}
                readOnly={readOnly}
            />
        </div>
    );
}
