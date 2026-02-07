// floating popup near error lines  - shows feedback/hints after running code
// split on newlines, drop empty lines
const splitLines = (text) =>
    String(text ?? "")
        .split(/[\r\n]+/)
        .filter((ln) => ln.trim());

export function EditorPopup({
    popupPosition,
    evaluationStatus,
    isCorrectApproach,
    approachFeedback,
    output,
    evaluationMessage,
    onDismiss,
}) {
    const popupClasses = "bg-neutral-800 border border-neutral-700 text-neutral-200 shadow-2xl";
    const buttonClasses = "bg-red-600 hover:bg-red-700 text-white shadow-md";
    const arrowClasses = "bg-neutral-800 border-t border-l border-neutral-700";
    const borderColor = "border-red-500";

    const renderLines = (text, className) =>
        splitLines(text).map((line, i) => (
            <p key={`${i}-${line.slice(0, 20)}`} className={className}>
                {line}
            </p>
        ));

    const isWrongApproachWithAllPassed =
        evaluationStatus === "all_passed" && !isCorrectApproach && approachFeedback;

    return (
        <div
            className={`absolute p-4 rounded-lg shadow-xl max-w-md text-sm z-30 animate-fade-in-short ${popupClasses}`}
            style={{
                top: popupPosition.top,
                left: popupPosition.left,
                maxWidth: "400px",
                transform: "translateY(10px)",
            }}
        >
            <div
                className={`absolute w-3 h-3 transform rotate-45 -top-1.5 left-5 ${arrowClasses}`}
            />
            <div
                className={`pl-3 border-l-2 ${borderColor} font-medium mb-2 relative z-10`}
            >
                {isWrongApproachWithAllPassed ? (
                    <div>
                        <p className="text-sm font-semibold mb-2">
                            Tests Passed, But You Must Use the Correct Approach
                        </p>
                        {renderLines(approachFeedback, "mb-2 last:mb-0 leading-relaxed")}
                        <p className="mt-3 text-xs italic">
                            You cannot proceed to the next step until you implement the correct approach.
                        </p>
                    </div>
                ) : (
                    renderLines(output || evaluationMessage, "mb-2 last:mb-0 leading-relaxed")
                )}
            </div>
            <div className="flex justify-end mt-3">
                <button
                    onClick={onDismiss}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer hover:brightness-95 ${buttonClasses}`}
                >
                    Got it
                </button>
            </div>
        </div>
    );
}
