// success/error banners that appear at the bottom of the editor after running code
import { FiCheck, FiAlertTriangle } from "react-icons/fi";

// split on newlines, drop empty lines
const splitLines = (text) =>
    String(text ?? "")
        .split(/[\r\n]+/)
        .filter((ln) => ln.trim());

export function SuccessBanner({ evaluationMessage, output, onCompleteStep, hasNextStep }) {
    const containerClasses = "bg-green-900/30 border-t border-green-700/50 text-green-200";
    const iconColor = "text-green-400";
    const buttonClasses = "bg-green-600 hover:bg-green-700 text-white focus:ring-green-400/75 cursor-pointer";

    return (
        <div className={`flex-none p-4 animate-fade-in ${containerClasses}`}>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <FiCheck size={18} className={`${iconColor} flex-shrink-0`} />
                    <span className="text-sm font-medium">
                        {evaluationMessage || output || "Congratulations! All tests passed."}
                    </span>
                </div>
                {onCompleteStep && (
                    <button
                        onClick={onCompleteStep}
                        className={`px-4 py-1.5 text-sm font-semibold rounded transition-colors duration-200 focus:outline-none focus:ring-2 flex items-center gap-2 ${buttonClasses}`}
                        aria-label={hasNextStep ? "Go to Next Step" : "Finish"}
                    >
                        {hasNextStep ? "Continue to Next Step" : "Finish Problem"}
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
    );
}

export function FatalErrorBanner({ evaluationMessage, output, onDismissError }) {
    const containerClasses = "bg-red-900/30 border-t border-red-700/50 text-red-200";
    const iconColor = "text-red-400";
    const subTextColor = "text-red-300/80";
    const buttonClasses = "bg-red-600/80 hover:bg-red-500/80 text-white";

    return (
        <div className={`flex-none p-4 animate-fade-in ${containerClasses}`}>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <FiAlertTriangle size={18} className={`${iconColor} flex-shrink-0`} />
                    <div className="text-sm font-medium">
                        {splitLines(evaluationMessage || output).map((line, i) => (
                            <p key={`${i}-${line.slice(0, 20)}`} className="mb-1 last:mb-0 leading-snug">
                                {line}
                            </p>
                        ))}
                        <p className={`mt-2 text-xs ${subTextColor}`}>
                            (This is likely an issue with your submission or with the execution environment-the exact reason is above.)
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => onDismissError?.()}
                    className={`px-3 py-1 text-xs rounded transition-colors ${buttonClasses}`}
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}
