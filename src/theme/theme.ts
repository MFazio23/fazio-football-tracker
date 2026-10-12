import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#10b981', // Crisp sports emerald green
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#3b82f6', // Electric NFL blue
      light: '#60a5fa',
      dark: '#2563eb',
      contrastText: '#ffffff',
    },
    background: {
      default: '#0a0d14',
      paper: '#111726',
    },
    text: {
      primary: '#f3f4f6',
      secondary: '#9ca3af',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
    },
    info: {
      main: '#06b6d4',
    },
    success: {
      main: '#10b981',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    subtitle1: {
      fontWeight: 600,
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.8rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#111726',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
          transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export const getPositionColor = (position: string) => {
  switch (position) {
    case 'QB':
      return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: '#ef4444' };
    case 'RB':
      return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: '#3b82f6' };
    case 'WR':
      return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: '#f59e0b' };
    case 'TE':
      return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: '#a855f7' };
    case 'K':
      return { bg: 'rgba(20, 184, 166, 0.15)', text: '#2dd4bf', border: '#14b8a6' };
    case 'DEF':
      return { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8', border: '#6366f1' };
    default:
      return { bg: 'rgba(156, 163, 175, 0.15)', text: '#9ca3af', border: '#9ca3af' };
  }
};
