import { getThemeClasses, STEP_STATES } from '../constants';

const themeClasses = getThemeClasses();

const baseStepClasses = {
  collapsed: 'w-full h-10 flex items-center justify-center transition-colors duration-150 text-sm font-medium',
  expanded: 'w-full px-3 flex items-center justify-between h-10 text-sm font-medium border-l-4 transition-all duration-150',
};

const stateClasses = {
  collapsed: {
    [STEP_STATES.LOCKED]: `${themeClasses.textSubtle} cursor-not-allowed`,
    [STEP_STATES.ACTIVE]: `border-l-4 border-blue-500 bg-neutral-700 ${themeClasses.textPrimary} font-semibold`,
    [STEP_STATES.UNLOCKED]: `${themeClasses.textPrimary} ${themeClasses.hoverBg} cursor-pointer`,
  },
  expanded: {
    [STEP_STATES.LOCKED]: `${themeClasses.textSubtle} cursor-not-allowed`,
    [STEP_STATES.ACTIVE]: `border-blue-500 ${themeClasses.textPrimary} text-white font-semibold bg-neutral-700/30`,
    [STEP_STATES.UNLOCKED]: `border-transparent hover:bg-neutral-700/60 hover:border-neutral-600 ${themeClasses.textPrimary} text-neutral-300 cursor-pointer`,
  },
};

export const getStepClasses = (isCollapsed, isLocked, isActive) => {
  const view = isCollapsed ? 'collapsed' : 'expanded';
  const state = isLocked ? STEP_STATES.LOCKED : isActive ? STEP_STATES.ACTIVE : STEP_STATES.UNLOCKED;

  return `${baseStepClasses[view]} ${stateClasses[view][state]}`;
};
