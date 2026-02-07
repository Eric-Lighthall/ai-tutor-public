// read-only code viewer for static content steps (no run button)
import React from 'react';
import InteractiveCodeEditor from '../../InteractiveCodeEditor/InteractiveCodeEditor';

function StaticContentStepContent({
    activeStepId,
    step,
    onCompleteStep,
    hasNextStep,
}) {
    return (
        <InteractiveCodeEditor
            key={activeStepId}
            content={step.content ?? []}
            onCompleteStep={onCompleteStep}
            hasNextStep={hasNextStep}
            config={{
                ...(step.editorConfig ?? {}),
                runnable: false,
                readOnly: true,
            }}
        />
    );
}

export default StaticContentStepContent; 