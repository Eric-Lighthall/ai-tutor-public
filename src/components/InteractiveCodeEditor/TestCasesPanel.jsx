// resizable panel below the editor  - shows test case inputs and run results
import React, { useState, useEffect } from 'react';
import { FiList, FiCheckSquare, FiLoader } from 'react-icons/fi';
import clsx from 'clsx';
import TestCaseDetail from './TestCaseDetail';
import TestResultDetail from './TestResultDetail';

export default function TestCasesPanel({
    visibleTestCases = [],
    hiddenTestCasesCount = 0,
    className = "",
    results = [],
    overallStatus = null,
    isRunning = false,
    hiddenTestSummary = { total: 0, passed: 0 },
    isCorrectApproach = true,
    approachFeedback = ""
}) {
    const [activeTab, setActiveTab] = useState('cases');
    const [selectedCaseIndex, setSelectedCaseIndex] = useState(null);
    const [isShowingHiddenInfo, setIsShowingHiddenInfo] = useState(false);
    const [selectedResultIndex, setSelectedResultIndex] = useState(null);
    const [showAiFeedbackView, setShowAiFeedbackView] = useState(false);

    const casesToDisplay = visibleTestCases.length > 0 ? visibleTestCases : [];

    useEffect(() => {
        if (isRunning) {
            setActiveTab('results');
            setSelectedResultIndex(null);
        }
    }, [isRunning]);

    useEffect(() => {
        if (activeTab === 'cases') {
            if (casesToDisplay.length > 0) {
                if (selectedCaseIndex === null || selectedCaseIndex >= casesToDisplay.length) {
                    setSelectedCaseIndex(0);
                }
            } else {
                setSelectedCaseIndex(null);
            }
            setSelectedResultIndex(null);
            setShowAiFeedbackView(false);
        } else if (activeTab === 'results') {
            if (!isRunning && results.length > 0) {
                if (selectedResultIndex === null || selectedResultIndex >= results.length) {
                    if (!showAiFeedbackView) setSelectedResultIndex(0);
                }
            } else if (!isRunning && results.length === 0) {
                setSelectedResultIndex(null);
            }
            setSelectedCaseIndex(null);
        }
    }, [activeTab, casesToDisplay, results, isRunning, selectedCaseIndex, selectedResultIndex, showAiFeedbackView]);

    const headerIconTheme = "text-green-600";
    const codeBlockClasses = "bg-neutral-800 p-2 rounded mt-1 font-mono text-xs overflow-x-auto custom-scrollbar";

    const headerButtonBaseClasses = "px-2 py-1 rounded text-sm font-bold transition-colors duration-150 ease-in-out focus:outline-none cursor-pointer flex items-center gap-1.5";
    const caseButtonBase = "px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none cursor-pointer";

    const getHeaderButtonClasses = (isActive) => {
        const buttonCls = isActive ? 'text-neutral-200 hover:bg-neutral-600' : 'text-neutral-400 hover:bg-neutral-600 hover:text-neutral-200';
        const iconCls = isActive ? headerIconTheme : `${headerIconTheme} opacity-60`;
        return { buttonCls, iconCls };
    };

    const getCaseButtonClasses = (isActive) => {
        return isActive
            ? `${caseButtonBase} bg-neutral-700 text-neutral-100`
            : `${caseButtonBase} bg-transparent text-neutral-300 hover:bg-neutral-700`;
    };

    const buttonContainerClasses = "flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-neutral-700";

    const getOverallStatusMessage = () => {
        const statusMap = {
            all_passed: isCorrectApproach ? { msg: "Accepted", cls: 'text-green-500' } : { msg: "Wrong Answer", cls: 'text-red-500' },
            some_failed: { msg: "Wrong Answer", cls: 'text-red-500' },
            compilation_error: { msg: "Compilation Error", cls: 'text-red-500' },
            runtime_error: { msg: "Runtime Error", cls: 'text-red-500' },
            wrong_approach: { msg: "Wrong Answer", cls: 'text-red-500' },
        };
        return statusMap[overallStatus] || null;
    };

    const renderHeaderButton = (tab, icon, label) => {
        const { buttonCls, iconCls } = getHeaderButtonClasses(activeTab === tab);
        return (
            <button
                className={`${headerButtonBaseClasses} ${buttonCls}`}
                onClick={() => setActiveTab(tab)}
            >
                {React.cloneElement(icon, { size: 14, className: `${iconCls} flex-shrink-0` })}
                {label}
            </button>
        );
    };

    return (
        <div className={`shadow-lg flex flex-col bg-[#1e1e1e] ${className}`}>
            <div className={clsx(
                "h-10 px-4 flex items-center gap-1 select-none flex-shrink-0 border-b rounded-t-xl",
                "bg-[#2e2e2e] border-neutral-700 text-neutral-200"
            )}>
                {renderHeaderButton('cases', <FiList />, 'Test Cases')}
                <div className="w-px h-5 bg-neutral-500"></div>
                {renderHeaderButton('results', <FiCheckSquare />, 'Test Results')}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 text-neutral-300">
                {activeTab === 'cases' && (
                    <div>
                        {casesToDisplay.length > 0 ? (
                            <>
                                <div className={buttonContainerClasses}>
                                    {casesToDisplay.map((testCase, index) => (
                                        <button
                                            key={testCase.id || index}
                                            onClick={() => {
                                                setSelectedCaseIndex(index);
                                                setIsShowingHiddenInfo(false);
                                            }}
                                            className={getCaseButtonClasses(selectedCaseIndex === index && !isShowingHiddenInfo)}
                                        >
                                            Case {index + 1}
                                        </button>
                                    ))}
                                    {hiddenTestCasesCount > 0 && (
                                        <button
                                            onClick={() => {
                                                setSelectedCaseIndex(null);
                                                setIsShowingHiddenInfo(true);
                                            }}
                                            className={getCaseButtonClasses(isShowingHiddenInfo)}
                                            title={`${hiddenTestCasesCount} hidden test ${hiddenTestCasesCount === 1 ? "case" : "cases"} will also be run`}
                                        >
                                            Hidden Cases: {hiddenTestCasesCount}
                                        </button>
                                    )}
                                </div>
                                {!isShowingHiddenInfo && selectedCaseIndex !== null && selectedCaseIndex < casesToDisplay.length && (
                                    <TestCaseDetail
                                        testCase={casesToDisplay[selectedCaseIndex]}
                                        codeBlockClasses={codeBlockClasses}
                                    />
                                )}
                                {isShowingHiddenInfo && (
                                    <div className="p-3 rounded-md text-xs bg-neutral-700 border border-neutral-600 mt-2">
                                        <p className="font-semibold">These test cases are hidden.</p>
                                        <p className="mt-1">
                                            Your solution will be evaluated against {hiddenTestCasesCount} additional hidden test {hiddenTestCasesCount === 1 ? "case" : "cases"} to ensure its robustness and correctness across a wider range of scenarios.
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-xs opacity-70 p-3">No test cases specified for this problem.</p>
                        )}
                    </div>
                )}
                {activeTab === 'results' && (
                    <>
                        {isRunning && (
                            <div className="flex flex-col justify-center items-center h-full text-neutral-400">
                                <FiLoader className="animate-spin text-2xl mb-2" />
                                <p className="text-sm">Running tests...</p>
                            </div>
                        )}
                        {!isRunning && results.length === 0 && (
                            <div className="flex flex-col justify-center items-center h-full text-neutral-400">
                                <p className="text-sm">
                                    {overallStatus === 'error_fetching_test_cases' || overallStatus === 'no_test_cases_found'
                                        ? "No test cases found or an error occurred fetching them."
                                        : "You must run your code to see the results."}
                                </p>
                            </div>
                        )}
                        {!isRunning && (results.length > 0 || overallStatus === 'compilation_error' || overallStatus === 'runtime_error') && (
                            <div className="space-y-3">
                                {(() => {
                                    const status = getOverallStatusMessage();
                                    return status ? <p className={`text-2xl font-semibold mb-3 ${status.cls}`}>{status.msg}</p> : null;
                                })()}

                                {results.length > 0 && (
                                    <div className={buttonContainerClasses}>
                                        {results.map((result, index) => (
                                            <button
                                                key={result.test_case_id || index}
                                                onClick={() => {
                                                    setSelectedResultIndex(index);
                                                    setShowAiFeedbackView(false);
                                                }}
                                                className={`${getCaseButtonClasses(selectedResultIndex === index && !showAiFeedbackView)} flex items-center`}
                                            >
                                                {(result.status === 'pass' || result.status === 'fail') && (
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${result.status === 'pass' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                )}
                                                Case {index + 1}
                                            </button>
                                        ))}

                                        {!isRunning && hiddenTestSummary.total > 0 && (
                                            <div className={`${getCaseButtonClasses(false)} flex items-center cursor-default`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${hiddenTestSummary.passed === hiddenTestSummary.total ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                Hidden Tests: {hiddenTestSummary.passed}/{hiddenTestSummary.total}
                                            </div>
                                        )}

                                        {approachFeedback && !isRunning && (overallStatus === 'all_passed' || overallStatus === 'some_failed' || overallStatus === 'wrong_approach') && (
                                            <button
                                                onClick={() => {
                                                    setShowAiFeedbackView(true);
                                                    setSelectedResultIndex(null);
                                                }}
                                                className={`${getCaseButtonClasses(showAiFeedbackView)} flex items-center`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${isCorrectApproach ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                AI Assessment
                                            </button>
                                        )}
                                    </div>
                                )}

                                {showAiFeedbackView && approachFeedback && (
                                    <div className="p-3 rounded-md text-xs bg-blue-900/30 border-blue-700/50 mt-2">
                                        <p className="text-sm font-medium mb-1">AI Feedback on Approach:</p>
                                        {approachFeedback.split(/[\r\n]+/).filter(ln => ln.trim()).map((ln, i) => ( // split on newlines
                                            <p key={i} className="text-xs whitespace-pre-wrap mb-1 last:mb-0">{ln}</p>
                                        ))}
                                    </div>
                                )}

                                {selectedResultIndex !== null && selectedResultIndex < results.length && !showAiFeedbackView && (
                                    <TestResultDetail
                                        result={results[selectedResultIndex]}
                                        codeBlockClasses={codeBlockClasses}
                                    />
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
