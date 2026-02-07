import { linter } from "@codemirror/lint";
import init, { check as ruffCheck } from "ruff-wasm";

const ruffReady = init("/ruff_wasm_bg.wasm");

export const pythonRuffLinterExtension = linter(
  async ({ state }) => {
    const { doc } = state;
    const code = doc.toString();
    if (!code.trim()) return [];

    await ruffReady;

    const toPos = ({ row, column }) => doc.line(row).from + column;

    return ruffCheck(code, { filename: "file.py" }).map(
      ({ code: errCode, message, location, end_location }) => ({
        from: toPos(location),
        to: toPos(end_location),
        severity: errCode.startsWith('E') || errCode.startsWith('F') ? "error" : "warning",
        message: `${message}`,
      })
    );
  },
  { delay: 750 }
);
