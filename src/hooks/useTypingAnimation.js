import { useState, useEffect } from 'react';

// splits into backtick-wrapped code, words, or whitespace runs
const TOK = /`[^`]+`\s*|\S+\s*|\s+/g;
const DEFAULT_START_DELAY = 50;
const DEFAULT_CHAR_DELAY = 10;
const DEFAULT_PUNCTUATION_DELAY = 50;

export function useTypingAnimation(
  fullText = '',
  { startDelay = DEFAULT_START_DELAY } = {}
) {
  const [typedText, setTypedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!fullText) {
      setTypedText('');
      setIsComplete(true);
      return;
    }

    setTypedText('');
    setIsComplete(false);

    const tokens = fullText.match(TOK) || [];
    const totalTokens = tokens.length;
    let index = 0;
    let timerId;

    const pump = () => {
      const token = tokens[index];
      setTypedText((prev) => prev + token);
      index++;

      if (index >= totalTokens) {
        setIsComplete(true);
        return;
      }

      const trimmed = token.trim();
      const delay =
        DEFAULT_CHAR_DELAY +
        (/[.!?]$/.test(trimmed) ? DEFAULT_PUNCTUATION_DELAY : DEFAULT_CHAR_DELAY * 1.5); // pause longer after sentence-ending punctuation

      timerId = setTimeout(pump, delay);
    };

    timerId = setTimeout(pump, startDelay);

    return () => {
      clearTimeout(timerId);
    };
  }, [fullText, startDelay]);

  return {
    typedText,
    isTypingComplete: isComplete,
  };
}
