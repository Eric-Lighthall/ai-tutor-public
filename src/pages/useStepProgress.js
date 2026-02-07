import { useCallback } from "react";
import { clearTestCaseProgress } from "../components/InteractiveTestCases/progressUtils.js";
import {
  extractStepData,
  findLanguageConfig,
  getEditorStorageKey,
} from "../components/InteractiveCodeEditor/useInteractiveEditor.js";
import { getDynamicProblemPersistedStateKey } from "./useProblemState";

const getChallengeProgressKey = (userId) => `edu_challenge_${userId}`;

export function useStepProgress({
  problemId,
  userId,
  problemData,
  activeStepId,
  effectiveUnlockedIndex,
  setStepCompletionStatus,
  setUnlockedStepIndex,
  setActiveStepId,
  setError,
  resetProgressState,
  onOpenResetConfirm,
  onCloseResetConfirm,
}) {
  const handleStepCompletionChange = useCallback(
    (stepIdToUpdate, isCompleted) => {
      setStepCompletionStatus((prevStatus) => ({
        ...prevStatus,
        [stepIdToUpdate]: isCompleted,
      }));
    },
    [setStepCompletionStatus]
  );

  const handleSelectStep = useCallback(
    (stepId, forceSelect = false) => {
      if (!problemData?.steps) return;
      const stepIndex = problemData.steps.findIndex((s) => s.id === stepId);
      if (
        stepIndex === -1 ||
        (!forceSelect && stepIndex > effectiveUnlockedIndex)
      ) {
        return;
      }
      setActiveStepId(stepId);
      setError("");
    },
    [problemData, effectiveUnlockedIndex, setActiveStepId, setError]
  );

  const completeStepAndGoNext = useCallback(() => {
    if (!problemData?.steps) return;

    handleStepCompletionChange(activeStepId, true);

    const { steps } = problemData;
    const currentIndex = steps.findIndex((s) => s.id === activeStepId);
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      const nextStepId = steps[nextIndex].id;
      setUnlockedStepIndex((prevIndex) => Math.max(prevIndex, nextIndex));
      handleSelectStep(nextStepId, true);
    } else {
      alert("Congratulations! You've completed all steps!");
      try {
        const key = getChallengeProgressKey(userId);
        const existing = JSON.parse(localStorage.getItem(key) || "{}");
        existing[problemId] = true;
        localStorage.setItem(key, JSON.stringify(existing));
      } catch (e) {
        console.error("Failed to save challenge completion", e);
      }
    }
  }, [
    problemData,
    activeStepId,
    handleSelectStep,
    problemId,
    userId,
    handleStepCompletionChange,
    setUnlockedStepIndex,
  ]);

  const actuallyResetProgress = useCallback(() => {
    if (!problemId || !userId || !problemData?.steps || problemData.steps.length === 0) {
      return;
    }

    const persistedStateKey = getDynamicProblemPersistedStateKey(problemId, userId);
    localStorage.removeItem(persistedStateKey);

    problemData.steps.forEach((step) => {
      if (step.contentType === "interactiveTestCases") {
        clearTestCaseProgress(userId, problemId, step.id);
      } else if (
        step.contentType === "interactiveCode" ||
        step.contentType === "staticContent"
      ) {
        const { starterCodes, lang: langFromJson } = extractStepData(step.content);
        const languageHint = step.editorConfig?.language;
        const initialLanguageKey = findLanguageConfig(
          languageHint || langFromJson
        ).key;
        // clear all language variants, not just the active one
        const languageKeysToClear = new Set([initialLanguageKey]);

        Object.keys(starterCodes).forEach((langKey) => {
          const normalizedLanguageKey = findLanguageConfig(langKey)?.key;
          if (normalizedLanguageKey) languageKeysToClear.add(normalizedLanguageKey);
        });

        languageKeysToClear.forEach((languageKey) => {
          const storageKey = getEditorStorageKey(problemId, step.id, languageKey);
          if (storageKey) localStorage.removeItem(storageKey);
        });
      }
    });

    resetProgressState();
    setActiveStepId(problemData.steps[0].id);
    setError("");
    onCloseResetConfirm?.();
  }, [
    problemId,
    userId,
    problemData,
    resetProgressState,
    setActiveStepId,
    setError,
    onCloseResetConfirm,
  ]);

  const requestResetProgress = useCallback(() => {
    onOpenResetConfirm?.();
  }, [onOpenResetConfirm]);

  return {
    handleStepCompletionChange,
    handleSelectStep,
    completeStepAndGoNext,
    actuallyResetProgress,
    requestResetProgress,
  };
}
