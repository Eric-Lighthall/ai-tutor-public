import { Router, IRequest } from 'itty-router';
import { runChatCompletion, ChatMessage } from '../lib/chat';

// Message constants & config
const AI_BACKEND_NOT_CONFIGURED_MESSAGE = "AI backend not configured.";
const INVALID_JSON_BODY_MESSAGE = "Invalid JSON body";
const MISSING_REQUIRED_FIELDS_MESSAGE = "Missing required fields";
const EVALUATION_FAILED_BASE_MESSAGE = "Evaluation failed";
const NO_TOOL_CALL_MESSAGE = "No tool call received from AI";
const UNKNOWN_TOOL_MESSAGE_PREFIX = "Unknown tool";
const DEFAULT_CORRECT_MESSAGE = "Your code is correct!";
const DEFAULT_INCORRECT_MESSAGE = "There's an issue with your code.";

enum HttpStatus {
    OK = 200,
    BAD_REQUEST = 400,
    INTERNAL_SERVER_ERROR = 500,
    SERVICE_UNAVAILABLE = 503,
}

const CONTENT_TYPE_JSON = 'application/json';

enum AiToolName {
    CODE_CORRECT = "code_correct",
    CODE_INCORRECT = "code_incorrect",
}

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

// Move to KV store or azure blob storage in the future
const SYSTEM_PROMPT_CONTENT = `You are a hint assistant for introductory Python exercises.
You MUST evaluate the provided student code against the Problem Description.
Lines of code are numbered for your reference. Ensure your evaluation considers correct Python syntax and problem-specific logic.

Your response MUST be a call to one of the following two functions:
1. If the code correctly and fully solves the problem, you MUST call the \`${AiToolName.CODE_CORRECT}\` function.
2. If the code is incorrect, incomplete, or contains errors, you MUST call the \`${AiToolName.CODE_INCORRECT}\` function.

When calling \`${AiToolName.CODE_INCORRECT}\`, provide:
    a. A concise description of the main error.
    b. A leading question to guide the user toward the solution.
    c. Set \`incorrect_lines\` to an array of the 1-based faulty line numbers. If the error is conceptual or not tied to specific lines, use an empty array [].

Address the user directly using "you". Keep all feedback concise.
Failure to call one of these two functions is not an option.`;


export interface Env {
    TOGETHER_API_KEY: string;
}

interface CodeEvaluationRequestBody {
    session_id: string;
    problem_id: string;
    step_id: string;
    code: string;
    problem_description: string;
}

interface ErrorResponsePayload {
    result: "error";
    message: string;
    incorrect_lines: [];
}

interface SuccessResponsePayload {
    result: "correct" | "incorrect";
    message: string;
    incorrect_lines: number[];
}


function createJsonResponse(payload: ErrorResponsePayload | SuccessResponsePayload, status: HttpStatus): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': CONTENT_TYPE_JSON }
    });
}

function createErrorResponse(message: string, status: HttpStatus): Response {
    return createJsonResponse({ result: "error", message, incorrect_lines: [] }, status);
}

async function parseAndValidateRequestBody(request: IRequest): Promise<{ body: CodeEvaluationRequestBody | null; errorResponse: Response | null }> {
    let body: CodeEvaluationRequestBody;
    try {
        body = await request.json();
    } 
    catch (err) {
        return { body: null, errorResponse: createErrorResponse(INVALID_JSON_BODY_MESSAGE, HttpStatus.BAD_REQUEST) };
    }

    const { session_id, problem_id, step_id, code, problem_description } = body;
    if (!session_id || !problem_id || !step_id || typeof code !== 'string' || !problem_description) {
        return { body: null, errorResponse: createErrorResponse(MISSING_REQUIRED_FIELDS_MESSAGE, HttpStatus.BAD_REQUEST) };
    }
    return { body, errorResponse: null };
}

function buildAiMessages(problemDescription: string, code: string): ChatMessage[] {
    return [
        { role: 'system', content: SYSTEM_PROMPT_CONTENT },
        { role: 'user', content: `Problem Description\\n${problemDescription}\\n\\nCode Submission:\\n\`\`\`python\\n${code}\\n\`\`\`` }
    ];
}

function processLlmToolCall(toolCall: any): Response {
    if (!toolCall || !toolCall.function || !toolCall.function.name || !toolCall.function.arguments) {
        console.error("Invalid tool call structure:", toolCall);
        return createErrorResponse(`${EVALUATION_FAILED_BASE_MESSAGE}: ${NO_TOOL_CALL_MESSAGE}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    let args: any;
    try {
        args = JSON.parse(toolCall.function.arguments);
    } 
    catch (parseError: any) {
        console.error("Failed parsing tool call args:", parseError.message, toolCall.function.arguments);
        return createErrorResponse(`${EVALUATION_FAILED_BASE_MESSAGE}: Invalid AI response format.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    // evaluate the tool call
    switch (toolCall.function.name) {
        case AiToolName.CODE_CORRECT:
            return createJsonResponse({
                result: "correct",
                message: args.message || DEFAULT_CORRECT_MESSAGE,
                incorrect_lines: []
            }, HttpStatus.OK);
        case AiToolName.CODE_INCORRECT:
            const incorrectLines = Array.isArray(args.incorrect_lines)
                ? args.incorrect_lines.filter((n: unknown): n is number => typeof n === 'number')
                : [];
            return createJsonResponse({
                result: "incorrect",
                message: args.message || DEFAULT_INCORRECT_MESSAGE,
                incorrect_lines: incorrectLines
            }, HttpStatus.OK);
        default:
            console.error(`${UNKNOWN_TOOL_MESSAGE_PREFIX}: ${toolCall.function.name}`);
            return createErrorResponse(`${EVALUATION_FAILED_BASE_MESSAGE}: ${UNKNOWN_TOOL_MESSAGE_PREFIX} '${toolCall.function.name}'.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}


export const tutorEvaluateRouter = Router();
tutorEvaluateRouter.post('/v1/tutor/evaluate', async (request: IRequest, env: Env) => {
    if (!env.TOGETHER_API_KEY) {
        return createErrorResponse(AI_BACKEND_NOT_CONFIGURED_MESSAGE, HttpStatus.SERVICE_UNAVAILABLE);
    }
    const { body, errorResponse } = await parseAndValidateRequestBody(request);
    if (errorResponse) {
        return errorResponse;
    }
    const validBody = body!;
    const messages = buildAiMessages(validBody.problem_description, validBody.code);
    try {
        const llmResponse = await runChatCompletion(env.TOGETHER_API_KEY, messages, CODE_EVALUATION_TOOLS);
        const toolCall = llmResponse.choices?.[0]?.message?.tool_calls?.[0];

        if (!toolCall) {
            console.error("No tool call received in LLM response:", llmResponse);
            return createErrorResponse(`${EVALUATION_FAILED_BASE_MESSAGE}: ${NO_TOOL_CALL_MESSAGE}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return processLlmToolCall(toolCall);
    } 
    catch (e: any) {
        console.error("Evaluation error during AI call:", e.message, e.stack);
        return createErrorResponse(`${EVALUATION_FAILED_BASE_MESSAGE}: ${e.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
});
