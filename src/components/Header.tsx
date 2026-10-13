import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import RefreshIcon from '@mui/icons-material/Refresh';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import SettingsIcon from '@mui/icons-material/Settings';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

interface HeaderProps {
  lastUpdated: string;
  refreshInterval: number;
  onRefreshIntervalChange: (interval: number) => void;
  onManualRefresh: () => void;
  onOpenPriorityManager: () => void;
  onOpenSettings: () => void;
  isRefreshing: boolean;
  leagueCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  lastUpdated,
  refreshInterval,
  onRefreshIntervalChange,
  onManualRefresh,
  onOpenPriorityManager,
  onOpenSettings,
  isRefreshing,
  leagueCount = 6,
}) => {
  return (
    <AppBar position="sticky" elevation={2} sx={{ backgroundColor: '#0f1422', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, py: 1 }}>
        {/* Brand / Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 42,
              height: 42,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)',
            }}
          >
            <SportsFootballIcon fontSize="medium" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1.2 }}>
                FAZIO FANTASY TRACKER
              </Typography>
              <Chip
                icon={<FiberManualRecordIcon sx={{ fontSize: '10px !important', color: '#10b981' }} />}
                label="LIVE"
                size="small"
                sx={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  height: 22,
                  fontWeight: 700,
                  fontSize: '0.68rem',
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
              {leagueCount} Active League{leagueCount !== 1 ? 's' : ''} • Updated: {lastUpdated || 'Just now'}
            </Typography>
          </Box>
        </Box>

        {/* Action Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>

          {/* Auto Refresh Select */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#9ca3af', display: { xs: 'none', sm: 'inline' } }}>
              Polling:
            </Typography>
            <Select
              size="small"
              value={refreshInterval}
              onChange={(e) => onRefreshIntervalChange(Number(e.target.value))}
              sx={{
                height: 34,
                fontSize: '0.8rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#e5e7eb',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                },
              }}
            >
              <MenuItem value={15}>Every 15s</MenuItem>
              <MenuItem value={30}>Every 30s</MenuItem>
              <MenuItem value={60}>Every 1m</MenuItem>
              <MenuItem value={0}>Manual Only</MenuItem>
            </Select>
          </Box>

          {/* Manual Refresh */}
          <Tooltip title="Refresh scores now">
            <IconButton
              onClick={onManualRefresh}
              disabled={isRefreshing}
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: '#e5e7eb',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
              }}
            >
              <RefreshIcon
                sx={{
                  animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              />
            </IconButton>
          </Tooltip>

          {/* League Rankings */}
          <Tooltip title="Rank Leagues by Importance & Assign Main Score">
            <Button
              variant="contained"
              size="small"
              color="primary"
              startIcon={<FormatListNumberedIcon />}
              onClick={onOpenPriorityManager}
            >
              League Priority
            </Button>
          </Tooltip>

          {/* Settings */}
          <Tooltip title="API Configuration & Credentials">
            <IconButton
              onClick={onOpenSettings}
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: '#e5e7eb',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
              }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
