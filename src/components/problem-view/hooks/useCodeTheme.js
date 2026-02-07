import { useMemo } from 'react';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { THEME, TYPOGRAPHY } from '../constants';

export const useCodeTheme = () => {
  return useMemo(() => {
    return {
      syntaxTheme: vscDarkPlus,
      backgroundColor: THEME.COLORS.DARK.CODE_BG,
      borderColor: THEME.COLORS.DARK.CODE_BORDER,
      commonStyle: {
        lineHeight: TYPOGRAPHY.CODE.LINE_HEIGHT,
        margin: 0,
        boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
      }
    };
  }, []);
};
