// wires up the knowledge check quiz for a test case step
import React from 'react';
import TestCasesDisplay from '../../InteractiveTestCases/InteractiveTestCases.jsx';

function InteractiveTestCasesStepContent({
    activeStepId,
    stepTitle,
    stepContent,
    onCompleteStep,
    hasNextStep,
    apiBaseUrl,
    problemId,
    userId,
    sessionToken,
}) {
    return (
        <TestCasesDisplay
            key={activeStepId}
            title={stepTitle}
            stepContent={stepContent}
            onCompleteStep={onCompleteStep}
            hasNextStep={hasNextStep}
            apiBaseUrl={apiBaseUrl}
            problemId={problemId}
            stepId={activeStepId}
            userId={userId}
            sessionId={sessionToken}
        />
    );
}

export default InteractiveTestCasesStepContent; 