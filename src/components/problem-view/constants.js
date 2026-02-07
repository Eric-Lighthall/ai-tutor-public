export const LAYOUT = {
  SIDEBAR: {
    MIN_WIDTH: 160,
    MAX_WIDTH: 900,
    INITIAL_PERCENTAGE: 0.26,
  },
  HANDLE: {
    WIDTH: 3,
  },
  STEPS: {
    WIDTH: 240,
    COLLAPSED_WIDTH: 64,
  },
};

export const THEME = {
  COLORS: {
    DARK: {
      PANEL_BG: 'bg-neutral-800',
      BORDER: 'border-neutral-700',
      HEADER_BG: 'bg-neutral-700/30',
      TEXT_PRIMARY: 'text-neutral-200',
      TEXT_SUBTLE: 'text-neutral-500',
      HOVER_BG: 'hover:bg-neutral-700/40',
      CODE_BG: '#1e1e1e',
      CODE_BORDER: '#3c3c3c',
    },
  },
};

export const TYPOGRAPHY = {
  CODE: {
    INLINE_SIZE: '0.9rem',
    BLOCK_SIZE: '1rem',
    LINE_HEIGHT: 1.6,
  },
};

export const STEP_STATES = {
  LOCKED: 'locked',
  ACTIVE: 'active',
  UNLOCKED: 'unlocked',
};

export const getThemeClasses = () => ({
  panelBg: THEME.COLORS.DARK.PANEL_BG,
  border: THEME.COLORS.DARK.BORDER,
  headerBg: THEME.COLORS.DARK.HEADER_BG,
  textPrimary: THEME.COLORS.DARK.TEXT_PRIMARY,
  textSubtle: THEME.COLORS.DARK.TEXT_SUBTLE,
  hoverBg: THEME.COLORS.DARK.HOVER_BG,
});
