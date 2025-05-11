import { Router } from 'itty-router';
import { runChatStream, runChatCompletion } from '../lib/chat';

export interface Env {
    TOGETHER_API_KEY: string;
    SYSTEM_PROMPTS_KV: KVNamespace;
}

interface ClientMessage {
    role: 'user' | 'assistant' | 'tool';
    content: string;
}

interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
}

interface RequestBody {
    session_id: string;
    problem_id: string;
    step_id: string;
    chat_history: ClientMessage[];
}

function validateRequestBody(body: RequestBody): Response | null {
    if (!body.session_id?.trim()) {
        return new Response('session_id must be non-empty', { status: 400 });
    }
    if (!body.problem_id?.trim()) {
        return new Response('problem_id must be non-empty', { status: 400 });
    }
    if (!body.step_id?.trim()) {
        return new Response('step_id must be non-empty', { status: 400 });
    }
    if (!Array.isArray(body.chat_history)) {
        return new Response('chat_history must be an array', { status: 400 });
    }
    if (
        body.chat_history.length > 0 &&
        body.chat_history[body.chat_history.length - 1].role !== 'user'
    ) {
        return new Response('chat_history must end with a user message', {
            status: 400,
        });
    }
    return null;
}

export const tutorRouter = Router();
const evaluationTools = [
    {
        name: 'log_step_status',
        description:
            "Logs whether the user has completed the current step.",
        arguments: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['completed', 'incomplete'],
                    description:
                        "Use 'completed' if the tutor message contains an explicit confirmation (e.g., 'Excellent!', 'That's correct!'); otherwise 'incomplete'.",
                },
            },
            required: ['status'],
        },
    },
];

tutorRouter.post(
    '/v1/tutor/interact',
    async (request: Request, env: Env) => {
        if (!env.TOGETHER_API_KEY) {
            return new Response('TOGETHER_API_KEY is not set', { status: 500 });
        }

        let body: RequestBody;
        try {
            body = (await request.json()) as RequestBody;
        } 
        catch {
            return new Response('Invalid JSON', { status: 400 });
        }

        const validationError = validateRequestBody(body);
        if (validationError) {
            return validationError;
        }

        const { problem_id, step_id, chat_history } = body;

        const key = `${problem_id}_${step_id}`;
        // Get system prompt for problemid/stepid from cloudflare kv
        const systemPrompt = await env.SYSTEM_PROMPTS_KV.get(key);
        if (!systemPrompt) {
            return new Response(
                `System prompt not found for problem_id=${problem_id}, step_id=${step_id}`,
                { status: 404 }
            );
        }

        const systemMessage: ChatMessage = {
            role: 'system',
            content: systemPrompt,
        };
        const messages: ChatMessage[] = [systemMessage, ...chat_history];

        const completion = await runChatStream(env.TOGETHER_API_KEY, messages);
        let fullTutorReply = '';

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of completion) {
                        const delta = chunk.choices?.[0]?.delta?.content || '';
                        if (delta) {
                            fullTutorReply += delta;
                            controller.enqueue(
                                new TextEncoder().encode(
                                    `data: ${JSON.stringify({ content: delta })}\n\n`
                                )
                            );
                        }
                    }

                    controller.enqueue(
                        new TextEncoder().encode('data: [DONE]\n\n')
                    );

                    // Need to rework this... AI messages get mixed in with user messages
                    const evalResp = await runChatCompletion(
                        env.TOGETHER_API_KEY,
                        [
                            {
                                role: 'system',
                                content: `You are an evaluation assistant analyzing exactly one AI Tutor message.
Your task: if you see an explicit confirmation phrase directed at the learner (e.g., "Excellent!", "You got it!", "That's correct!"), call log_step_status with status="completed". Otherwise call it with status="incomplete". Default to 'incomplete' on ambiguity.`,
                            },
                            {
                                role: 'user',
                                content:
                                    "Here is the full tutor reply:\n\n" + fullTutorReply,
                            },
                        ],
                        evaluationTools,
                        { type: 'function', function: { name: 'log_step_status' } }
                    );

                    const choice = evalResp.choices?.[0];
                    const calls = choice?.message?.tool_calls;
                    let finalStatus: 'completed' | 'incomplete' = 'incomplete';

                    // Get step completion status from AIs tool call.
                    if (Array.isArray(calls) && calls.length > 0) {
                        try {
                            const args = JSON.parse(calls[0].function.arguments);
                            if (args.status === 'completed') {
                                finalStatus = 'completed';
                            }
                        } 
                        catch (e) {
                            console.error("Error parsing tool call arguments:", e);
                        }
                    }

                    // Send completion status as the last chunk in the stream
                    controller.enqueue(
                        new TextEncoder().encode(
                            `data: ${JSON.stringify({ status: finalStatus })}\n\n`
                        )
                    );
                } 
                catch (err) {
                    controller.error(err);
                } 
                finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    }
);
