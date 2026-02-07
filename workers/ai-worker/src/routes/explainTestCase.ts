import { Router, IRequest } from 'itty-router';
import { runChatStream, ChatMessage, ChatCompletionStreamParams } from '../lib/chat';

// Message constant & config
const AI_BACKEND_NOT_CONFIGURED_MESSAGE = "Server configuration issue. AI backend not configured.";
const INVALID_JSON_BODY_MESSAGE = "Invalid JSON body. Please ensure it is well-formed.";
const MISSING_REQUIRED_FIELDS_BASE_MESSAGE = "Missing required fields:";
const STREAMING_ERROR_MESSAGE = "Sorry, I encountered an error while generating the hint. Please try again.";
const STREAMING_ERROR_LOG_PREFIX = "Error during explanation hint LLM stream:";
const STREAM_DONE_MESSAGE = "[DONE]";

const CONTENT_TYPE_JSON = 'application/json';
const CONTENT_TYPE_EVENT_STREAM = 'text/event-stream';
const CACHE_CONTROL_NO_CACHE = 'no-cache';
const CONNECTION_KEEP_ALIVE = 'keep-alive';

enum HttpStatus {
    OK = 200,
    BAD_REQUEST = 400,
    INTERNAL_SERVER_ERROR = 500,
    SERVICE_UNAVAILABLE = 503,
}

// Move to KV store or azure blob storage in the future
const SYSTEM_PROMPT_CONTENT = `You are a helpful AI programming tutor providing hints for interactive exercises.
A learner submitted an incorrect answer for a specific test case.
Your task is to provide a short, guided hint based on their incorrect input, the specific parameters, and the expected output for THIS case.
DO NOT reveal the final correct answer.
DO NOT explain the user's error directly.
INSTEAD: Ask a concise question that prompts the learner to re-examine the given parameters in relation to the goal (implied by the expected output format/value) and their own answer.
If possible, subtly acknowledge their answer or potential thought process that might have led to it (e.g., 'You provided [user_input], maybe you were thinking about X?').
Keep the hint focused ONLY on the provided test case details. Be encouraging and supportive.
Example Goal: Guide the user to find the correct indices [0, 2] for nums=[4, 11, 2, 15], target=6, when they submitted [0, 1].
Example Hint: 'Okay, you suggested indices \`[0, 1]\`. Looking at \`nums = [4, 11, 2, 15]\`, what numbers are at those specific indices, and do they add up to the target \`6\`?'`;

export interface Env {
    TOGETHER_API_KEY: string;
}

interface ExplainTestCaseRequestBody {
    problem_id: string;
    step_id: string;
    given_parameters: any;
    user_input: any;
    expected_output: any;
}

interface HttpErrorPayload {
    error: string;
}

interface StreamEventData {
    explanation_chunk?: string;
    error?: string;
}

// Helper to create error response
function createHttpErrorResponse(message: string, status: HttpStatus): Response {
    const payload: HttpErrorPayload = { error: message };
    return new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': CONTENT_TYPE_JSON }
    });
}

// Helper to build user prompt for LLM
function buildUserPromptContent(problem_id: string, step_id: string, given_parameters: any, user_input: any, expected_output: any): string {
    const given_params_str = JSON.stringify(given_parameters);
    const user_input_str = JSON.stringify(user_input);
    const expected_output_str = JSON.stringify(expected_output);

    return `Problem Context: Learner is working on '${problem_id}', step '${step_id}'.

Specific Test Case Details:
- Given Parameters: ${given_params_str}
- Expected Output Hint (Goal/Format): ${expected_output_str}
- Learner's Incorrect Input: ${user_input_str}

Task: Generate a short, guided hint for the learner based on their incorrect input. The hint MUST be a question that helps them identify their mistake for this specific test case by reconsidering the 'Given Parameters' and the goal implied by the 'Expected Output Hint'. Do not reveal the final answer.`;
}

export const explainTestCaseRouter = Router();
explainTestCaseRouter.post('/v1/tutor/explain_test_case', async (request: IRequest, env: Env) => {
    if (!env.TOGETHER_API_KEY) {
        console.error("Together API key not set");
        return createHttpErrorResponse(AI_BACKEND_NOT_CONFIGURED_MESSAGE, HttpStatus.SERVICE_UNAVAILABLE);
    }

    let body: ExplainTestCaseRequestBody;
    try {
        body = await request.json();
    } 
    catch (err) {
        console.error("Invalid JSON in request body:", err);
        return createHttpErrorResponse(INVALID_JSON_BODY_MESSAGE, HttpStatus.BAD_REQUEST);
    }

    const { problem_id, step_id, given_parameters, user_input, expected_output } = body;
    const requiredFields: (keyof ExplainTestCaseRequestBody)[] = ['problem_id', 'step_id', 'given_parameters', 'user_input', 'expected_output'];
    const missingFields = requiredFields.filter(field => body[field] === undefined);
    if (missingFields.length > 0) {
        const message = `${MISSING_REQUIRED_FIELDS_BASE_MESSAGE} ${missingFields.join(', ')}`;
        console.error(message, body);
        return createHttpErrorResponse(message, HttpStatus.BAD_REQUEST);
    }

    const user_prompt_content = buildUserPromptContent(problem_id, step_id, given_parameters, user_input, expected_output);

    const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT_CONTENT },
        { role: 'user', content: user_prompt_content },
    ];

    const llmParams: ChatCompletionStreamParams = {
        temperature: 0.5,
        max_tokens: 120,
    };

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const response_stream = await runChatStream(
                    env.TOGETHER_API_KEY,
                    messages,
                    llmParams
                );

                for await (const chunk of response_stream) {
                    const content = chunk.choices?.[0]?.delta?.content;
                    if (content) {
                        const event_data: StreamEventData = { explanation_chunk: content };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event_data)}\n\n`));
                    }
                }
            }
            catch (e: any) {
                console.error(`${STREAMING_ERROR_LOG_PREFIX} ${e.stack || e}`);
                const error_payload: StreamEventData = {
                    error: `Error streaming explanation: ${e.message || String(e)}`,
                    explanation_chunk: STREAMING_ERROR_MESSAGE
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(error_payload)}\n\n`));
            }
            finally {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ explanation_chunk: STREAM_DONE_MESSAGE })}\n\n`));
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': CONTENT_TYPE_EVENT_STREAM,
            'Cache-Control': CACHE_CONTROL_NO_CACHE,
            'Connection': CONNECTION_KEEP_ALIVE,
        }
    });
});
