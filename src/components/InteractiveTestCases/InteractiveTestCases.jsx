// knowledge check - sequential quiz challenges shown in the center panel
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    ChevronRightIcon,
    CheckIcon,
    XMarkIcon,
    DocumentTextIcon,
} from "@heroicons/react/24/outline";
import Button from "../common/Button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { mdComponents } from "./mdComponents";
import { parseInput } from "./parsing.js";
import { compareIndices } from "./formatting.js";
import { useHintFetching } from "../../hooks/useHintFetching";
import { loadTestCaseProgress, saveTestCaseProgress, clearTestCaseProgress } from "./progressUtils.js";
import ChallengeCard from "./ChallengeCard";
import CompletionView from "./CompletionView";

const FEEDBACK_CONFIGS = {
    correct: {
        icon: <CheckIcon className="w-4 h-4" />,
        styles: "bg-emerald-900/20 text-emerald-300 border border-emerald-800"
    },
    incorrect: {
        icon: <XMarkIcon className="w-4 h-4" />,
        styles: "bg-rose-900/20 text-rose-300 border border-rose-800"
    }
};

export default function InteractiveTestCases({
    stepContent,
    onCompleteStep,
    hasNextStep,
    problemId,
    stepId,
    apiBaseUrl,
    userId,
}) {
    const {
        functionSignature = [],
        challenges = [],
        completionMessage = "Step complete!",
    } = stepContent || {};

    const [currentIndex, setCurrentIndex] = useState(0);
    const [inputs, setInputs] = useState({});
    const [feedback, setFeedback] = useState({ msg: "", type: "info" });
    const [completedChallenges, setCompletedChallenges] = useState([]);
    const [isAllComplete, setIsAllComplete] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const signatureMap = useMemo(
        () => new Map(functionSignature.map((p) => [p.name, p])),
        [functionSignature]
    );

    const { isFetchingHint, triggerFetchHint } = useHintFetching(
        apiBaseUrl, problemId, stepId, setFeedback
    );

    const currentChallenge = challenges[currentIndex];
    const isReviewMode = currentIndex < completedChallenges.length; // navigated back to a completed one
    const totalChallenges = challenges.length;

    useEffect(() => {
        setCurrentIndex(0);
        setInputs({});
        setFeedback({ msg: "", type: "info" });
        setCompletedChallenges([]);
        setIsAllComplete(false);
        setIsTransitioning(false);

        if (userId && problemId && stepId && stepContent) {
            try {
                const savedProgress = loadTestCaseProgress(userId, problemId, stepId);
                if (savedProgress) {
                    // filter out saved progress for challenges that no longer exist
                    const validCompletedChallenges = savedProgress.completedTestCases.filter(tc =>
                        challenges.some(challenge => challenge.id === tc.id)
                    );

                    if (validCompletedChallenges.length > 0) {
                        setCompletedChallenges(validCompletedChallenges);

                        if (savedProgress.stepCompleted && validCompletedChallenges.length === challenges.length) {
                            setIsAllComplete(true);
                            setFeedback({ type: "correct", msg: completionMessage });
                        } else {
                            setCurrentIndex(validCompletedChallenges.length);
                        }
                    } else if (savedProgress.completedTestCases.length > 0) {
                        clearTestCaseProgress(userId, problemId, stepId);
                    }
                }
            } catch (error) {
                console.error("Error loading saved progress:", error);
            }
        }
    }, [stepContent, userId, problemId, stepId, completionMessage, challenges]);

    const saveProgress = useCallback((updatedCompleted, isStepComplete = false) => {
        if (userId && problemId && stepId) {
            const progressData = {
                completedChallenges: updatedCompleted.map(tc => tc.id),
                completedTestCases: updatedCompleted,
                stepCompleted: isStepComplete,
            };
            saveTestCaseProgress(userId, problemId, stepId, progressData);
        }
    }, [userId, problemId, stepId]);

    const handleInput = useCallback((name, value) => {
        if (isTransitioning || feedback.type === "correct" || isReviewMode) return;
        setInputs(prev => ({ ...prev, [name]: value }));
        if (feedback.type === "incorrect") {
            setFeedback({ msg: "", type: "info" });
        }
    }, [isTransitioning, feedback.type, isReviewMode]);

    const areInputsValid = useCallback(() => {
        if (!currentChallenge?.parametersToProvide || isAllComplete || isReviewMode) return false;
        return currentChallenge.parametersToProvide.every(param => {
            const raw = inputs[param.name];
            if (!raw || raw.toString().trim() === "") return false;
            const paramDef = signatureMap.get(param.name);
            return parseInput(paramDef?.type, raw) !== null;
        });
    }, [currentChallenge, isAllComplete, inputs, isReviewMode, signatureMap]);

    const handleSubmit = useCallback(async () => {
        if (isTransitioning || isAllComplete || !currentChallenge?.parametersToProvide ||
            isFetchingHint || !areInputsValid() || isReviewMode) return;

        const paramToProvide = currentChallenge.parametersToProvide[0];
        const name = paramToProvide.name;
        const paramDef = signatureMap.get(name);
        const raw = inputs[name];
        const parsed = parseInput(paramDef?.type, raw);
        const expected = currentChallenge.expectedOutput;

        if (parsed === null) {
            setFeedback({
                type: "incorrect",
                msg: `Invalid format for '${paramDef?.label || name}'. Expected type: ${paramDef?.type}.`,
            });
            return;
        }

        if (compareIndices(parsed, expected)) {
            setFeedback({ type: "correct", msg: "Correct!" });

            const completedData = {
                id: currentChallenge.id,
                given: currentChallenge.givenParameters || {},
                userInput: { [name]: raw },
                parsedInput: parsed,
                expected,
                correct: true,
            };

            const updatedCompleted = [...completedChallenges, completedData];
            const nextIndex = currentIndex + 1;
            const isStepComplete = nextIndex >= totalChallenges;

            setCompletedChallenges(updatedCompleted);
            saveProgress(updatedCompleted, isStepComplete);

            // 1s to show "correct", then 200ms fade to next challenge
            setTimeout(() => {
                setIsTransitioning(true);
                setTimeout(() => {
                    if (isStepComplete) {
                        setIsAllComplete(true);
                        setFeedback({ type: "correct", msg: completionMessage });
                    } else {
                        setCurrentIndex(nextIndex);
                        setInputs({});
                        setFeedback({ msg: "", type: "info" });
                    }
                    setIsTransitioning(false);
                }, 200);
            }, 1000);
        } else {
            setFeedback({ type: "incorrect", msg: "Let me check that..." });
            try {
                await triggerFetchHint(raw, expected, currentChallenge.givenParameters);
            } catch (error) {
                console.error("Hint fetching failed:", error);
                setFeedback({
                    type: "incorrect",
                    msg: "Sorry, couldn't get a hint right now. Please try again.",
                });
            }
        }
    }, [
        isTransitioning, isAllComplete, currentChallenge, isFetchingHint, areInputsValid,
        isReviewMode, inputs, currentIndex, totalChallenges, completedChallenges,
        saveProgress, completionMessage, triggerFetchHint, signatureMap
    ]);

    const handleNavigate = useCallback((index) => {
        if (index > completedChallenges.length || isTransitioning || index === currentIndex) return;
        setCurrentIndex(index);
        if (index >= completedChallenges.length) {
            setFeedback({ msg: "", type: "info" });
        }
    }, [completedChallenges.length, isTransitioning, currentIndex]);

    const renderFeedback = () => {
        if (!feedback.msg) return null;
        const config = FEEDBACK_CONFIGS[feedback.type] || FEEDBACK_CONFIGS.incorrect;

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex items-start gap-3 p-4 rounded-lg mb-6 ${config.styles}`}
            >
                <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
                <div className="flex-1 min-w-0 prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                        {feedback.msg}
                    </ReactMarkdown>
                </div>
            </motion.div>
        );
    };

    if (!currentChallenge && !isAllComplete) {
        return <div className="p-6 text-center text-neutral-500">No challenges available.</div>;
    }

    return (
        <div className="bg-neutral-800 rounded-xl shadow-lg border border-neutral-700 h-full flex flex-col">
            <div className="flex items-center gap-2 h-10 px-4 border-b bg-neutral-700/30 border-neutral-700 select-none">
                <DocumentTextIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm font-medium text-neutral-200 tracking-wide">
                    Knowledge&nbsp;Check
                </span>
            </div>

            <div className="flex-1 flex items-center justify-center overflow-y-auto">
                <div className="w-full max-w-lg px-5 -mt-12">
                {isAllComplete ? (
                    <CompletionView completionMessage={completionMessage} />
                ) : (
                    <ChallengeCard
                        challenge={currentChallenge}
                        currentIndex={currentIndex}
                        totalChallenges={totalChallenges}
                        signatureMap={signatureMap}
                        inputs={inputs}
                        feedback={feedback}
                        isReviewMode={isReviewMode}
                        completedChallenges={completedChallenges}
                        isTransitioning={isTransitioning}
                        isFetchingHint={isFetchingHint}
                        handleInput={handleInput}
                        handleSubmit={handleSubmit}
                        handleNavigate={handleNavigate}
                        areInputsValid={areInputsValid}
                        renderFeedback={renderFeedback}
                    />
                )}

                {(isAllComplete || totalChallenges === 0) && (
                    <div className="pt-4 flex justify-end">
                        <Button
                            variant="success"
                            onClick={onCompleteStep}
                            className="min-w-[160px]"
                            aria-label={hasNextStep ? "Go to Next Step" : "Finish Problem"}
                        >
                            {hasNextStep ? "Continue to Next Step" : "Finish Problem"}
                            <ChevronRightIcon className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}
