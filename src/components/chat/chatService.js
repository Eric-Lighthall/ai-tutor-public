const WORKER_URL = 'https://ai-worker.ericlighthall.workers.dev';

const getSessionId = () => {
  if (!sessionStorage.getItem('chat_session_id')) {
    sessionStorage.setItem(
      'chat_session_id',
      `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    );
  }
  return sessionStorage.getItem('chat_session_id');
};

const createChatHistory = (messages, newMessage) => {
  const apiChatHistory = messages.map(m => ({ role: m.role, content: m.content }));
  return newMessage 
    ? [...apiChatHistory, { role: 'user', content: newMessage }]
    : apiChatHistory;
};

const createAssistantMessage = (content = '', isStreaming = true) => ({
  role: 'assistant',
  content,
  id: `assistant-${Date.now()}`,
  isStreaming
});

const processStreamLine = (line, currentContent) => {
  const jsonData = line.substring(5).trim();
  if (jsonData === '[DONE]') return { shouldBreak: true };
  
  const parsed = JSON.parse(jsonData);
  if (parsed.content) return { content: currentContent + parsed.content };
  if (parsed.error) return { error: parsed.details || parsed.error };
  return {};
};

const handleStreamResponse = async (response, onMessageUpdate, onError) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let assistantAccumulatedContent = '';
  const assistantMessage = createAssistantMessage();

  onMessageUpdate('add', assistantMessage);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      
      for (const line of chunk.split('\n\n')) {
        if (!line.startsWith('data: ')) continue;
        
        const result = processStreamLine(line, assistantAccumulatedContent);
        if (result.shouldBreak) return onMessageUpdate('finalize', assistantMessage.id);
        
        if (result.content !== undefined) {
          assistantAccumulatedContent = result.content;
          onMessageUpdate('update', assistantMessage.id, assistantAccumulatedContent);
        }
        
        if (result.error) {
          onError(result.error);
          return onMessageUpdate('update', assistantMessage.id, "Sorry, an error occurred.", true, true);
        }
      }
    }
  } finally {
    onMessageUpdate('finalize', assistantMessage.id);
  }
};

export const sendChatMessage = async (messageContent, messages, onMessageUpdate, onError) => {
  if (!messageContent.trim()) return;

  try {
    const response = await fetch(`${WORKER_URL}/v1/chat/general`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: getSessionId(),
        chat_history: createChatHistory(messages, messageContent),
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }

    await handleStreamResponse(response, onMessageUpdate, onError);
  } catch (err) {
    console.error("Chat error:", err);
    onError(err.message || "Failed to connect to the AI assistant.");
  }
};
