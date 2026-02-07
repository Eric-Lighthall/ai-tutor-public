import { Router, IRequest } from 'itty-router';
import { deepEqual } from '../utils/deepEqual'; // Make sure this utility exists
import { runChatCompletion, ChatMessage } from '../lib/chat'; // Import chat functions for evaluation

interface Env {
    TEST_CASES_KV: KVNamespace;
    TOGETHER_API_KEY: string; // Add API key requirement for evaluation
    SYSTEM_PROMPTS_KV: KVNamespace;
}

const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute";

interface PistonFile { name: string; content: string; encoding?: 'utf8' | 'hex' | 'base64'; }
interface PistonRequest { language: string; version: string; files: PistonFile[]; stdin?: string; args?: string[]; run_timeout?: number; compile_timeout?: number; }
interface PistonResponse { language: string; version: string; run: { stdout: string; stderr: string; output: string; code: number; signal: string | null; }; compile?: { stdout: string; stderr: string; output: string; code: number; signal: string | null; }; }
interface ExecuteCodeRequestBody { problem_id: string; language: string; code: string; language_version?: string; }


// Updated TestCase interface
interface TestCase {
    id: string;
    function_name?: string;
    args: any[];
    argNames?: string[];
    expected_output: any;
    is_hidden?: boolean; // New flag
    stdin?: string;
    cmd_args?: string[];
    language_version?: string;
    main_file_name?: string;
}

// TestCaseExecutionResult for visible tests
interface TestCaseExecutionResult {
    test_case_id: string;
    status: 'pass' | 'fail' | 'error' | 'compile_error' | 'timeout';
    input_args?: any[];
    input_arg_names?: string[];
    actual_output?: any;
    expected_output?: any;
    user_stdout?: string; // Added field for user's console.log/print output
    piston_stdout?: string;
    piston_stderr?: string;
    error_message?: string;
    // piston_request_payload_content?: string; // Keep for debugging if needed, but not for client
}

// Updated RouteResponse interface with tutor evaluation fields
interface RouteResponse {
    problem_id: string;
    overall_status: 'all_passed' | 'some_failed' | 'compilation_error' | 'runtime_error' | 'error_fetching_test_cases' | 'error_executing_tests' | 'no_test_cases_found' | 'wrong_approach';
    message?: string;
    test_case_results: TestCaseExecutionResult[]; // ONLY for visible tests
    hidden_tests_total_count?: number;
    hidden_tests_passed_count?: number;
    // New fields for tutor evaluation
    tutor_feedback?: string;
    incorrect_lines?: number[];
    approach_feedback?: string; // New field for approach-specific feedback
    is_correct_approach?: boolean; // New field indicating if the approach is correct
}

// Tool names for evaluation
enum AiToolName {
    CODE_CORRECT = "code_correct",
    CODE_INCORRECT = "code_incorrect",
}

// Evaluation tools configuration
const CODE_EVALUATION_TOOLS = [
    {
        type: "function",
        function: {
            name: AiToolName.CODE_CORRECT,
            description: "Call this when the learner's code fully solves the problem.",
            parameters: {
                type: "object",
                properties: {
                    message: { type: "string", description: "A short praise message." }
                },
                required: ["message"]
            },
        },
    },
    {
        type: "function",
        function: {
            name: AiToolName.CODE_INCORRECT,
            description: "Call this when the code is incorrect or incomplete.",
            parameters: {
                type: "object",
                properties: {
                    message: { type: "string", description: "Feedback with error, question, and tip." },
                    incorrect_lines: { type: "array", items: { type: "integer" }, description: "List of 1-based faulty line numbers." }
                },
                required: ["message", "incorrect_lines"]
            },
        },
    },
];

// Restore the original hardcoded system prompt
// System prompt for code evaluation
const SYSTEM_PROMPT_CONTENT = `You are a hint assistant for coding exercises.
You MUST evaluate the provided student code against the Problem Description.
Lines of code are numbered for your reference. Ensure your evaluation considers correct syntax and problem-specific logic.

Your response MUST be a call to one of the following two functions:
1. If the code correctly and fully solves the problem, you MUST call the \`${AiToolName.CODE_CORRECT}\` function.
2. If the code is incorrect, incomplete, or contains errors, you MUST call the \`${AiToolName.CODE_INCORRECT}\` function.

When calling \`${AiToolName.CODE_INCORRECT}\`, provide:
    a. A concise description of the main error.
    b. A leading question to guide the user toward the solution.
    c. Set \`incorrect_lines\` to an array of the 1-based faulty line numbers. If the error is conceptual or not tied to specific lines, use an empty array [].

Address the user directly using "you". Keep all feedback concise.
Failure to call one of these two functions is not an option.`;

// Remove the getSystemPrompt function and restore the original evaluateCode function
// New function for tutor evaluation
async function evaluateCode(apiKey: string, problemDescription: string, code: string): Promise<{feedback: string, incorrectLines: number[]}> {
    // Default return if evaluation fails
    const defaultReturn = { feedback: "", incorrectLines: [] };
    
    try {
        const messages: ChatMessage[] = [
            { role: "system", content: SYSTEM_PROMPT_CONTENT },
            { role: "user", content: `Problem Description\n${problemDescription}\n\nCode Submission:\n\`\`\`\n${code}\n\`\`\`` }
        ];
        
        const llmResponse = await runChatCompletion(apiKey, messages, CODE_EVALUATION_TOOLS);
        const toolCall = llmResponse.choices?.[0]?.message?.tool_calls?.[0];
        
        if (!toolCall || !toolCall.function || !toolCall.function.name || !toolCall.function.arguments) {
            console.error("Invalid tool call structure:", toolCall);
            return defaultReturn;
        }
        
        const args = JSON.parse(toolCall.function.arguments);
        
        if (toolCall.function.name === AiToolName.CODE_CORRECT) {
            return { feedback: args.message || "Your code is correct!", incorrectLines: [] };
        } else if (toolCall.function.name === AiToolName.CODE_INCORRECT) {
            const incorrectLines = Array.isArray(args.incorrect_lines)
                ? args.incorrect_lines.filter((n: unknown): n is number => typeof n === 'number')
                : [];
            return { feedback: args.message || "There's an issue with your code.", incorrectLines };
        }
        
        return defaultReturn;
    } catch (e: any) {
        console.error("Evaluation error during AI call:", e.message, e.stack);
        return defaultReturn;
    }
}

const DEFAULT_RUN_TIMEOUT = 3000;
const DEFAULT_COMPILE_TIMEOUT = 10000;
const DEFAULT_FUNCTION_NAME = "solution";

function getPistonLanguageVersion(language: string, requestedVersion?: string): string {
    if (requestedVersion) return requestedVersion;
    const defaultVersions: { [key: string]: string } = { python: '3.10.0', javascript: '18.15.0', java: '15.0.2', cpp: '10.2.0', csharp: '6.12.0' };
    return defaultVersions[language.toLowerCase()] || 'latest';
}

function getMainFileName(language: string, requestedFileName?: string): string {
    if (requestedFileName) return requestedFileName;
    const defaultFileNames: { [key: string]: string } = { python: 'main.py', javascript: 'index.js', java: 'Main.java', csharp: 'program.cs', cpp: 'main.cpp' };
    return defaultFileNames[language.toLowerCase()] || `source.${language.split(/[^a-zA-Z0-9]/)[0] || 'txt'}`;
}

function generatePythonDriver(userCode: string, functionName: string, funcArgs: any[]): string {
    const argsString = funcArgs.map(arg => JSON.stringify(arg)).join(', ');
    return `import sys
import json
import io

# Include user code unmodified
${userCode}

# Now capture stdout for function execution
original_stdout = sys.stdout
user_stdout_capture = io.StringIO()

try:
    # Capture stdout during function execution
    sys.stdout = user_stdout_capture
    
    # Execute the function with the given arguments
    result = ${functionName}(${argsString})
    
    # Reset stdout before output
    sys.stdout = original_stdout
    
    # Get the captured user output
    user_stdout = user_stdout_capture.getvalue()
    
    # Output the function result and user stdout with separators
    print("__FUNCTION_RETURN_VALUE_SEPARATOR__")
    print(json.dumps(result))
    print("__USER_STDOUT_SEPARATOR__")
    print(user_stdout, end="")
    
except Exception as e:
    # Reset stdout and report error
    sys.stdout = original_stdout
    print(str(e), file=sys.stderr)
finally:
    # Ensure stdout is reset
    sys.stdout = original_stdout`;
}

function generateJavaScriptDriver(userCode: string, functionName: string, funcArgs: any[]): string {
    const argsString = funcArgs.map(arg => JSON.stringify(arg)).join(', ');
    return `// Include user code unmodified
${userCode}

// Setup for capturing console.log output
const originalConsoleLog = console.log;
let userLogs = [];

try {
    // Replace console.log to capture user output
    console.log = function() {
        const args = Array.from(arguments);
        userLogs.push(args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '));
    };
    
    // Call function and get return value
    const result = ${functionName}(${argsString});
    
    // Restore original console.log before output
    console.log = originalConsoleLog;
    
    // Output the function result and user logs with separators
    console.log("__FUNCTION_RETURN_VALUE_SEPARATOR__");
    console.log(JSON.stringify(result));
    console.log("__USER_STDOUT_SEPARATOR__");
    if (userLogs.length > 0) {
        console.log(userLogs.join('\\n'));
    }
} catch (e) {
    // Restore original console.log and report error
    console.log = originalConsoleLog;
    console.error(e.toString());
} finally {
    // Ensure console.log is restored
    console.log = originalConsoleLog;
}`;
}

// Define a new tool for approach validation
const APPROACH_VALIDATION_TOOLS = [
    {
        type: "function",
        function: {
            name: "correct_approach",
            description: "Call this when the code implements the correct approach for the problem step.",
            parameters: {
                type: "object",
                properties: {
                    message: { type: "string", description: "A short message confirming the approach is correct." }
                },
                required: ["message"]
            },
        },
    },
    {
        type: "function",
        function: {
            name: "wrong_approach",
            description: "Call this when the code implements a different approach than what's expected for this step.",
            parameters: {
                type: "object",
                properties: {
                    message: { type: "string", description: "Feedback explaining why the approach is incorrect for this step and what approach was expected." }
                },
                required: ["message"]
            },
        },
    },
];

// Function to get approach validation prompt from KV
async function getApproachPrompt(problemId: string, env: Env): Promise<string | null> {
    try {
        const promptKey = `approach_${problemId}`;
        return await env.SYSTEM_PROMPTS_KV.get(promptKey);
    } catch (error) {
        console.warn(`Error fetching approach prompt for ${problemId}:`, error);
        return null;
    }
}

// Function to evaluate if the solution uses the correct approach
async function evaluateApproach(
    apiKey: string, 
    problemId: string, 
    code: string, 
    prompt: string,
    testOutcomeSummary: string
): Promise<{isCorrectApproach: boolean, feedback: string}> {
    // Default return
    const defaultReturn = { isCorrectApproach: true, feedback: "Approach validation skipped." };
    
    try {
        const messages: ChatMessage[] = [
            { role: "system", content: prompt },
            { role: "user", content: `${testOutcomeSummary}\n\nCode Submission:\n\`\`\`\n${code}\n\`\`\`` }
        ];
        
        const llmResponse = await runChatCompletion(apiKey, messages, APPROACH_VALIDATION_TOOLS);
        const toolCall = llmResponse.choices?.[0]?.message?.tool_calls?.[0];
        
        if (!toolCall || !toolCall.function || !toolCall.function.name || !toolCall.function.arguments) {
            console.error("Invalid tool call structure in approach validation:", toolCall);
            return defaultReturn;
        }
        
        const args = JSON.parse(toolCall.function.arguments);
        
        if (toolCall.function.name === "correct_approach") {
            return { 
                isCorrectApproach: true, 
                feedback: args.message || "Your solution uses the correct approach." 
            };
        } else if (toolCall.function.name === "wrong_approach") {
            return { 
                isCorrectApproach: false, 
                feedback: args.message || "Your solution uses an incorrect approach for this step." 
            };
        }
        
        return defaultReturn;
    } catch (e: any) {
        console.error("Error during approach evaluation:", e.message, e.stack);
        return defaultReturn;
    }
}

const router = Router({ base: '/v1/execute/code' });

router.post('/run', async (request: IRequest, env: Env) => {
    let body: ExecuteCodeRequestBody;
    try { body = await request.json(); } catch (err) {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { 'Content-Type': 'application/json' }});
    }

    const { problem_id, language, code: userProvidedCode, language_version: problemLanguageVersion } = body;
    if (!problem_id || !language || typeof userProvidedCode !== 'string') {
        return new Response(JSON.stringify({ error: "Missing required fields: problem_id, language, code" }), { status: 400, headers: { 'Content-Type': 'application/json' }});
    }
    if (!env.TEST_CASES_KV) {
        console.error("TEST_CASES_KV binding is not configured.");
        return new Response(JSON.stringify({ error: "Server configuration error: Test case store not available." }), { status: 500, headers: { 'Content-Type': 'application/json' }});
    }

    let kValueTestCases: TestCase[];
    try {
        const kvValue = await env.TEST_CASES_KV.get(problem_id);
        if (!kvValue) {
            return new Response(JSON.stringify({ problem_id, overall_status: 'error_fetching_test_cases', message: `Test cases not found for problem_id: ${problem_id}`, test_case_results: [] } as RouteResponse), { status: 404, headers: { 'Content-Type': 'application/json' }});
        }
        kValueTestCases = JSON.parse(kvValue);
        if (!Array.isArray(kValueTestCases)) { // No specific check for kValueTestCases.length === 0 here, will be handled by counters
            throw new Error("Test case data is not an array or is improperly formatted.");
        }
    } catch (e: any) {
        console.error(`Error fetching/parsing test cases for ${problem_id}: ${e.message}`);
        return new Response(JSON.stringify({ problem_id, overall_status: 'error_fetching_test_cases', message: `Error processing test cases: ${e.message}`, test_case_results: [] } as RouteResponse), { status: 500, headers: { 'Content-Type': 'application/json' }});
    }

    const visibleTestCaseResults: TestCaseExecutionResult[] = [];
    let hiddenTestsTotalCount = 0;
    let hiddenTestsPassedCount = 0;
    let hasCompilationError = false;
    let hasRuntimeErrorDuringAnyTest = false; // Tracks runtime errors across all tests
    let anyTestFailedOverall = false; // Tracks if any test (visible or hidden) failed logically

    if (kValueTestCases.length === 0) {
         return new Response(JSON.stringify({
            problem_id,
            overall_status: 'no_test_cases_found',
            message: 'No test cases found for this problem.',
            test_case_results: [],
            hidden_tests_total_count: 0,
            hidden_tests_passed_count: 0
        } as RouteResponse), { headers: { 'Content-Type': 'application/json' }});
    }


    for (const tc of kValueTestCases) {
        if (tc.is_hidden) {
            hiddenTestsTotalCount++;
        }

        const effectiveLanguageVersion = tc.language_version || problemLanguageVersion || getPistonLanguageVersion(language);
        const mainFileName = getMainFileName(language, tc.main_file_name);
        const functionNameToCall = tc.function_name || DEFAULT_FUNCTION_NAME;
        let fullScriptContent = "";

        if (language.toLowerCase() === 'python') {
            fullScriptContent = generatePythonDriver(userProvidedCode, functionNameToCall, tc.args);
        } else if (language.toLowerCase() === 'javascript') {
            fullScriptContent = generateJavaScriptDriver(userProvidedCode, functionNameToCall, tc.args);
        } else {
            const errorResult: TestCaseExecutionResult = {
                test_case_id: tc.id, status: 'error',
                error_message: `Language "${language}" driver not implemented.`,
                expected_output: tc.is_hidden ? undefined : tc.expected_output, // Only show expected for visible on this type of error
            };
            if (!tc.is_hidden) visibleTestCaseResults.push(errorResult);
            anyTestFailedOverall = true; // Consider this a failure
            continue; // Skip Piston call for this test case
        }

        const pistonPayload: PistonRequest = {
            language: language, version: effectiveLanguageVersion,
            files: [{ name: mainFileName, content: fullScriptContent }],
            stdin: tc.stdin || "", args: tc.cmd_args || [],
            run_timeout: DEFAULT_RUN_TIMEOUT, compile_timeout: DEFAULT_COMPILE_TIMEOUT,
        };

        let currentTestStatus: TestCaseExecutionResult['status'] = 'fail'; // Default before evaluation
        let actualOutputForComparison: any = null;
        let pistonStdout = "";
        let pistonStderr = "";
        let userStdout = ""; // Declare this here so it's accessible throughout the function

        try {
            const pistonApiResponse = await fetch(PISTON_API_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pistonPayload),
            });
            const responseData: PistonResponse = await pistonApiResponse.json();
            pistonStdout = responseData.run?.stdout || "";
            pistonStderr = responseData.run?.stderr || ""; // Capture run stderr first

            if (responseData.compile && responseData.compile.stderr) {
                currentTestStatus = 'compile_error';
                hasCompilationError = true;
                pistonStderr = responseData.compile.stderr; // Prioritize compile stderr
            } else if (responseData.run.stderr) { // Runtime error in user code or driver
                currentTestStatus = 'error';
                hasRuntimeErrorDuringAnyTest = true;
            } else if (responseData.run.code !== 0) { // Non-zero exit code without explicit stderr
                currentTestStatus = 'error';
                hasRuntimeErrorDuringAnyTest = true;
                pistonStderr = pistonStderr || `Exited with code ${responseData.run.code}`; // Augment stderr
            } else { // Attempt to parse output and compare
                // Extract function return value and user stdout using the separators
                let functionReturnValue = "";
                
                if (pistonStdout) {
                    // Split the stdout by our separators
                    const parts = pistonStdout.split("__FUNCTION_RETURN_VALUE_SEPARATOR__");
                    
                    if (parts.length >= 2) {
                        // Anything before the first separator might be unexpected stdout
                        // The actual function return is after the separator
                        const returnAndUserStdout = parts[1].split("__USER_STDOUT_SEPARATOR__");
                        
                        if (returnAndUserStdout.length >= 2) {
                            functionReturnValue = returnAndUserStdout[0].trim();
                            userStdout = returnAndUserStdout[1].trim();
                        } else {
                            // No user stdout separator found
                            functionReturnValue = returnAndUserStdout[0].trim();
                        }
                    } else {
                        // No separator found, use entire stdout as the return value
                        functionReturnValue = pistonStdout.trim();
                    }
                }
                
                try {
                    actualOutputForComparison = JSON.parse(functionReturnValue);
                } catch (e) {
                    actualOutputForComparison = functionReturnValue; // Treat as raw string if not JSON
                    console.warn(`TC ${tc.id} for ${problem_id}: Function return value was not valid JSON. Output: "${functionReturnValue}"`);
                }
                
                if (deepEqual(actualOutputForComparison, tc.expected_output)) {
                    currentTestStatus = 'pass';
                } else {
                    currentTestStatus = 'fail';
                }
                
                // Save the user stdout for display in the UI
                // Don't overwrite pistonStdout, keep it as the original output
                // and use userStdout for the user's console.log/print output
            }
        } catch (e: any) {
            console.error(`Error processing Piston API for TC ${tc.id}: ${e.message}`);
            currentTestStatus = 'error'; // Error in our communication or parsing
            pistonStderr = `Worker error: ${e.message}`;
            hasRuntimeErrorDuringAnyTest = true; // Treat this as a runtime problem for this test.
        }

        if (currentTestStatus !== 'pass') {
            anyTestFailedOverall = true;
        }

        if (tc.is_hidden) {
            if (currentTestStatus === 'pass') {
                hiddenTestsPassedCount++;
            }
        } else {
            visibleTestCaseResults.push({
                test_case_id: tc.id,
                status: currentTestStatus,
                input_args: tc.args,
                input_arg_names: tc.argNames,
                actual_output: (currentTestStatus === 'fail' || currentTestStatus === 'pass') ? actualOutputForComparison : undefined,
                expected_output: tc.expected_output,
                user_stdout: (currentTestStatus === 'fail' || currentTestStatus === 'pass') ? userStdout : undefined,
                piston_stdout: pistonStdout,
                piston_stderr: pistonStderr,
                error_message: (currentTestStatus === 'error' && !pistonStderr) ? "An unexpected error occurred during execution." : undefined,
            });
        }
        if (hasCompilationError) break; // Stop all further tests on first compile error
    }

    let overallFinalStatus: RouteResponse['overall_status'];
    let responseMessage = "";

    if (hasCompilationError) {
        overallFinalStatus = 'compilation_error';
        responseMessage = 'Your code failed to compile.';
    } else if (hasRuntimeErrorDuringAnyTest) {
        overallFinalStatus = 'runtime_error';
        responseMessage = 'Your code encountered an error during execution on one or more test cases.';
    } else if (anyTestFailedOverall) {
        overallFinalStatus = 'some_failed';
        responseMessage = 'Your solution did not pass all test cases.';
    } else {
        overallFinalStatus = 'all_passed';
        responseMessage = 'Congratulations! Your solution passed all test cases.';
    }
    
    if (kValueTestCases.length === 0 && overallFinalStatus === 'all_passed') { // Should be caught by 'no_test_cases_found' earlier
        overallFinalStatus = 'no_test_cases_found';
        responseMessage = 'No test cases were configured for this problem.';
    }

    // Before determining overall status and building the response
    // Add an additional check for approach validation
    let approachFeedback = "";
    let isCorrectApproach = true;
    
    // After test execution but before building the final response, check approach if:
    // 1. There were no compilation/runtime errors
    // 2. We have API key available
    // 3. There's an approach prompt for this problem
    if (!hasCompilationError && 
        !hasRuntimeErrorDuringAnyTest && 
        env.TOGETHER_API_KEY) {
        
        // Try to get approach prompt
        const approachPrompt = await getApproachPrompt(problem_id, env);
        
        if (approachPrompt) {
            // Construct the test outcome summary
            const visibleTestsPassedCount = visibleTestCaseResults.filter(r => r.status === 'pass').length;
            const visibleTestsTotalCount = visibleTestCaseResults.length;
            const hiddenTestsSummaryString = `Hidden tests: ${hiddenTestsPassedCount}/${hiddenTestsTotalCount} passed.`;
            const visibleTestsSummaryString = `Visible tests: ${visibleTestsPassedCount}/${visibleTestsTotalCount} passed.`;
            const fullTestOutcomeSummary = `${visibleTestsSummaryString} ${hiddenTestsSummaryString}`;

            console.log(`Validating approach for ${problem_id}`);
            const approachResult = await evaluateApproach(
                env.TOGETHER_API_KEY,
                problem_id,
                userProvidedCode,
                approachPrompt,
                fullTestOutcomeSummary
            );
            
            isCorrectApproach = approachResult.isCorrectApproach;
            approachFeedback = approachResult.feedback;
            
            // If approach is incorrect, override the overall status and message
            if (!isCorrectApproach) {
                overallFinalStatus = 'wrong_approach';
                responseMessage = 'Your solution passed the tests but doesn\'t use the expected approach.';
            }
        }
    }
    
    // Now handle the regular evaluation logic for wrong answers
    let tutorFeedback = "";
    let incorrectLines: number[] = [];
    
    if ((overallFinalStatus === 'some_failed' || overallFinalStatus === 'wrong_approach') && 
        env.TOGETHER_API_KEY) {
        try {
            // Attempt to extract problem description from KV
            let problemDescription = "Solve the programming problem.";
            try {
                const problemData = await env.TEST_CASES_KV.get(`${problem_id}_description`);
                if (problemData) {
                    problemDescription = problemData;
                }
            } catch (e) {
                console.warn(`Could not fetch problem description for ${problem_id}`);
            }
            
            // If it's a wrong approach but tests pass, use the approach feedback instead
            if (overallFinalStatus === 'wrong_approach' && approachFeedback) {
                tutorFeedback = approachFeedback;
            } else {
                // Otherwise do normal evaluation
                const evaluationResult = await evaluateCode(env.TOGETHER_API_KEY, problemDescription, userProvidedCode);
                tutorFeedback = evaluationResult.feedback;
                incorrectLines = evaluationResult.incorrectLines;
            }
        } catch (e) {
            console.error("Error during tutor evaluation:", e);
        }
    }
    
    // Build the final response with all information
    const response: RouteResponse = {
        problem_id,
        overall_status: overallFinalStatus,
        message: responseMessage,
        test_case_results: visibleTestCaseResults,
        hidden_tests_total_count: hiddenTestsTotalCount,
        hidden_tests_passed_count: hiddenTestsPassedCount,
    };
    
    // Add additional fields if they exist
    if (tutorFeedback) {
        response.tutor_feedback = tutorFeedback;
    }
    
    if (incorrectLines.length > 0) {
        response.incorrect_lines = incorrectLines;
    }
    
    if (approachFeedback) {
        response.approach_feedback = approachFeedback;
        response.is_correct_approach = isCorrectApproach;
    }
    
    return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
    });
});

export { router as executeCodeRouter, generatePythonDriver, generateJavaScriptDriver };
// Remember to have src/utils/deepEqual.ts or import a library for it.
