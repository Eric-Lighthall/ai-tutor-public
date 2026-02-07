import { Router, IRequest } from 'itty-router';
import { runChatStream, ChatMessage } from '../lib/chat';

export interface Env {
    TOGETHER_API_KEY: string;
    SYSTEM_PROMPTS_KV: KVNamespace;
}

// Message and Request Body interfaces
interface ClientMessage {
    role: 'user' | 'assistant'; // General chat might not use 'tool' role from client
    content: string;
}

interface RequestBody {
    session_id: string; // For session tracking
    chat_history: ClientMessage[];
}

// Response constants
const AI_BACKEND_NOT_CONFIGURED_MESSAGE = "AI backend not configured.";
const INVALID_JSON_BODY_MESSAGE = "Invalid JSON body.";
const MISSING_REQUIRED_FIELDS_MESSAGE = "Missing required fields: session_id, chat_history.";
const SYSTEM_PROMPT_NOT_FOUND_MESSAGE = "General chat system prompt not found.";
const GENERAL_CHAT_SYSTEM_PROMPT_KEY = "general-chat";

// Utility to create a simple error response
function createErrorResponse(message: string, status: number): Response {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

// Validate request body
function validateRequestBody(body: any): { data: RequestBody | null; error: Response | null } {
    if (!body || typeof body !== 'object') {
        return { data: null, error: createErrorResponse(INVALID_JSON_BODY_MESSAGE, 400) };
    }
    if (!body.session_id || typeof body.session_id !== 'string' || body.session_id.trim() === '') {
        return { data: null, error: createErrorResponse(MISSING_REQUIRED_FIELDS_MESSAGE, 400) };
    }
    if (!Array.isArray(body.chat_history)) {
        return { data: null, error: createErrorResponse(MISSING_REQUIRED_FIELDS_MESSAGE, 400) };
    }
    // Optional: Validate chat_history contents further if needed
    if (body.chat_history.length > 0 && body.chat_history[body.chat_history.length - 1].role !== 'user') {
        return { data: null, error: createErrorResponse('Chat history must end with a user message.', 400)};
    }
    return { data: body as RequestBody, error: null };
}


export const generalChatRouter = Router({ base: '/v1/chat' });

generalChatRouter.post('/general', async (request: IRequest, env: Env) => {
    if (!env.TOGETHER_API_KEY) {
        return createErrorResponse(AI_BACKEND_NOT_CONFIGURED_MESSAGE, 503);
    }

    let parsedBody: RequestBody | null;
    try {
        const rawBody = await request.json();
        const validation = validateRequestBody(rawBody);
        if (validation.error) {
            return validation.error;
        }
        parsedBody = validation.data;
    } catch (err) {
        return createErrorResponse(INVALID_JSON_BODY_MESSAGE, 400);
    }
    
    if (!parsedBody) {
        // Should have been caught by validation, but as a safeguard
        return createErrorResponse(INVALID_JSON_BODY_MESSAGE, 400);
    }

    const { chat_history } = parsedBody;

    const systemPromptContent = await env.SYSTEM_PROMPTS_KV.get(GENERAL_CHAT_SYSTEM_PROMPT_KEY);
    if (!systemPromptContent) {
        console.error(`System prompt not found for key: ${GENERAL_CHAT_SYSTEM_PROMPT_KEY}`);
        return createErrorResponse(SYSTEM_PROMPT_NOT_FOUND_MESSAGE, 404);
    }

    const systemMessage: ChatMessage = {
        role: 'system',
        content: systemPromptContent,
    };

    // Ensure client messages conform to ChatMessage type, particularly the role
    const conversationMessages: ChatMessage[] = [
        systemMessage,
        ...chat_history.map(msg => ({ role: msg.role, content: msg.content } as ChatMessage))
    ];

    try {
        const completionStream = await runChatStream(env.TOGETHER_API_KEY, conversationMessages);
        
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of completionStream) {
                        const delta = chunk.choices?.[0]?.delta?.content || '';
                        if (delta) {
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
                            );
                        }
                    }
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                } catch (err: any) {
                    console.error("Error during stream processing:", err.message, err.stack);
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: "Stream processing error.", details: err.message })}\n\n`)
                    );
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error("Error calling runChatStream:", error.message, error.stack);
        return createErrorResponse(`Failed to start chat stream: ${error.message}`, 500);
    }
}); 