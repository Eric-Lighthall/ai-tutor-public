function getProgressKey(userId, problemId, stepId) {
    return `testcase_progress_${userId}_${problemId}_${stepId}`;
}

function normalizeProgress(progress) {
    return {
        completedChallenges: Array.isArray(progress?.completedChallenges)
            ? progress.completedChallenges
            : [],
        completedTestCases: Array.isArray(progress?.completedTestCases)
            ? progress.completedTestCases
            : [],
        stepCompleted: Boolean(progress?.stepCompleted),
        lastUpdated:
            typeof progress?.lastUpdated === "number"
                ? progress.lastUpdated
                : Date.now(),
    };
}

export function loadTestCaseProgress(userId, problemId, stepId) {
    if (!userId || !problemId || !stepId) return null;

    try {
        const key = getProgressKey(userId, problemId, stepId);
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        const progress = JSON.parse(raw);

        if (!progress || typeof progress !== "object") return null;
        return normalizeProgress(progress);
    } catch (error) {
        console.error("Error loading test case progress:", error);
        return null;
    }
}

export function saveTestCaseProgress(userId, problemId, stepId, progressData) {
    if (!userId || !problemId || !stepId || !progressData) return;

    try {
        const key = getProgressKey(userId, problemId, stepId);
        const dataToSave = normalizeProgress({
            ...progressData,
            lastUpdated: Date.now(),
        });

        localStorage.setItem(key, JSON.stringify(dataToSave));
    } catch (error) {
        console.error("Error saving test case progress:", error);
        if (error.name === "QuotaExceededError") {
            console.warn("LocalStorage quota exceeded. Progress not saved.");
        }
    }
}

export function clearTestCaseProgress(userId, problemId, stepId) {
    if (!userId || !problemId || !stepId) return;

    try {
        const key = getProgressKey(userId, problemId, stepId);
        localStorage.removeItem(key);
    } catch (error) {
        console.error("Error clearing test case progress:", error);
    }
}
