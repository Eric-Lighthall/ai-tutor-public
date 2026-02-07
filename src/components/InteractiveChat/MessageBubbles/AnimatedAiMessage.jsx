// ai message with token-by-token typing animation
import React from "react";
import { useTypingAnimation } from "../../../hooks/useTypingAnimation";
import AiMessage from "./AiMessage";

const AnimatedAiMessage = ({
  rawText,
  animate,
  isStreaming,
}) => {
  const { typedText } = useTypingAnimation(rawText, {
    isDisabled: !animate || isStreaming,
  });

  return (
    <AiMessage
      text={animate && !isStreaming ? typedText : rawText}
      isStreaming={isStreaming}
    />
  );
};

export default AnimatedAiMessage; 
