// right sidebar  - step navigation list, reset progress, dev mode toggle
import React from "react";
import ToggleSwitch from "../common/ToggleSwitch";
import { LockIcon, ChevronIcon, ResetIcon, ChatIcon } from "./icons/StepIcons";
import { getStepClasses } from "./utils/stepClassUtils";
import { getThemeClasses } from "./constants";

function ProblemSidebar({
  steps,
  activeStepId,
  onSelectStep,
  unlockedStepIndex,
  isCollapsed,
  onToggle,
  onToggleChat,
  devMode,
  onToggleDevMode,
  onResetProgress,
}) {
  if (!steps || steps.length === 0) return null;

  const themeClasses = getThemeClasses();

  const renderSteps = () =>
    steps.map((step, index) => {
      const isLocked = index > unlockedStepIndex;
      const isActive = activeStepId === step.id;
      // hide separator line between adjacent active steps
      const nextStepIsActive = index + 1 < steps.length && activeStepId === steps[index + 1].id;
      const itemClasses = getStepClasses(isCollapsed, isLocked, isActive);
      const handleClick = !isLocked && onSelectStep ? () => onSelectStep(step.id) : undefined;

      return (
        <React.Fragment key={step.id}>
          <li className="w-full">
            <button
              onClick={handleClick}
              disabled={isLocked}
              className={itemClasses}
              title={isLocked ? "Locked" : `Go to step ${index + 1}`}
            >
              {isCollapsed ? (
                isLocked ? <LockIcon /> : index + 1
              ) : (
                <span className="truncate">{isLocked ? `${index + 1}. Hidden Step` : step.title}</span>
              )}
              {!isCollapsed && isLocked && <LockIcon />}
            </button>
          </li>
          {isCollapsed && index !== steps.length - 1 && !isActive && !nextStepIsActive && (
            <div className={`h-px ${themeClasses.border} mx-auto w-2/3`} />
          )}
        </React.Fragment>
      );
    });

  return (
    <nav className={`${themeClasses.panelBg} ${themeClasses.border} h-full flex flex-col overflow-hidden shadow-lg rounded-lg`}>
      <div className={`flex items-center justify-between px-3 border ${themeClasses.border} h-10 ${themeClasses.headerBg} rounded-t-lg`}>
        {!isCollapsed && (
          <h3 className={`text-sm font-semibold text-neutral-100 tracking-wide`}>
            Steps
          </h3>
        )}
        <button
          onClick={onToggle}
          className={`${themeClasses.textSubtle} hover:${themeClasses.textPrimary} rounded p-1 cursor-pointer`}
          title={isCollapsed ? "Expand steps" : "Collapse steps"}
        >
          <ChevronIcon collapsed={isCollapsed} />
        </button>
      </div>

      <ul id="steps-list" className="flex-1 overflow-y-auto custom-scrollbar pb-4">
        {renderSteps()}
        <li className="w-full mt-2 px-3 flex justify-end">
          <button
            onClick={onResetProgress}
            className={`flex items-center space-x-1 px-2 py-1 bg-neutral-700/30 ${themeClasses.textSubtle} hover:text-red-500 hover:bg-red-500/10 rounded cursor-pointer`}
            title="Reset Progress"
          >
            <ResetIcon />
            {!isCollapsed && <span className="text-xs font-medium">Start Over</span>}
          </button>
        </li>
      </ul>

      <div className={`p-3 border-t ${themeClasses.border} space-y-3`}>
        {!isCollapsed && (
          <ToggleSwitch
            id={`sidebar-dev-mode-toggle-${isCollapsed ? 'collapsed' : 'expanded'}`}
            isOn={devMode}
            onToggle={onToggleDevMode}
            label="Unlock All Steps"
            labelPosition="left"
          />
        )}
        {!isCollapsed && (
          <button
            id="ask-ai-button"
            onClick={onToggleChat}
            className="w-full h-10 flex items-center justify-center text-sm rounded font-medium cursor-pointer text-white bg-blue-600 hover:bg-blue-700"
          >
            Ask the AI
          </button>
        )}
      </div>

      {isCollapsed && (
        <button
          id="ask-ai-button-collapsed"
          onClick={onToggleChat}
          className={`w-full h-10 flex items-center justify-center ${themeClasses.textPrimary} ${themeClasses.hoverBg}`}
          title="Ask the AI"
        >
          <ChatIcon className="h-6 w-6 text-blue-400" />
        </button>
      )}
    </nav>
  );
}

export default ProblemSidebar;
