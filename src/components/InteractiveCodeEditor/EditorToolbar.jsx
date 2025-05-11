// Toolbar that is on top of the code editor
import React, { useState, useRef, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import PythonIcon from "@/assets/icons/python.svg?react";
import JavaIcon from "@/assets/icons/java.svg?react";
import CIcon from "@/assets/icons/c.svg?react";
import CppIcon from "@/assets/icons/cplusplus.svg?react";
import CsharpIcon from "@/assets/icons/csharp.svg?react";
import JsIcon from "@/assets/icons/javascript.svg?react";

const supportedLanguagesUI = [
    { key: "python", label: "Python", icon: PythonIcon },
    { key: "java", label: "Java", icon: JavaIcon },
    { key: "c", label: "C", icon: CIcon },
    { key: "cpp", label: "C++", icon: CppIcon },
    { key: "csharp", label: "C#", icon: CsharpIcon },
    { key: "javascript", label: "JavaScript", icon: JsIcon },
];
const findLanguageUI = (key) =>
    supportedLanguagesUI.find((l) => l.key === key) || supportedLanguagesUI[0];

const btnBase =
    "px-3 py-1 rounded text-sm transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center focus:outline-none focus:ring-1 focus:ring-blue-500";
const btnLang = `${btnBase} gap-2 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 cursor-pointer`;
const btnRun = `${btnBase} bg-green-700 hover:bg-green-600 text-white cursor-pointer`;
const runningIndicatorStyle =
    "px-3 py-1 text-sm text-neutral-300 flex items-center gap-2";

export function EditorToolbar({
    selectedLanguage,
    onLanguageChange,
    readOnly,
    isRunning,
    runnable,
    handleRun,
    runBtnLabel,
    runningIndicatorAnimation,
}) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const selectedLangUI = findLanguageUI(selectedLanguage);

    // Global mouse click listener - used to close dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target)
            ) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="flex-none px-3 py-1 border-b border-neutral-700/50 flex items-center gap-2 bg-[#1e1e1e]">
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setDropdownOpen((p) => !p)}
                    className={btnLang}
                    disabled={readOnly || isRunning}
                    title={`Language: ${selectedLangUI.label}`}
                >
                    {React.createElement(selectedLangUI.icon, {
                        width: 16,
                        height: 16,
                        "aria-hidden": "true",
                    })}
                    <span>{selectedLangUI.label}</span>
                    <FiChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${
                            dropdownOpen ? "rotate-180" : ""
                        }`}
                    />
                </button>
                {/* Render dropdown language select menu */}
                {dropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-neutral-700 border border-neutral-600 rounded-md shadow-lg z-50 overflow-hidden">
                        {supportedLanguagesUI.map((lang) => (
                            <button
                                key={lang.key}
                                onClick={() => {
                                    onLanguageChange(lang.key);
                                    setDropdownOpen(false);
                                }}
                                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-600 disabled:opacity-50 disabled:hover:bg-neutral-700 disabled:cursor-not-allowed"
                                disabled={lang.key === selectedLanguage}
                            >
                                {React.createElement(lang.icon, {
                                    width: 18,
                                    height: 18,
                                    "aria-hidden": "true",
                                })}
                                <span>{lang.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {isRunning ? (
                <div className={runningIndicatorStyle}>
                    <span>Running...</span>
                    {runningIndicatorAnimation}
                </div>
            ) : (
                <button
                    onClick={handleRun}
                    disabled={!runnable || readOnly}
                    className={btnRun}
                >
                    {runBtnLabel}
                </button>
            )}
            <div className="flex-grow" />
        </div>
    );
}
