// bottom bar below the editor  - cursor position, tab size picker
import { useState } from 'react';
import clsx from 'clsx';

export function EditorStatusBar({
    cursor,
    tabSize,
    onTabSizeChange,
    readOnly,
}) {
    const [showTabPicker, setShowTabPicker] = useState(false);
    const [tempTabSize, setTempTabSize] = useState(tabSize);

    const toggleTabPicker = () => {
        setTempTabSize(tabSize);
        setShowTabPicker(prev => !prev);
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

    return (
        <div className={clsx(
            "flex-none border-t px-3 py-1.5 flex justify-between items-center",
            "text-xs bg-[#1e1e1e] border-neutral-600/50 text-neutral-400"
        )}>
            <div className="flex items-center space-x-3">
            </div>
            <div className="flex items-center space-x-4">
                <span>Ln {cursor.line}, Col {cursor.col}</span>
                <div className="relative">
                    <button onClick={toggleTabPicker} className="transition-colors text-xs text-neutral-400 hover:text-neutral-200" title="Configure Tab Size" disabled={readOnly}>
                        Spaces: {tabSize}
                    </button>
                    {showTabPicker && (
                        <div className="absolute bottom-full right-0 mb-1 w-32 rounded p-2 shadow-lg z-50 bg-neutral-800 border border-neutral-600">
                            <label className="block text-xs mb-1 text-neutral-200">Spaces per Tab</label>
                            <input
                                type="number"
                                min="1"
                                max="16"
                                step="1"
                                value={tempTabSize}
                                onChange={e => { const val = Math.max(1, Math.min(16, Number(e.target.value) || 0)); setTempTabSize(val); }}
                                className={clsx(
                                    "w-full px-1 py-0.5 text-sm rounded bg-neutral-700",
                                    "border border-neutral-600 text-white focus:ring-blue-500 focus:border-blue-500"
                                )}
                            />
                            <div className="mt-2 flex justify-end space-x-1">
                                <button onClick={handleCancelTabSize} className="text-xs px-2 py-0.5 rounded transition-colors text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100">Cancel</button>
                                <button onClick={handleApplyTabSize} className="text-xs px-2 py-0.5 rounded transition-colors text-white bg-blue-600 hover:bg-blue-500">OK</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
