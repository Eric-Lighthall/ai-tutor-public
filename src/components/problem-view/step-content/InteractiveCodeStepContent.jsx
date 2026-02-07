// wires up the code editor for a coding step  - passes config and test cases
import React from 'react';
import InteractiveCodeEditor from '../../InteractiveCodeEditor/InteractiveCodeEditor';

function InteractiveCodeStepContent({
    step,
    onCompleteStep,
    hasNextStep,
    apiBaseUrl,
    problemId,
    visibleTestCases,
    hiddenTestCasesCount,
    showIntroInitially,
    onIntroModalDismissed,
    activeStepId,
}) {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow">
                <InteractiveCodeEditor
                    content={step.content ?? []}
                    onCompleteStep={onCompleteStep}
                    hasNextStep={hasNextStep}
                    config={{
                        ...(step.editorConfig ?? {}),
                        runnable: true,
                        readOnly: false,
                        apiBaseUrl,
                        problemId,
                        stepId: activeStepId,
                        visibleTestCases,
                        hiddenTestCasesCount,
                    }}
                    showIntroInitially={showIntroInitially}
                    onIntroModalDismissed={onIntroModalDismissed}
                />
            </div>
        </div>
    );
}

export default InteractiveCodeStepContent; 
