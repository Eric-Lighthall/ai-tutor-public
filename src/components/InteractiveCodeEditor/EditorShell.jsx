// wrapper with "Code Editor" header bar
import React from "react";
import { FiCode } from "react-icons/fi";

export function EditorShell({ children, linterStatusMessage }) {
    return (
        <div className="bg-neutral-800 border-neutral-700/50 rounded-xl shadow-lg animate-fade-in h-full flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 h-10 px-4 border-b border-neutral-700 bg-neutral-700/30 select-none flex-shrink-0">
                <FiCode size={18} className="text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-neutral-200 tracking-wide">
                    Code Editor {linterStatusMessage}
                </span>
            </div>

            <div className="relative flex-1 flex flex-col min-h-0">{children}</div>
        </div>
    );
}
