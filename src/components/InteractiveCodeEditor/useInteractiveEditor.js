import { useCallback, useState, useMemo, useEffect } from "react";

const supportedLanguages = [
    { key: "python", label: "Python" },
    { key: "java", label: "Java" },
    { key: "c", label: "C" },
    { key: "cpp", label: "C++" },
    { key: "csharp", label: "C#" },
    { key: "javascript", label: "JavaScript" },
];
export const findLanguageConfig = (key) =>
    supportedLanguages.find((l) => l.key === key) || supportedLanguages[0];

export const extractStepData = (items) => {
    if (!Array.isArray(items)) {
        return { starterCodes: {}, lang: "python" };
    }
    const codeBlock = items.find((c) => c.type === "codeBlock");
    const lang = codeBlock?.language ?? "python";
    let starterCodes = codeBlock?.starterCode ?? {};

    // backwards compat: old format used .code instead of .starterCode
    if (codeBlock?.code && Object.keys(starterCodes).length === 0) {
        starterCodes = { [lang]: codeBlock.code };
    }
    return { starterCodes, lang };
};

const LOCAL_STORAGE_PREFIX = "interactiveEditor_code_";
const createEmptyHiddenTestSummary = () => ({ total: 0, passed: 0 });
const FATAL_EVALUATION_STATUSES = new Set([
    "compilation_error",
    "runtime_error",
    "error_executing_tests",
    "error_fetching_test_cases",
    "no_test_cases_found",
    "error_internal",
]);
const CLEAR_MESSAGE_ON_EDIT_STATUSES = new Set([
    ...FATAL_EVALUATION_STATUSES,
    "some_failed",
]);

export const getEditorStorageKey = (problemId, stepId, languageKey) => {
    if (!problemId || !stepId || !languageKey) return null;
    return `${LOCAL_STORAGE_PREFIX}${problemId}_${stepId}_${languageKey}`;
};

const getCodeFromLocalStorage = (problemId, stepId, languageKey) => {
    if (typeof window === "undefined") return undefined;
    try {
        const key = getEditorStorageKey(problemId, stepId, languageKey);
        if (!key) return undefined;
        return localStorage.getItem(key);
    } catch (error) {
        console.error("Error reading from localStorage:", error);
        return undefined;
    }
};

const saveCodeToLocalStorage = (problemId, stepId, languageKey, code) => {
    if (typeof window === "undefined") return;
    try {
        const key = getEditorStorageKey(problemId, stepId, languageKey);
        if (!key) return;
        if (code === undefined || code === null || code === "") {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, code);
        }
    } catch (error) {
        console.error("Error saving to localStorage:", error);
    }
};

const clearCodeFromLocalStorage = (problemId, stepId, languageKey) => {
    if (typeof window === "undefined") return;
    try {
        const key = getEditorStorageKey(problemId, stepId, languageKey);
        if (!key) return;
        localStorage.removeItem(key);
    } catch (error) {
        console.error("Error clearing localStorage:", error);
    }
};

export const useInteractiveEditor = ({
    content = [],
    config = {},
    onCompleteStep,
}) => {
    const {
        language: languageHintProp,
        runnable = true,
        apiBaseUrl,
        problemId,
        stepId: initialConfigStepId,
    } = config;

    const { starterCodes: memoizedStarterCodes, lang: memoizedLangFromJson } = useMemo(
        () => extractStepData(content),
        [content]
    );

    const memoizedInitialLanguageKey = useMemo(() => {
        return findLanguageConfig(languageHintProp || memoizedLangFromJson).key;
    }, [languageHintProp, memoizedLangFromJson]);

    const [selectedLanguage, setSelectedLanguage] = useState(memoizedInitialLanguageKey);

    // load order: localStorage saved code > starter code > empty
    const [code, setCode] = useState(() => {
        if (initialConfigStepId && problemId) {
            const savedCode = getCodeFromLocalStorage(problemId, initialConfigStepId, memoizedInitialLanguageKey);
            if (savedCode !== null && savedCode !== undefined) {
                return savedCode;
            }
            return memoizedStarterCodes[memoizedInitialLanguageKey] || "";
        }
        return memoizedStarterCodes[memoizedInitialLanguageKey] || "";
    });

    const [evaluationMessage, setEvaluationMessage] = useState("");
    const [evaluationStatus, setEvaluationStatus] = useState(null);
    const [visibleTestResults, setVisibleTestResults] = useState([]);
    const [hiddenTestSummary, setHiddenTestSummary] = useState(createEmptyHiddenTestSummary);
    const [isRunning, setIsRunning] = useState(false);
    const [incorrectLines, setIncorrectLines] = useState([]);
    const [approachFeedback, setApproachFeedback] = useState("");
    const [isCorrectApproach, setIsCorrectApproach] = useState(true);

    const resetExecutionState = useCallback(() => {
        setEvaluationMessage("");
        setEvaluationStatus(null);
        setVisibleTestResults([]);
        setHiddenTestSummary(createEmptyHiddenTestSummary());
        setIncorrectLines([]);
        setApproachFeedback("");
        setIsCorrectApproach(true);
    }, []);

    useEffect(() => {
        const currentStepId = config.stepId;
        const currentProblemId = problemId;

        if (!currentStepId || !currentProblemId) {
            setCode("");
            resetExecutionState();
            return;
        }

        const { starterCodes, lang: langFromJsonForStep } = extractStepData(content);
        const determinedLanguageForStep = findLanguageConfig(languageHintProp || langFromJsonForStep).key;

        // need local var because setSelectedLanguage is async
        let languageToLoadCodeFor = selectedLanguage;

        if (determinedLanguageForStep !== selectedLanguage) {
            setSelectedLanguage(determinedLanguageForStep);
            languageToLoadCodeFor = determinedLanguageForStep;
        }

        const userSavedCode = getCodeFromLocalStorage(currentProblemId, currentStepId, languageToLoadCodeFor);

        if (userSavedCode !== null && userSavedCode !== undefined) {
            setCode(userSavedCode);
        } else {
            setCode(starterCodes[languageToLoadCodeFor] || "");
        }

        resetExecutionState();

    }, [config.stepId, problemId, content, languageHintProp, selectedLanguage, resetExecutionState]);

    const handleChange = useCallback((newCodeValue) => {
        setCode(newCodeValue);
        const currentStepId = config.stepId;
        const currentProblemId = problemId;
        if (currentProblemId && currentStepId && selectedLanguage) {
            saveCodeToLocalStorage(currentProblemId, currentStepId, selectedLanguage, newCodeValue);
        }
        setIncorrectLines([]);
        if (evaluationStatus && CLEAR_MESSAGE_ON_EDIT_STATUSES.has(evaluationStatus)) {
            setEvaluationMessage("");
        }
    }, [config.stepId, problemId, selectedLanguage, evaluationStatus]);

    const changeLanguage = useCallback((newLangKey) => {
        if (newLangKey === selectedLanguage) return;

        const currentStepId = config.stepId;
        const currentProblemId = problemId;

        // save current code under the old language before switching
        if (currentProblemId && currentStepId && code !== undefined && selectedLanguage) {
            saveCodeToLocalStorage(currentProblemId, currentStepId, selectedLanguage, code);
        }

        setSelectedLanguage(newLangKey);
        setIncorrectLines([]);
    }, [selectedLanguage, code, config.stepId, problemId]);

    const handleRun = useCallback(async () => {
        const currentStepId = config.stepId;
        const currentProblemId = problemId;

        if (!runnable || isRunning) return;
        if (!currentProblemId || !currentStepId) {
            console.error("Problem ID and/or Step ID from config is missing.");
            setEvaluationMessage("Client error: Essential configuration (Problem ID or Step ID) is missing.");
            setEvaluationStatus("error_executing_tests");
            return;
        }
        if (!apiBaseUrl) {
            console.error("API Base URL is missing.");
            setEvaluationMessage("Client error: API endpoint configuration is missing.");
            setEvaluationStatus("error_internal");
            return;
        }

        setIsRunning(true);
        resetExecutionState();

        const combinedProblemId = `${currentProblemId}_${currentStepId}`;
        const payload = { problem_id: combinedProblemId, language: selectedLanguage, code };

        try {
            const res = await fetch(`${apiBaseUrl}/v1/execute/code/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                let errorMsg = `API Error: ${res.status}`;
                try { const errorBody = await res.json(); errorMsg = errorBody.message || errorBody.error || errorMsg; }
                catch {
                    try {
                        const textError = await res.text();
                        errorMsg = textError ? `${errorMsg} - ${textError}` : errorMsg;
                    } catch {}
                }
                throw new Error(errorMsg);
            }
            const resultData = await res.json();
            if (resultData) {
                setEvaluationStatus(resultData.overall_status);
                const feedbackMessage = resultData.tutor_feedback || resultData.message || "Execution complete.";
                setEvaluationMessage(feedbackMessage);
                setVisibleTestResults(resultData.test_case_results || []);
                setHiddenTestSummary({
                    total: resultData.hidden_tests_total_count || 0,
                    passed: resultData.hidden_tests_passed_count || 0
                });
                setIncorrectLines(resultData.incorrect_lines || []);
                if (resultData.approach_feedback) {
                    setApproachFeedback(resultData.approach_feedback);
                    setIsCorrectApproach(resultData.is_correct_approach === undefined ? true : resultData.is_correct_approach);
                } else {
                    setIsCorrectApproach(true);
                }
            } else {
                setEvaluationStatus('error_executing_tests');
                setEvaluationMessage("Execution finished, but no valid result data received.");
            }
        } catch (err) {
            console.error("Run Error:", err);
            setEvaluationStatus('error_executing_tests');
            setEvaluationMessage(`Execution Error: ${err.message || "An unknown error occurred during execution."}`);
        } finally {
            setIsRunning(false);
        }
    }, [
        runnable, isRunning, problemId, config.stepId, selectedLanguage, code, apiBaseUrl, resetExecutionState,
    ]);

    const clearErrorState = useCallback(() => {
        setIncorrectLines([]);
        if (evaluationStatus && FATAL_EVALUATION_STATUSES.has(evaluationStatus)) {
            setEvaluationMessage("");
            setEvaluationStatus(null);
        }
    }, [evaluationStatus]);

    const resetToStarterCode = useCallback(() => {
        const currentStepId = config.stepId;
        const currentProblemId = problemId;

        if (!currentStepId || !currentProblemId) return;

        clearCodeFromLocalStorage(currentProblemId, currentStepId, selectedLanguage);

        const starterCodeForLanguage = memoizedStarterCodes[selectedLanguage] || "";
        setCode(starterCodeForLanguage);

        resetExecutionState();
    }, [config.stepId, problemId, selectedLanguage, memoizedStarterCodes, resetExecutionState]);

    return {
        selectedLanguage, code, evaluationMessage, incorrectLines, isRunning,
        evaluationStatus, approachFeedback, isCorrectApproach,
        visibleTestResults, hiddenTestSummary,
        handleChange, changeLanguage, handleRun, clearErrorState,
        resetToStarterCode,
    };
};

export default useInteractiveEditor;
