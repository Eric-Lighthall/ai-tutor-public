import { useState, useRef, useEffect, useCallback } from 'react';

export function useHintFetching(apiBaseUrl, problemId, stepId, setFeedback) {
  const [isFetching, setIsFetching] = useState(false);
  const abortControllerRef = useRef(null);
  const accumulatedMessageRef = useRef('');

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const triggerFetchHint = useCallback(
    async (rawValue, expected, givenParameters = {}) => {
      // cancel any in-flight request before starting a new one
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const signal = controller.signal;

      setIsFetching(true);
      accumulatedMessageRef.current = '';

      if (!apiBaseUrl) {
        throw new Error('API URL not configured');
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/v1/tutor/explain_test_case`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              problem_id: problemId,
              step_id: stepId,
              given_parameters: givenParameters,
              user_input: rawValue,
              expected_output: expected,
            }),
            signal,
          }
        );

        if (!response.ok) {
          throw new Error(`LLM hint request failed (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const dataLine = line.substring(5).trim();

            if (dataLine === '[DONE]') {
              return;
            }

            const parsed = JSON.parse(dataLine);
            if (parsed.error) {
              throw new Error(parsed.error);
            }

            if (parsed.explanation_chunk) {
              accumulatedMessageRef.current += parsed.explanation_chunk;
              setFeedback({
                type: 'incorrect',
                msg: accumulatedMessageRef.current,
              });
            }
          }
        }
      } finally {
        setIsFetching(false);
        abortControllerRef.current = null;
      }
    },
    [apiBaseUrl, problemId, stepId, setFeedback]
  );

  return {
    isFetchingHint: isFetching,
    triggerFetchHint,
  };
}
