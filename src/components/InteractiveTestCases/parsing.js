export const parseInput = (type, rawValue) => {
    if (rawValue === null || rawValue === undefined) return null;
    const str = String(rawValue).trim();
    if (str === '') return null;
    try {
        switch (type) {
            case 'integer': {
                const n = parseInt(str, 10);
                return !isNaN(n) ? n : null;
            }
            case 'array<integer>': {
                const clean = str.replace(/^\[|\]$/g, "").trim(); // handles both [1,2,3] and 1,2,3
                if (!clean) return null;
                const parts = clean.split(",");
                const nums = parts.map((n) => parseInt(n.trim(), 10));
                return nums.some((n) => isNaN(n)) ? null : nums;
            }
            case 'string':
                return str;
            default:
                console.warn(`Unknown type for parsing: ${type}`);
                return str;
        }
    } catch (error) {
        console.error(`Error parsing value "${rawValue}" as type "${type}":`, error);
        return null;
    }
};
