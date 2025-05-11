// Bottom status bar for code editor
import { useState } from "react";
import { FiCheck, FiX, FiAlertTriangle } from "react-icons/fi";

export function EditorStatusBar({
    selectedLanguage,
    isLspReady,
    isPyLinterReady,
    pyLinterError,
    cursor,
    tabSize,
    onTabSizeChange,
    readOnly,
}) {
    const [showTabPicker, setShowTabPicker] = useState(false);
    const [tempTabSize, setTempTabSize] = useState(tabSize);

    const toggleTabPicker = () => {
        setTempTabSize(tabSize);
        setShowTabPicker((prev) => !prev);
    };

    const handleApplyTabSize = () => {
        if (tempTabSize >= 1) {
            onTabSizeChange(tempTabSize);
        }
        setShowTabPicker(false);
    };

    const handleCancelTabSize = () => {
        setShowTabPicker(false);
    };

    // Might remove LSP indicator soon... there's a good case for not having a language server
    return (
        <div className="flex-none border-t border-neutral-600/50 bg-[#1e1e1e] px-3 py-1.5 flex justify-between items-center text-xs text-neutral-400">
            <div className="flex items-center space-x-3">
                {selectedLanguage === "python" ? (
                    <>
                        <div className="relative flex items-center space-x-1 group">
                            {isLspReady ? (
                                <FiCheck size={14} className="text-green-500" />
                            ) : (
                                <FiX size={14} className="text-red-500" />
                            )}
                            <span>LSP</span>
                            <div className="absolute bottom-full left-0 mb-1 w-max px-2 py-1 text-xs text-neutral-100 bg-neutral-800 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity delay-300">
                                {isLspReady
                                    ? "Python language server ready"
                                    : "Python language server not ready"}
                            </div>
                        </div>
                        <div className="relative flex items-center space-x-1 group">
                            {pyLinterError ? (
                                <FiAlertTriangle
                                    size={14}
                                    className="text-yellow-500"
                                />
                            ) : isPyLinterReady ? (
                                <FiCheck size={14} className="text-green-500" />
                            ) : (
                                <FiX size={14} className="text-red-500" />
                            )}
                            <span>Linter</span>
                            <div className="absolute bottom-full left-0 mb-1 w-max px-2 py-1 text-xs text-neutral-100 bg-neutral-800 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity delay-300">
                                {pyLinterError
                                    ? `Linter init error: ${pyLinterError.message}`
                                    : isPyLinterReady
                                    ? "Python linter (Ruff) ready"
                                    : "Python linter initializing..."}
                            </div>
                        </div>
                    </>
                ) : (
                    <span className="opacity-50">LSP/Linter N/A</span>
                )}
            </div>
            <div className="flex items-center space-x-4">
                <span>
                    Ln {cursor.line}, Col {cursor.col}
                </span>
                <div className="relative">
                    <button
                        onClick={toggleTabPicker}
                        className="text-neutral-400 hover:text-neutral-200 transition-colors text-xs"
                        title="Configure Tab Size"
                        disabled={readOnly}
                    >
                        Spaces: {tabSize}
                    </button>
                    {showTabPicker && (
                        <div className="absolute bottom-full right-0 mb-1 w-32 bg-neutral-800 border border-neutral-600 rounded p-2 shadow-lg z-50">
                            <label className="block text-xs text-neutral-200 mb-1">
                                Spaces per Tab
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="16"
                                step="1"
                                value={tempTabSize}
                                onChange={(e) => {
                                    const val = Math.max(
                                        1,
                                        Math.min(
                                            16,
                                            Number(e.target.value) || 0
                                        )
                                    );
                                    setTempTabSize(val);
                                }}
                                className="w-full px-1 py-0.5 text-sm bg-neutral-700 border border-neutral-600 rounded text-white"
                            />
                            <div className="mt-2 flex justify-end space-x-1">
                                <button
                                    onClick={handleCancelTabSize}
                                    className="text-xs px-2 py-0.5 rounded hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApplyTabSize}
                                    className="text-xs px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
