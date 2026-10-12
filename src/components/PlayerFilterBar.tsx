import React from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Typography,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SortIcon from '@mui/icons-material/Sort';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import type { FilterState, League, Position, GameStatus, RootingStance } from '../types/fantasy';

interface PlayerFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  leagues: League[];
  totalCount: number;
  conflictCount: number;
}

export const PlayerFilterBar: React.FC<PlayerFilterBarProps> = ({
  filters,
  onFilterChange,
  leagues,
  totalCount,
  conflictCount,
}) => {
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, searchQuery: e.target.value });
  };

  const handlePositionChange = (_: any, newPos: Position | 'ALL' | null) => {
    if (newPos !== null) {
      onFilterChange({ ...filters, position: newPos });
    }
  };

  const handleOwnershipChange = (_: any, newOwnership: FilterState['ownership'] | null) => {
    if (newOwnership !== null) {
      onFilterChange({ ...filters, ownership: newOwnership });
    }
  };

  const handleGameStatusChange = (_: any, newStatus: GameStatus | 'ALL' | null) => {
    if (newStatus !== null) {
      onFilterChange({ ...filters, gameStatus: newStatus });
    }
  };

  const handleRootingChange = (_: any, newRooting: RootingStance | 'ALL' | null) => {
    if (newRooting !== null) {
      onFilterChange({ ...filters, rootingFilter: newRooting });
    }
  };

  const handleRosterSpotChange = (_: any, newSpot: FilterState['rosterSpot'] | null) => {
    if (newSpot !== null) {
      onFilterChange({ ...filters, rosterSpot: newSpot });
    }
  };

  const handleViewModeChange = (_: any, newMode: FilterState['viewMode'] | null) => {
    if (newMode !== null) {
      onFilterChange({ ...filters, viewMode: newMode });
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: '#111726',
        borderRadius: 2.5,
        p: 2,
        mb: 2.5,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {/* Row 1: Search, League Multi-Filter, Sort, View Toggle, Count */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
        {/* Search */}
        <TextField
          size="small"
          placeholder="Search player or team (e.g. Jefferson, KC, DAL)..."
          value={filters.searchQuery}
          onChange={handleTextChange}
          sx={{
            flex: { xs: '1 1 100%', sm: '1 1 220px' },
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 2,
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#9ca3af' }} />
                </InputAdornment>
              ),
            },
          }}
        />

        {/* League Multi-filter */}
        <FormControl size="small" sx={{ minWidth: 190, flex: { xs: '1 1 100%', sm: '0 1 220px' } }}>
          <InputLabel id="league-select-label" sx={{ color: '#9ca3af' }}>
            Filter by League
          </InputLabel>
          <Select
            labelId="league-select-label"
            multiple
            value={filters.selectedLeagueIds}
            onChange={(e) => {
              const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
              onFilterChange({ ...filters, selectedLeagueIds: val });
            }}
            label="Filter by League"
            renderValue={(selected) => {
              if (selected.length === 0) return 'All 6 Leagues';
              return `${selected.length} League${selected.length > 1 ? 's' : ''} Selected`;
            }}
            sx={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 2 }}
          >
            {leagues.map((l) => (
              <MenuItem key={l.id} value={l.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={`#${l.priority}`}
                    size="small"
                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
                  />
                  <Typography variant="body2">{l.name}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Sort By */}
        <FormControl size="small" sx={{ minWidth: 190, flex: { xs: '1 1 100%', sm: '0 1 210px' } }}>
          <InputLabel id="sort-select-label" sx={{ color: '#9ca3af' }}>
            Sort Players By
          </InputLabel>
          <Select
            labelId="sort-select-label"
            value={filters.sortBy}
            onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as FilterState['sortBy'] })}
            label="Sort Players By"
            startAdornment={
              <InputAdornment position="start">
                <SortIcon sx={{ color: '#9ca3af', fontSize: 18 }} />
              </InputAdornment>
            }
            sx={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 2 }}
          >
            <MenuItem value="MAIN_POINTS">Main League Points (High to Low)</MenuItem>
            <MenuItem value="PROJECTED">Projected Points (High to Low)</MenuItem>
            <MenuItem value="NET_IMPACT">Net Rooting EV (Highest Priority Win)</MenuItem>
            <MenuItem value="IMPORTANCE">Importance / Roster Count</MenuItem>
            <MenuItem value="NAME">Player Name (A–Z)</MenuItem>
          </Select>
        </FormControl>

        {/* View Mode Toggle: Cards vs Table */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ToggleButtonGroup
            size="small"
            value={filters.viewMode}
            exclusive
            onChange={handleViewModeChange}
            sx={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
          >
            <ToggleButton value="CARDS" sx={{ px: 1.2, py: 0.5 }}>
              <Tooltip title="Card View (Photos & Full Breakdown)">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <GridViewIcon sx={{ fontSize: 18 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, display: { xs: 'none', md: 'inline' } }}>
                    Cards
                  </Typography>
                </Box>
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="TABLE" sx={{ px: 1.2, py: 0.5 }}>
              <Tooltip title="RedZone Table View (Compact Game-Day Table)">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ViewListIcon sx={{ fontSize: 18 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, display: { xs: 'none', md: 'inline' } }}>
                    Table
                  </Typography>
                </Box>
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Count Pill */}
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<FilterAltIcon sx={{ fontSize: '16px !important' }} />}
            label={`${totalCount} Players`}
            size="small"
            sx={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#e5e7eb', fontWeight: 700 }}
          />
        </Box>
      </Box>

      {/* Row 2: Roster Ownership & Net Rooting Filters */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Ownership Toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
            Roster:
          </Typography>
          <ToggleButtonGroup
            size="small"
            value={filters.ownership}
            exclusive
            onChange={handleOwnershipChange}
            sx={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
          >
            <ToggleButton value="ALL" sx={{ px: 1.2, py: 0.5, fontSize: '0.74rem', fontWeight: 600 }}>
              All
            </ToggleButton>
            <ToggleButton
              value="MY_TEAM"
              sx={{
                px: 1.2,
                py: 0.5,
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#34d399',
                '&.Mui-selected': { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' },
              }}
            >
              🟢 My Roster
            </ToggleButton>
            <ToggleButton
              value="OPPONENT"
              sx={{
                px: 1.2,
                py: 0.5,
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#f87171',
                '&.Mui-selected': { backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171' },
              }}
            >
              🔴 Opponents
            </ToggleButton>
            <ToggleButton
              value="CONFLICT"
              sx={{
                px: 1.2,
                py: 0.5,
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#fbbf24',
                '&.Mui-selected': { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' },
              }}
            >
              <WarningAmberIcon sx={{ fontSize: 14, mr: 0.5 }} />
              Conflicted ({conflictCount})
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Net Rooting Stance Filter */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
            Rooting EV:
          </Typography>
          <ToggleButtonGroup
            size="small"
            value={filters.rootingFilter}
            exclusive
            onChange={handleRootingChange}
            sx={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
          >
            <ToggleButton value="ALL" sx={{ px: 1.2, py: 0.5, fontSize: '0.74rem', fontWeight: 600 }}>
              All
            </ToggleButton>
            <ToggleButton
              value="ROOT_FOR"
              sx={{
                px: 1.2,
                py: 0.5,
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#34d399',
                '&.Mui-selected': { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' },
              }}
            >
              <TrendingUpIcon sx={{ fontSize: 14, mr: 0.5 }} />
              Root FOR
            </ToggleButton>
            <ToggleButton
              value="ROOT_AGAINST"
              sx={{
                px: 1.2,
                py: 0.5,
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#f87171',
                '&.Mui-selected': { backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171' },
              }}
            >
              <TrendingDownIcon sx={{ fontSize: 14, mr: 0.5 }} />
              Root AGAINST
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Starters vs Bench Filter */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
            Lineup:
          </Typography>
          <ToggleButtonGroup
            size="small"
            value={filters.rosterSpot}
            exclusive
            onChange={handleRosterSpotChange}
            sx={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
          >
            <ToggleButton value="ALL" sx={{ px: 1, py: 0.5, fontSize: '0.74rem', fontWeight: 600 }}>
              All
            </ToggleButton>
            <ToggleButton value="STARTERS" sx={{ px: 1, py: 0.5, fontSize: '0.74rem', fontWeight: 600 }}>
              Starters
            </ToggleButton>
            <ToggleButton value="BENCH" sx={{ px: 1, py: 0.5, fontSize: '0.74rem', fontWeight: 600 }}>
              Bench
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Row 3: Position & Game Status */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Game Status Toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
            Game:
          </Typography>
          <ToggleButtonGroup
            size="small"
            value={filters.gameStatus}
            exclusive
            onChange={handleGameStatusChange}
            sx={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
          >
            <ToggleButton value="ALL" sx={{ px: 1.2, py: 0.5, fontSize: '0.74rem', fontWeight: 600 }}>
              All
            </ToggleButton>
            <ToggleButton
              value="LIVE"
              sx={{
                px: 1.2,
                py: 0.5,
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#34d399',
                '&.Mui-selected': { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' },
              }}
            >
              🔴 Live
            </ToggleButton>
            <ToggleButton value="PREGAME" sx={{ px: 1.2, py: 0.5, fontSize: '0.74rem', fontWeight: 600 }}>
              ⏰ Upcoming
            </ToggleButton>
            <ToggleButton value="FINAL" sx={{ px: 1.2, py: 0.5, fontSize: '0.74rem', fontWeight: 600 }}>
              🏁 Final
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Position Filter */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
            Pos:
          </Typography>
          <ToggleButtonGroup
            size="small"
            value={filters.position}
            exclusive
            onChange={handlePositionChange}
            sx={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
          >
            {(['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const).map((pos) => (
              <ToggleButton key={pos} value={pos} sx={{ px: 1.1, py: 0.5, fontSize: '0.74rem', fontWeight: 700 }}>
                {pos}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Box>
    </Box>
  );
};
