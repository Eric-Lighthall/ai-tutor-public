// Handles logic for code editor, including running code, displaying results, handling error messages, deciding if user can proceed
// Needs some signifcant rework. It's functional, but it's brittle and relies on the client sending correct data 
import { useState, useEffect, useCallback, useMemo } from "react";

const supportedLanguages = [
    { key: "python", label: "Python", extension: null, icon: null },
    { key: "java", label: "Java", extension: null, icon: null },
    { key: "c", label: "C", extension: null, icon: null },
    { key: "cpp", label: "C++", extension: null, icon: null },
    { key: "csharp", label: "C#", extension: null, icon: null },
    { key: "javascript", label: "JavaScript", extension: null, icon: null },
];
const findLanguageConfig = (key) => supportedLanguages.find((l) => l.key === key) || supportedLanguages[0];

const extractStepData = (items) => {
    if (!Array.isArray(items)) {
        return { starterCodes: {}, lang: "python", stepDescription: "" };
    }
    const codeBlock = items.find((c) => c.type === "codeBlock");
    const descriptionParagraph = items.find((c) => c.type === "paragraph");

    const lang = codeBlock?.language ?? "python";
    let starterCodes = codeBlock?.starterCode ?? {};

    // If starterCode map is empty but a single code string exists, use it for the current language
    if (codeBlock?.code && Object.keys(starterCodes).length === 0) {
        starterCodes = { [lang]: codeBlock.code };
    }
    const stepDescription = codeBlock?.stepDescription || descriptionParagraph?.text || "";
    return { starterCodes, lang, stepDescription };
};

export const useInteractiveEditor = ({
    content = [],
    config = {},
    onCompleteStep,
}) => {
    const {
        language: languageHintProp, runnable = true, apiBaseUrl, sessionId, userId, problemId, stepId,
    } = config;

    // Parses raw content items to extract initial code, language, and description for the step.
    const { starterCodes: starterCodesInit, lang: langInitFromJson, stepDescription: stepDescInit } = useMemo(
        () => extractStepData(content),
        [content]
    );

    const validInitialLanguageKey = useMemo(() => {
        const hint = languageHintProp ?? langInitFromJson ?? "python";
        return supportedLanguages.some((l) => l.key === hint) ? hint : "python";
    }, [languageHintProp, langInitFromJson]);

    const [selectedLanguage, setSelectedLanguage] = useState(validInitialLanguageKey);
    const [code, setCode] = useState(() => starterCodesInit[validInitialLanguageKey] || "");
    const [output, setOutput] = useState("");
    const [incorrectLines, setIncorrectLines] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [finalResult, setFinalResult] = useState(null);
    const [evaluationStatus, setEvaluationStatus] = useState(null);
    const [currentStepDescription, setCurrentStepDescription] = useState(stepDescInit);

    // Reset editor state when the step changes or language/code source updates.
    useEffect(() => {
        setSelectedLanguage(validInitialLanguageKey);
        setCode(starterCodesInit[validInitialLanguageKey] || "");
        setCurrentStepDescription(stepDescInit);
        setOutput("");
        setIncorrectLines([]);
        setFinalResult(null);
        setIsRunning(false);
        setEvaluationStatus(null);
    }, [stepId, validInitialLanguageKey, starterCodesInit, stepDescInit]);

    const handleChange = useCallback((val) => {
        setCode(val);
    }, []);

    const changeLanguage = useCallback((newLangKey) => {
        if (newLangKey !== selectedLanguage) {
            console.log(`Changing language from ${selectedLanguage} to ${newLangKey}`);
            setSelectedLanguage(newLangKey);
            setCode(starterCodesInit[newLangKey] || "");
            setOutput("");
            setIncorrectLines([]);
            setFinalResult(null);
            setIsRunning(false);
            setEvaluationStatus(null);
        }
    }, [selectedLanguage, starterCodesInit]);

    const handleRun = useCallback(async () => {
        if (!runnable || isRunning) {
            console.warn("Run prevented:", { runnable, isRunning });
            return;
        }
        setIsRunning(true);
        setOutput("");
        setIncorrectLines([]);
        setFinalResult(null);
        setEvaluationStatus(null);
        let runStatus = 'error';

        try {
            // Add line numbers to user code (helps AI output correct lines)
            const numberedCode = code
                .split('\n')
                .map((line, index) => `${index + 1}: ${line}`)
                .join('\n');

            // This part is screwed up - step description should really just be stored on the server, not sent from the client.
            const payload = {
                session_id: sessionId,
                problem_id: problemId,
                step_id: stepId,
                code: numberedCode,
                problem_description: currentStepDescription
            };
            const base = apiBaseUrl || "";
            const res = await fetch(`${base}/v1/tutor/evaluate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            });

            // Log bad error responses
            if (!res.ok) {
                let errorMsg = `HTTP error! status: ${res.status}`;
                try {
                    const errorBody = await res.text();
                    errorMsg += ` - ${errorBody}`;
                }
                catch { }
                throw new Error(errorMsg);
            }

            const latestResult = await res.json();

            setFinalResult(latestResult);
            if (latestResult) {
                runStatus = latestResult.result || 'error';
                setOutput(latestResult.message || (runStatus === 'error' ? "Execution failed." : "Execution finished."));
                setIncorrectLines(Array.isArray(latestResult.incorrect_lines) ? latestResult.incorrect_lines : []);
            }
            else {
                runStatus = 'error';
                setOutput("Execution finished, but no valid result received.");
                setFinalResult({ success: false, message: "No structured result received." });
                setIncorrectLines([]);
            }
        }
        catch (err) {
            console.error("Run Error:", err);
            const errorMsg = `Error: ${err.message || "Unknown execution error"}`;
            runStatus = 'error';
            setOutput(errorMsg);
            setFinalResult({ success: false, message: errorMsg });
            setIncorrectLines([]);
        }
        finally {
            setIsRunning(false);
            setEvaluationStatus(runStatus);
        }
    }, [runnable, isRunning, sessionId, problemId, stepId, code, currentStepDescription, apiBaseUrl]);

    const clearErrorState = useCallback(() => {
        setIncorrectLines([]);
        setOutput('');
        setFinalResult(null);
        setEvaluationStatus(null);
    }, []);

    // Determine if the continue to next step button should be enabled
    const canComplete = useMemo(() => {
        return !isRunning && !!onCompleteStep && finalResult && (finalResult.success || (finalResult.result === 'incorrect' && finalResult.message && (!finalResult.incorrect_lines || finalResult.incorrect_lines.length === 0)));
    }, [isRunning, onCompleteStep, finalResult]);

    return {
        selectedLanguage, code, output, incorrectLines, isRunning, finalResult,
        evaluationStatus,
        starterCodesInit,
        handleChange,
        changeLanguage,
        handleRun,
        clearErrorState,
        canComplete,
    };
};

export { supportedLanguages, findLanguageConfig, extractStepData };
export default useInteractiveEditor;