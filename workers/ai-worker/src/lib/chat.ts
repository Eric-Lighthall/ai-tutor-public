import { Together } from 'together-ai';

export type ChatMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
};

export interface ChatCompletionStreamParams {
    temperature?: number;
    max_tokens?: number;
    model?: string;
}

// Runs streaming chat completion for chat responses / test case explanations
export async function runChatStream(
    apiKey: string,
    messages: ChatMessage[],
    params?: ChatCompletionStreamParams
) {
    const together = new Together({ apiKey });
    return together.chat.completions.create({
        model: params?.model || 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
        messages,
        stream: true,
        ...params,
    });
}

// Runs non-streaming chat completion for LLM to use tools
// This is because we can't tool call and stream at the same time
export async function runChatCompletion(
    apiKey: string,
    messages: ChatMessage[],
    tools?: any[],
    tool_choice?: any
) {
    const together = new Together({ apiKey });
    return together.chat.completions.create({
        model: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
        messages,
        tools,
        tool_choice,
        max_tokens: 150,
    });
}