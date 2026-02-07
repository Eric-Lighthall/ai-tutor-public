import { useState, useEffect, useMemo, useCallback } from "react";

const problemJsonModules = import.meta.glob("../content/problems/*/*.json", {
  import: "default",
});

const getPersistedStateKey = (problemId, userId) =>
  `problemProgress-${problemId}-${userId}`;

const getUnlockedStepIndex = (steps = [], completionStatus = {}) => {
  let unlockedIndex = 0;
  for (let i = 0; i < steps.length; i++) {
    if (!completionStatus[steps[i].id]) break;
    unlockedIndex = i + 1;
  }
  return unlockedIndex;
};

const getTestCaseConfig = (problemData) => {
  const testCases = Array.isArray(problemData?.testCases)
    ? problemData.testCases
    : [];
  const visibleTestCases = testCases.filter(
    (tc) => tc.input && Array.isArray(tc.input)
  );
  const hiddenEntry = testCases.find((tc) => tc.hidden && !tc.input);
  const hiddenTestCasesCount =
    hiddenEntry && hiddenEntry.hidden
      ? parseInt(hiddenEntry.hidden, 10) || 0
      : 0;

  return { visibleTestCases, hiddenTestCasesCount };
};

export const getDynamicProblemPersistedStateKey = getPersistedStateKey;

export function useProblemState({ problemId, userId, devMode }) {
  const [problemData, setProblemData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeStepId, setActiveStepId] = useState("");
  const [unlockedStepIndex, setUnlockedStepIndex] = useState(0);
  const [stepChatHistories, setStepChatHistories] = useState({});
  const [stepCompletionStatus, setStepCompletionStatus] = useState({});

  const resetProgressState = useCallback(() => {
    setStepChatHistories({});
    setStepCompletionStatus({});
    setUnlockedStepIndex(0);
    setActiveStepId("");
  }, []);

  const loadPersistedState = useCallback(() => {
    if (!problemId || !userId) {
      return { chatHistories: {}, completionStatus: {} };
    }

    const persistedStateKey = getPersistedStateKey(problemId, userId);
    const savedStateRaw = localStorage.getItem(persistedStateKey);
    if (!savedStateRaw) {
      return { chatHistories: {}, completionStatus: {} };
    }

    try {
      const savedState = JSON.parse(savedStateRaw);
      return {
        chatHistories: savedState?.chatHistories || {},
        completionStatus: savedState?.completionStatus || {},
      };
    } catch (e) {
      console.error("Error parsing state from localStorage:", e);
      return { chatHistories: {}, completionStatus: {} };
    }
  }, [problemId, userId]);

  useEffect(() => {
    let isCancelled = false;

    const initializeProblem = async () => {
      if (!problemId) {
        if (isCancelled) return;
        setProblemData(null);
        setError("No problem ID specified.");
        resetProgressState();
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const path = `../content/problems/${problemId}/${problemId}.json`;
        if (!problemJsonModules[path]) {
          throw new Error(`Problem data not found for ${problemId}`);
        }

        const data = await problemJsonModules[path]();
        if (isCancelled) return;

        const steps = Array.isArray(data?.steps) ? data.steps : [];
        const { chatHistories, completionStatus } = loadPersistedState();
        const unlockedIndex = getUnlockedStepIndex(steps, completionStatus);
        // clamp to unlocked step or last step
        const initialStep =
          steps[Math.min(unlockedIndex, Math.max(steps.length - 1, 0))];

        setProblemData(data);
        setStepChatHistories(chatHistories);
        setStepCompletionStatus(completionStatus);
        setUnlockedStepIndex(unlockedIndex);
        setActiveStepId(initialStep?.id || "");
      } catch (err) {
        if (isCancelled) return;
        console.error("Failed to fetch problem data:", err);
        setError(
          `Failed to load problem data. ${
            err.message.includes("not found")
              ? "Please check the problem ID."
              : "Please try again later."
          }`
        );
        setProblemData(null);
        resetProgressState();
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    initializeProblem();

    return () => {
      isCancelled = true;
    };
  }, [problemId, loadPersistedState, resetProgressState]);

  useEffect(() => {
    if (!isLoading && problemData && problemId && userId) {
      const persistedStateKey = getPersistedStateKey(problemId, userId);
      const stateToSave = {
        chatHistories: stepChatHistories,
        completionStatus: stepCompletionStatus,
      };
      try {
        localStorage.setItem(persistedStateKey, JSON.stringify(stateToSave));
      } catch (e) {
        console.error("Error saving state to localStorage:", e);
      }
    }
  }, [
    stepChatHistories,
    stepCompletionStatus,
    problemId,
    userId,
    problemData,
    isLoading,
  ]);

  const effectiveUnlockedIndex = useMemo(() => {
    if (!problemData?.steps) return 0;
    return devMode ? problemData.steps.length - 1 : unlockedStepIndex;
  }, [devMode, unlockedStepIndex, problemData]);

  const { visibleTestCases: visibleProblemTestCases, hiddenTestCasesCount } =
    useMemo(() => getTestCaseConfig(problemData), [problemData]);

  return {
    problemData,
    isLoading,
    error,
    setError,
    activeStepId,
    setActiveStepId,
    unlockedStepIndex,
    setUnlockedStepIndex,
    stepChatHistories,
    setStepChatHistories,
    stepCompletionStatus,
    setStepCompletionStatus,
    effectiveUnlockedIndex,
    visibleProblemTestCases,
    hiddenTestCasesCount,
    resetProgressState,
  };
}
