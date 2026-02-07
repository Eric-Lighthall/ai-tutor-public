// single test case input display inside the test panel
import React from 'react';

export default function TestCaseDetail({ testCase, codeBlockClasses }) {
    return (
        <div className="p-3 rounded-md text-xs">
            {Array.isArray(testCase.input)
                ? testCase.input.map((line, index) => (
                    <pre key={index} className={`${codeBlockClasses} whitespace-pre-wrap`}>
                        <code className="font-mono text-xs">{line}</code>
                    </pre>
                ))
                : (
                    <pre className={`${codeBlockClasses} whitespace-pre-wrap`}>
                        <code className="font-mono text-xs">
                            {typeof testCase.input === 'object' && testCase.input !== null
                                ? Object.entries(testCase.input).map(([key, value], i, arr) => (
                                    <React.Fragment key={key}>
                                        {`${key} = ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`}
                                        {i < arr.length - 1 && '\n'}
                                    </React.Fragment>
                                ))
                                : String(testCase.input)
                            }
                        </code>
                    </pre>
                )
            }
        </div>
    );
}
