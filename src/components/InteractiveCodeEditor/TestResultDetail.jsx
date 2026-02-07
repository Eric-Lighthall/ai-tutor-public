// single test result  - shows input, expected output, and actual output
import React from 'react';

function ResultSection({ label, children, labelClassName }) {
    return (
        <div className="mb-3">
            <p className={labelClassName}>{label}</p>
            {children}
        </div>
    );
}

export default function TestResultDetail({ result, codeBlockClasses }) {
    const sectionLabelClasses = "text-sm font-medium text-gray-400 mb-1";
    const contentBlockClasses = `${codeBlockClasses} p-2`;

    return (
        <div className="p-3 rounded-md text-xs">
            {result.input_args && result.input_args.length > 0 && (
                <ResultSection label="Input" labelClassName={sectionLabelClasses}>
                    {result.input_args.map((arg, index) => {
                        const argName = (result.input_arg_names && result.input_arg_names[index])
                            ? result.input_arg_names[index]
                            : `Arg ${index + 1}`;
                        return (
                            <div key={index} className={`${contentBlockClasses} mb-1`}>
                                <span className="font-mono text-sm">
                                    {`${argName} = ${typeof arg === 'object' ? JSON.stringify(arg) : String(arg)}`}
                                </span>
                            </div>
                        );
                    })}
                </ResultSection>
            )}

            {(result.status === 'fail' || result.status === 'pass') && result.actual_output !== undefined && (
                <ResultSection label="Your Output" labelClassName={sectionLabelClasses}>
                    <div className={contentBlockClasses}>
                        <span className="font-mono text-sm">
                            {typeof result.actual_output === 'object' ? JSON.stringify(result.actual_output) : String(result.actual_output)}
                        </span>
                    </div>
                </ResultSection>
            )}

            {result.expected_output !== undefined && (
                <ResultSection label="Expected Output" labelClassName={sectionLabelClasses}>
                    <div className={contentBlockClasses}>
                        <span className="font-mono text-sm">
                            {typeof result.expected_output === 'object' ? JSON.stringify(result.expected_output) : String(result.expected_output)}
                        </span>
                    </div>
                </ResultSection>
            )}

            {result.user_stdout && (
                <ResultSection label="Stdout" labelClassName={sectionLabelClasses}>
                    <div className={contentBlockClasses}>
                        <pre className="font-mono text-sm whitespace-pre-wrap">{result.user_stdout}</pre>
                    </div>
                </ResultSection>
            )}

            {!result.user_stdout && result.piston_stdout && (
                <ResultSection label="Stdout" labelClassName={sectionLabelClasses}>
                    <div className={contentBlockClasses}>
                        <pre className="font-mono text-sm whitespace-pre-wrap">{result.piston_stdout}</pre>
                    </div>
                </ResultSection>
            )}

            {result.piston_stderr && !result.error_message && (
                <ResultSection label="Stderr" labelClassName={`${sectionLabelClasses} text-red-400`}>
                    <div className={`${contentBlockClasses} border-red-500/30`}>
                        <pre className="font-mono text-sm whitespace-pre-wrap">{result.piston_stderr}</pre>
                    </div>
                </ResultSection>
            )}

            {result.error_message && (
                <ResultSection label="Error" labelClassName={`${sectionLabelClasses} text-red-400`}>
                    <div className={`${contentBlockClasses} border-red-500/30`}>
                        <pre className="font-mono text-sm whitespace-pre-wrap">{result.error_message}</pre>
                    </div>
                </ResultSection>
            )}
        </div>
    );
}
