import { useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeProvider, CssBaseline, Box, Container } from '@mui/material';
import { darkTheme } from './theme/theme';
import { Header } from './components/Header';
import { MatchupBoard } from './components/MatchupBoard';
import { PlayerFilterBar } from './components/PlayerFilterBar';
import { PlayerGrid } from './components/PlayerGrid';
import { PriorityManagerDialog } from './components/PriorityManagerDialog';
import { ApiSettingsDialog } from './components/ApiSettingsDialog';
import type { League, Player, FilterState } from './types/fantasy';
import {
  loadStoredLeagues,
  saveStoredLeagues,
  loadStoredPlayers,
  saveStoredPlayers,
  loadStoredSettings,
  saveStoredSettings,
} from './services/storage';
import { INITIAL_LEAGUES, INITIAL_PLAYERS } from './data/initialData';
import { simulateLivePlay } from './services/liveSimulation';
import type { SimulatedPlayEvent } from './services/liveSimulation';
import { fetchLiveNflScoreboard } from './services/espnApi';
import { calculateNetRooting } from './utils/rootingGuide';

export function App() {
  const [leagues, setLeagues] = useState<League[]>(loadStoredLeagues);
  const [players, setPlayers] = useState<Player[]>(loadStoredPlayers);
  const [settings, setSettings] = useState(loadStoredSettings);
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [latestEvent, setLatestEvent] = useState<SimulatedPlayEvent | null>(null);

  // Dialog states
  const [priorityDialogOpen, setPriorityDialogOpen] = useState<boolean>(false);
  const [apiDialogOpen, setApiDialogOpen] = useState<boolean>(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedLeagueIds: [],
    position: 'ALL',
    ownership: 'ALL',
    gameStatus: 'ALL',
    rosterSpot: 'ALL',
    rootingFilter: 'ALL',
    sortBy: 'MAIN_POINTS',
    viewMode: 'CARDS',
  });

  // Persist on change
  useEffect(() => {
    saveStoredLeagues(leagues);
  }, [leagues]);

  useEffect(() => {
    saveStoredPlayers(players);
  }, [players]);

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);



  // Identify designated Main League (priority 1 or flagged isMain)
  const mainLeague = useMemo(() => {
    const explicitlyMain = leagues.find((l) => l.isMain);
    if (explicitlyMain) return explicitlyMain;
    const sorted = [...leagues].sort((a, b) => a.priority - b.priority);
    return sorted[0] || leagues[0];
  }, [leagues]);

  const mainLeagueId = mainLeague ? mainLeague.id : '';

  // Trigger simulated play
  const triggerSimulation = useCallback(() => {
    const { updatedPlayers, updatedLeagues, event } = simulateLivePlay(players, leagues);
    setPlayers(updatedPlayers);
    setLeagues(updatedLeagues);
    if (event) {
      setLatestEvent(event);
      setTimeout(() => setLatestEvent(null), 8000);
    }
    const now = new Date();
    setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, [players, leagues]);

  // Manual / auto refresh routine
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Check live ESPN NFL scoreboard
      const liveNfl = await fetchLiveNflScoreboard();
      if (Object.keys(liveNfl).length > 0) {
        setPlayers((prev) =>
          prev.map((player) => {
            const teamNfl = liveNfl[player.nflTeam];
            if (!teamNfl) return player;
            return {
              ...player,
              game: {
                ...player.game,
                status: teamNfl.status,
                gameClock: teamNfl.gameClock,
                teamScore: teamNfl.teamScore,
                opponentScore: teamNfl.opponentScore,
                opponent: teamNfl.opponent,
                isHome: teamNfl.isHome,
                inRedZone: teamNfl.inRedZone,
              },
            };
          })
        );
      }

      // 2. Only simulate a play if auto-simulation setting is enabled
      if (settings.autoSimulate) {
        triggerSimulation();
      }
    } catch (err) {
      console.error('Error during refresh:', err);
    } finally {
      setIsRefreshing(false);
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [triggerSimulation, settings.autoSimulate]);

  // Polling Timer
  useEffect(() => {
    if (settings.refreshIntervalSeconds <= 0) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, settings.refreshIntervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [settings.refreshIntervalSeconds, handleRefresh]);

  // Toggle filter by league card click
  const handleToggleLeagueFilter = (leagueId: string) => {
    if (leagueId === 'RESET_ALL') {
      setFilters((prev) => ({ ...prev, selectedLeagueIds: [] }));
      return;
    }
    setFilters((prev) => {
      const exists = prev.selectedLeagueIds.includes(leagueId);
      return {
        ...prev,
        selectedLeagueIds: exists
          ? prev.selectedLeagueIds.filter((id) => id !== leagueId)
          : [...prev.selectedLeagueIds, leagueId],
      };
    });
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      selectedLeagueIds: [],
      position: 'ALL',
      ownership: 'ALL',
      gameStatus: 'ALL',
      rosterSpot: 'ALL',
      rootingFilter: 'ALL',
      sortBy: 'MAIN_POINTS',
      viewMode: 'CARDS',
    });
  };

  // Reset data to defaults
  const handleResetAllData = () => {
    setLeagues(INITIAL_LEAGUES);
    setPlayers(INITIAL_PLAYERS);
    saveStoredLeagues(INITIAL_LEAGUES);
    saveStoredPlayers(INITIAL_PLAYERS);
    setLatestEvent(null);
  };

  // Filtered & Sorted Players
  const { filteredPlayers, totalCount, conflictCount } = useMemo(() => {
    let list = [...players];

    // Count conflicts globally among all players
    const conflicts = list.filter((p) => {
      const hasMy = p.participations.some((part) => part.role === 'my_team');
      const hasOpp = p.participations.some((part) => part.role === 'opponent');
      return hasMy && hasOpp;
    }).length;

    // 1. Search Query
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.nflTeam.toLowerCase().includes(query) ||
          p.position.toLowerCase().includes(query)
      );
    }

    // 2. League selection filter
    if (filters.selectedLeagueIds.length > 0) {
      list = list.filter((p) =>
        p.participations.some((part) => filters.selectedLeagueIds.includes(part.leagueId))
      );
    }

    // 3. Ownership filter
    if (filters.ownership === 'MY_TEAM') {
      list = list.filter((p) => p.participations.some((part) => part.role === 'my_team'));
    } else if (filters.ownership === 'OPPONENT') {
      list = list.filter((p) => p.participations.some((part) => part.role === 'opponent'));
    } else if (filters.ownership === 'CONFLICT') {
      list = list.filter((p) => {
        const hasMy = p.participations.some((part) => part.role === 'my_team');
        const hasOpp = p.participations.some((part) => part.role === 'opponent');
        return hasMy && hasOpp;
      });
    }

    // 4. Net Rooting Filter
    if (filters.rootingFilter !== 'ALL') {
      list = list.filter((p) => {
        const r = calculateNetRooting(p, leagues);
        return r.stance === filters.rootingFilter;
      });
    }

    // 5. Starters vs Bench filter
    if (filters.rosterSpot === 'STARTERS') {
      list = list.filter((p) => p.participations.some((part) => part.starterStatus === 'starter'));
    } else if (filters.rosterSpot === 'BENCH') {
      list = list.filter((p) => p.participations.some((part) => part.starterStatus === 'bench'));
    }

    // 6. Game Status filter
    if (filters.gameStatus !== 'ALL') {
      list = list.filter((p) => p.game.status === filters.gameStatus);
    }

    // 7. Position filter
    if (filters.position !== 'ALL') {
      list = list.filter((p) => p.position === filters.position);
    }

    // 8. Sorting
    list.sort((a, b) => {
      if (filters.sortBy === 'MAIN_POINTS') {
        const ptsA = a.participations.find((p) => p.leagueId === mainLeagueId)?.points ?? a.participations[0]?.points ?? 0;
        const ptsB = b.participations.find((p) => p.leagueId === mainLeagueId)?.points ?? b.participations[0]?.points ?? 0;
        return ptsB - ptsA;
      }
      if (filters.sortBy === 'PROJECTED') {
        const projA = a.participations.find((p) => p.leagueId === mainLeagueId)?.projectedPoints ?? a.participations[0]?.projectedPoints ?? 0;
        const projB = b.participations.find((p) => p.leagueId === mainLeagueId)?.projectedPoints ?? b.participations[0]?.projectedPoints ?? 0;
        return projB - projA;
      }
      if (filters.sortBy === 'NET_IMPACT') {
        const rootA = calculateNetRooting(a, leagues).netWeight;
        const rootB = calculateNetRooting(b, leagues).netWeight;
        return rootB - rootA;
      }
      if (filters.sortBy === 'IMPORTANCE') {
        return b.participations.length - a.participations.length;
      }
      if (filters.sortBy === 'NAME') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return { filteredPlayers: list, totalCount: list.length, conflictCount: conflicts };
  }, [players, filters, mainLeagueId, leagues]);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0d14' }}>
        {/* App Header */}
        <Header
          lastUpdated={lastUpdated}
          refreshInterval={settings.refreshIntervalSeconds}
          onRefreshIntervalChange={(sec) => setSettings((s) => ({ ...s, refreshIntervalSeconds: sec }))}
          onManualRefresh={handleRefresh}
          onSimulatePlay={triggerSimulation}
          onOpenPriorityManager={() => setPriorityDialogOpen(true)}
          onOpenSettings={() => setApiDialogOpen(true)}
          isRefreshing={isRefreshing}
        />

        {/* Main Content Dashboard */}
        <Container maxWidth="xl" sx={{ flexGrow: 1, px: { xs: 1.5, sm: 3 }, py: 2.5 }}>
          {/* Top League Matchup Board */}
          <MatchupBoard
            leagues={leagues}
            selectedLeagueIds={filters.selectedLeagueIds}
            onToggleLeagueFilter={handleToggleLeagueFilter}
          />

          {/* Filter Bar with View Mode & Rooting Controls */}
          <PlayerFilterBar
            filters={filters}
            onFilterChange={setFilters}
            leagues={leagues}
            totalCount={totalCount}
            conflictCount={conflictCount}
          />

          {/* Player Cards or Table View */}
          <PlayerGrid
            players={filteredPlayers}
            leagues={leagues}
            mainLeagueId={mainLeagueId}
            latestEvent={latestEvent}
            viewMode={filters.viewMode}
            onResetFilters={handleResetFilters}
          />
        </Container>

        {/* Priority & League Importance Manager Dialog */}
        <PriorityManagerDialog
          open={priorityDialogOpen}
          onClose={() => setPriorityDialogOpen(false)}
          leagues={leagues}
          onSaveLeagues={(updated) => setLeagues(updated)}
        />

        {/* API Settings & Credentials Dialog */}
        <ApiSettingsDialog
          open={apiDialogOpen}
          onClose={() => setApiDialogOpen(false)}
          leagues={leagues}
          players={players}
          onSaveLeagues={(updated) => setLeagues(updated)}
          onSyncEspnLeague={(updatedLeague, updatedPlayers) => {
            setLeagues((prev) => prev.map((l) => (l.id === updatedLeague.id ? updatedLeague : l)));
            setPlayers(updatedPlayers);
          }}
          onResetAllData={handleResetAllData}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
