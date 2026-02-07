// single challenge card - given values, input field, submit button, feedback
import React from "react";
import {
    ArrowPathIcon,
} from "@heroicons/react/24/outline";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnimatePresence } from "framer-motion";
import { mdComponents } from "./mdComponents";
import { formatDisplayValue } from "./formatting";
import clsx from "clsx";

export default function ChallengeCard({
    challenge,
    currentIndex,
    totalChallenges,
    signatureMap,
    inputs,
    feedback,
    isReviewMode,
    completedChallenges,
    isTransitioning,
    isFetchingHint,
    handleInput,
    handleSubmit,
    handleNavigate,
    areInputsValid,
    renderFeedback,
}) {
    const givenParams = challenge.givenParameters;
    const hasGivenParams = givenParams && Object.keys(givenParams).length > 0;

    return (
        <div className="space-y-5">

            <h3 className="text-base font-semibold text-neutral-100">
                Challenge {currentIndex + 1}{totalChallenges > 1 && ` of ${totalChallenges}`}
            </h3>

            {challenge.prompt && (
                <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                        {challenge.prompt}
                    </ReactMarkdown>
                </div>
            )}

            <AnimatePresence mode="wait">
                {feedback.type === "correct" && renderFeedback()}
            </AnimatePresence>

            {hasGivenParams && (
                <div className="font-mono text-sm space-y-1 text-neutral-300">
                    {Object.entries(givenParams).map(([key, value]) => {
                        const paramDef = signatureMap.get(key);
                        const displayVal = formatDisplayValue(value, paramDef?.type);
                        return (
                            <div key={key}>
                                <span className="text-neutral-400">{paramDef?.label || key}</span>
                                {" = "}
                                <span className="text-neutral-100">{displayVal}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {feedback.type !== "correct" && challenge.parametersToProvide?.map(param => {
                const def = signatureMap.get(param.name);
                const inputValue = isReviewMode
                    ? completedChallenges.find(c => c.id === challenge.id)?.userInput?.[param.name] || ""
                    : inputs[param.name] || "";

                return (
                    <div key={param.name} className="flex items-center gap-3">
                        <label
                            htmlFor={`input-${param.name}`}
                            className="text-sm font-medium text-neutral-400 whitespace-nowrap"
                        >
                            {def?.label || param.name}
                        </label>
                        <input
                            id={`input-${param.name}`}
                            type="text"
                            value={inputValue}
                            onChange={(e) => handleInput(param.name, e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey && areInputsValid()) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                            placeholder={param.placeholder || `Enter ${def?.type || 'value'}`}
                            disabled={isTransitioning || isFetchingHint || isReviewMode}
                            className={clsx(
                                "flex-1 px-3 py-2 text-sm font-mono rounded-md",
                                "border border-neutral-600 bg-neutral-800",
                                "text-neutral-100 placeholder-neutral-500",
                                "focus:border-blue-400 focus:outline-none",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                        />
                        {!isReviewMode && (
                            <button
                                onClick={handleSubmit}
                                disabled={!areInputsValid() || isTransitioning || isFetchingHint}
                                className={clsx(
                                    "px-5 py-2 text-sm font-medium rounded-md shadow-sm",
                                    "inline-flex items-center gap-1.5 whitespace-nowrap",
                                    "bg-blue-500 text-white cursor-pointer",
                                    "hover:bg-blue-600 active:bg-blue-700",
                                    "disabled:bg-neutral-600 disabled:text-neutral-400 disabled:cursor-not-allowed"
                                )}
                            >
                                {isFetchingHint ? (
                                    <ArrowPathIcon className="w-4 h-4" />
                                ) : (
                                    "Submit"
                                )}
                            </button>
                        )}
                    </div>
                );
            })}

            <AnimatePresence mode="wait">
                {(feedback.type === "incorrect" || feedback.type === "info") && feedback.msg && renderFeedback()}
            </AnimatePresence>

            {totalChallenges > 1 && (
                <div className="flex items-center gap-2 pt-3">
                    {Array.from({ length: totalChallenges }, (_, index) => {
                        const isActive = currentIndex === index;
                        const isCompleted = index < completedChallenges.length;
                        const canNavigate = index <= completedChallenges.length && !isTransitioning;

                        return (
                            <button
                                key={index}
                                onClick={() => canNavigate && handleNavigate(index)}
                                disabled={!canNavigate}
                                className={`w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center ${
                                    isActive
                                        ? "bg-blue-500 text-white"
                                        : isCompleted
                                        ? "bg-blue-900/40 text-blue-400 hover:bg-blue-800/50"
                                        : canNavigate
                                        ? "bg-neutral-600 text-neutral-400 hover:bg-neutral-500"
                                        : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
                                }`}
                                title={`Challenge ${index + 1}${isCompleted ? ' - Completed' : isActive ? ' - Current' : ''}`}
                            >
                                {index + 1}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
