export const formatDisplayValue = (value, type) => {
    if (type?.startsWith("array") && typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return `[${parsed.map(v => JSON.stringify(v)).join(", ")}]`;
            }
        } catch {
            return String(value);
        }
    }
    if (Array.isArray(value)) {
        return `[${value.map(v => JSON.stringify(v)).join(", ")}]`;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
            try {
                JSON.parse(trimmed);
                return trimmed;
            } catch {
                return String(value);
            }
        }
    }
    return String(value);
};

// order-independent: (i,j) matches (j,i)
export const compareIndices = (a, b) => {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== 2 || b.length !== 2) return false;
    const [i, j] = a.map(Number);
    const [x, y] = b.map(Number);
    if ([i, j, x, y].some(isNaN)) return false;
    return (i === x && j === y) || (i === y && j === x);
};
