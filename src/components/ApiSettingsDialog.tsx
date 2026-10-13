import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  TextField,
  Tabs,
  Tab,
  Alert,
  Divider,
  Paper,
  CircularProgress,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import InfoIcon from '@mui/icons-material/Info';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import KeyIcon from '@mui/icons-material/Key';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import type { League, Player } from '../types/fantasy';
import { testEspnLeagueConnection, syncEspnLeague, type EspnTeamOption } from '../services/espnApi';
import { arePlayersSame, getPreferredDisplayName } from '../utils/playerMatcher';


interface ApiSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  leagues: League[];
  players: Player[];
  onSaveLeagues: (updatedLeagues: League[]) => void;
  onSyncEspnLeague: (updatedLeague: League, updatedPlayers: Player[]) => void;
  onResetAllData: () => void;
}

export const ApiSettingsDialog: React.FC<ApiSettingsDialogProps> = ({
  open,
  onClose,
  leagues,
  players,
  onSaveLeagues,
  onSyncEspnLeague,
  onResetAllData,
}) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [localLeagues, setLocalLeagues] = useState<League[]>(leagues);
  const [testResult, setTestResult] = useState<{ loading: boolean; message?: string; success?: boolean } | null>(null);

  const initialSwid = leagues.find((l) => l.espnConfig?.swid)?.espnConfig?.swid || '';
  const initialS2 = leagues.find((l) => l.espnConfig?.espnS2)?.espnConfig?.espnS2 || '';
  const [accountSwid, setAccountSwid] = useState<string>(initialSwid);
  const [accountEspnS2, setAccountEspnS2] = useState<string>(initialS2);
  const [appliedNotice, setAppliedNotice] = useState<boolean>(false);

  // Teams discovered from ESPN
  const [leagueTeams, setLeagueTeams] = useState<Record<string, EspnTeamOption[]>>({});
  const [selectedTeams, setSelectedTeams] = useState<Record<string, number>>({});
  const [syncingMap, setSyncingMap] = useState<Record<string, boolean>>({});

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setLocalLeagues(leagues);
      setTestResult(null);
      setAppliedNotice(false);
      const s = leagues.find((l) => l.espnConfig?.swid)?.espnConfig?.swid || '';
      const s2 = leagues.find((l) => l.espnConfig?.espnS2)?.espnConfig?.espnS2 || '';
      setAccountSwid(s);
      setAccountEspnS2(s2);
    }
  }

  const espnLeagues = localLeagues.filter((l) => l.platform === 'espn');

  const updateEspnConfig = (leagueId: string, field: string, value: string) => {
    setLocalLeagues((prev) =>
      prev.map((l) => {
        if (l.id !== leagueId) return l;
        return {
          ...l,
          espnConfig: {
            ...l.espnConfig,
            leagueId: l.espnConfig?.leagueId || '',
            [field]: value,
          },
        };
      })
    );
  };

  const handleApplyAccountCookiesToAll = () => {
    setLocalLeagues((prev) =>
      prev.map((l) => {
        if (l.platform !== 'espn') return l;
        return {
          ...l,
          espnConfig: {
            leagueId: l.espnConfig?.leagueId || '',
            seasonId: l.espnConfig?.seasonId || '2026',
            swid: accountSwid.trim(),
            espnS2: accountEspnS2.trim(),
          },
        };
      })
    );
    setAppliedNotice(true);
    setTimeout(() => setAppliedNotice(false), 5000);
  };

  // Yahoo Import State
  const [yahooJsonInput, setYahooJsonInput] = useState<string>('');
  const [targetYahooLeagueId, setTargetYahooLeagueId] = useState<string>(
    leagues.find((l) => l.platform === 'yahoo')?.id || 'yahoo-1'
  );

  const handleImportYahooMatchup = () => {
    try {
      if (!yahooJsonInput.trim()) {
        setTestResult({ success: false, loading: false, message: 'Please paste the JSON payload copied by the Tampermonkey script.' });
        return;
      }

      const parsed = JSON.parse(yahooJsonInput.trim());
      const rawLeagues = Array.isArray(parsed) ? parsed : [parsed];

      if (rawLeagues.length === 0 || !rawLeagues[0].matchup) {
        throw new Error('Invalid JSON format: missing matchup data');
      }

      let currentLeagues = [...localLeagues];
      let currentPlayers = [...players];
      const importedLeagueNames: string[] = [];

      for (let i = 0; i < rawLeagues.length; i++) {
        const data = rawLeagues[i];
        if (!data.matchup) continue;

        // Find existing target league by leagueId or matching platform/id
        let targetLeague = currentLeagues.find(
          (l) => l.platform === 'yahoo' && (l.id === `yahoo-${data.leagueId}` || l.yahooConfig?.leagueKey?.includes(data.leagueId))
        );

        // Fallback: match by selected targetYahooLeagueId if only 1 item and user selected one
        if (!targetLeague && rawLeagues.length === 1) {
          targetLeague = currentLeagues.find((l) => l.id === targetYahooLeagueId);
        }

        // Fallback: find any available Yahoo league slot not yet updated in this run
        if (!targetLeague) {
          targetLeague = currentLeagues.find(
            (l) => l.platform === 'yahoo' && !importedLeagueNames.includes(l.name)
          );
        }

        const leagueIdToUse = targetLeague ? targetLeague.id : `yahoo-${data.leagueId || (i + 1)}`;
        const importedName = data.leagueName && !['League', 'Yahoo League', ''].includes(data.leagueName.trim()) && !data.leagueName.startsWith('Yahoo League ')
          ? data.leagueName.trim()
          : (targetLeague?.name || `Yahoo League ${data.leagueId || (i + 1)}`);

        const updatedLeague: League = {
          id: leagueIdToUse,
          name: importedName,
          platform: 'yahoo',
          priority: targetLeague?.priority ?? (currentLeagues.length + 1),
          importance: targetLeague?.importance ?? 3,
          isMain: targetLeague?.isMain ?? false,
          scoringFormat: targetLeague?.scoringFormat ?? 'HALF_PPR',
          yahooConfig: {
            leagueKey: data.leagueId ? `nfl.l.${data.leagueId}` : (targetLeague?.yahooConfig?.leagueKey || ''),
          },
          matchup: {
            myTeamName: data.matchup.myTeamName || targetLeague?.matchup.myTeamName || 'My Team',
            myScore: Number(data.matchup.myScore) || 0,
            myProjected: Number(data.matchup.myProjected) || 0,
            opponentTeamName: data.matchup.opponentTeamName || targetLeague?.matchup.opponentTeamName || 'Opponent',
            opponentScore: Number(data.matchup.opponentScore) || 0,
            opponentProjected: Number(data.matchup.opponentProjected) || 0,
            winProbability: data.matchup.winProbability !== undefined ? Number(data.matchup.winProbability) : targetLeague?.matchup.winProbability,
          },
        };

        // Update currentLeagues
        if (targetLeague) {
          currentLeagues = currentLeagues.map((l) => (l.id === updatedLeague.id ? updatedLeague : l));
        } else {
          currentLeagues.push(updatedLeague);
        }

        importedLeagueNames.push(updatedLeague.name);

        // Merge players for this league
        let updatedPlayersList = currentPlayers
          .map((p) => ({
            ...p,
            participations: p.participations.filter((part) => part.leagueId !== updatedLeague.id),
          }))
          .filter((p) => p.participations.length > 0);

        const upsertPlayer = (pData: any, role: 'my_team' | 'opponent') => {
          const pName = pData.name.trim();
          const existingIndex = updatedPlayersList.findIndex(
            (p) =>
              p.name.toLowerCase() === pName.toLowerCase() ||
              arePlayersSame(p.name, p.nflTeam, p.position, pName, pData.nflTeam, pData.position)
          );

          const participation = {
            leagueId: updatedLeague.id,
            role,
            points: Number(pData.points) || 0,
            projectedPoints: Number(pData.projectedPoints) || Number(pData.points) || 0,
            starterStatus: pData.starterStatus as 'starter' | 'bench',
          };

          if (existingIndex >= 0) {
            const ex = updatedPlayersList[existingIndex];
            updatedPlayersList[existingIndex] = {
              ...ex,
              name: getPreferredDisplayName(ex.name, pName),
              position: pData.position || ex.position,
              nflTeam: (pData.nflTeam && pData.nflTeam !== 'FA') ? pData.nflTeam : ex.nflTeam,
              headshotUrl: ex.headshotUrl && !ex.headshotUrl.includes('default.png') ? ex.headshotUrl : (pData.headshotUrl || ex.headshotUrl),
              participations: [...ex.participations, participation],
            };
          } else {
            updatedPlayersList.push({
              id: `yahoo-${pName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              name: pName,
              position: pData.position || 'WR',
              nflTeam: pData.nflTeam || 'FA',
              headshotUrl:
                pData.headshotUrl ||
                (pData.position === 'DEF'
                  ? `https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500/${(pData.nflTeam || 'nfl').toLowerCase()}.png`
                  : 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/default.png'),
              game: {
                opponent: 'vs NFL',
                isHome: true,
                status: 'PREGAME',
                gameClock: 'Scheduled',
              },
              stats: {
                summary: `${pData.points} pts`,
              },
              participations: [participation],
            });
          }
        };

        (data.myPlayers || []).forEach((p: any) => upsertPlayer(p, 'my_team'));
        (data.oppPlayers || []).forEach((p: any) => upsertPlayer(p, 'opponent'));

        currentPlayers = updatedPlayersList;
      }

      onSaveLeagues(currentLeagues);
      setLocalLeagues(currentLeagues);
      // Update global players state via onSyncEspnLeague with the last or first updated league
      onSyncEspnLeague(currentLeagues.find((l) => l.name === importedLeagueNames[0]) || currentLeagues[0], currentPlayers);
      setYahooJsonInput('');

      setTestResult({
        success: true,
        loading: false,
        message: `Successfully imported ${rawLeagues.length} Yahoo league(s) (${importedLeagueNames.join(', ')})! All rosters and matchups updated.`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        loading: false,
        message: `Failed to import Yahoo matchup: ${err.message}`,
      });
    }
  };

  const handleTestEspn = async (league: League) => {
    setTestResult({ loading: true });
    const cfg = league.espnConfig;
    const res = await testEspnLeagueConnection(
      cfg?.leagueId || '',
      cfg?.seasonId || '2026',
      cfg?.swid || accountSwid,
      cfg?.espnS2 || accountEspnS2
    );

    setTestResult({
      loading: false,
      success: res.success,
      message: res.message,
    });

    if (res.success && res.teams && res.teams.length > 0) {
      setLeagueTeams((prev) => ({ ...prev, [league.id]: res.teams || [] }));
      setSelectedTeams((prev) => ({
        ...prev,
        [league.id]: prev[league.id] || res.teams?.[0]?.id || 1,
      }));
    }
  };

  const handleSyncLeague = async (league: League, explicitTeamId?: number) => {
    const teamId = explicitTeamId || selectedTeams[league.id] || league.espnConfig?.teamId;
    if (!teamId) {
      setTestResult({ success: false, loading: false, message: 'Please select which team is yours first.' });
      return;
    }

    setSyncingMap((prev) => ({ ...prev, [league.id]: true }));
    try {
      const result = await syncEspnLeague(league, teamId, players);
      if (result) {
        onSyncEspnLeague(result.updatedLeague, result.updatedPlayers);
        setLocalLeagues((prev) =>
          prev.map((l) => (l.id === result.updatedLeague.id ? result.updatedLeague : l))
        );
        setTestResult({
          success: true,
          loading: false,
          message: `Successfully synced "${result.updatedLeague.name}"! Matchup: ${result.updatedLeague.matchup.myTeamName} (${result.updatedLeague.matchup.myScore} pts) vs ${result.updatedLeague.matchup.opponentTeamName} (${result.updatedLeague.matchup.opponentScore} pts). Starters & opponent loaded!`,
        });
      } else {
        setTestResult({ success: false, loading: false, message: 'Could not parse league schedule or roster.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, loading: false, message: err.message || 'Error during sync' });
    } finally {
      setSyncingMap((prev) => ({ ...prev, [league.id]: false }));
    }
  };

  const handleSave = async () => {
    // 1. Prepare updated leagues with chosen team IDs
    const updatedLeagues = localLeagues.map((l) => {
      const teamId = selectedTeams[l.id];
      if (l.platform === 'espn' && teamId) {
        return {
          ...l,
          espnConfig: {
            ...l.espnConfig,
            leagueId: l.espnConfig?.leagueId || '',
            seasonId: l.espnConfig?.seasonId || '2026',
            teamId,
          },
        };
      }
      return l;
    });

    // 2. Perform sync for configured ESPN leagues sequentially
    let currentPlayers = players;
    const finalLeagues = [...updatedLeagues];

    for (let i = 0; i < finalLeagues.length; i++) {
      const l = finalLeagues[i];
      if (l.platform === 'espn' && l.espnConfig?.leagueId && l.espnConfig?.teamId) {
        setSyncingMap((prev) => ({ ...prev, [l.id]: true }));
        try {
          const result = await syncEspnLeague(l, l.espnConfig.teamId, currentPlayers);
          if (result) {
            finalLeagues[i] = result.updatedLeague;
            currentPlayers = result.updatedPlayers;
            onSyncEspnLeague(result.updatedLeague, result.updatedPlayers);
          }
        } catch (err) {
          console.error('Error auto-syncing league during save:', err);
        } finally {
          setSyncingMap((prev) => ({ ...prev, [l.id]: false }));
        }
      }
    }

    onSaveLeagues(finalLeagues);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            backgroundColor: '#111726',
            backgroundImage: 'none',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#f3f4f6' }}>
            API Integrations & Credentials
          </Typography>
          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
            Stateless pass-through proxy enabled for direct ESPN private leagues
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#9ca3af' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)} textColor="primary" indicatorColor="primary">
          <Tab label="ESPN Leagues (4)" sx={{ fontWeight: 700 }} />
          <Tab label="Yahoo Import (2)" sx={{ fontWeight: 700 }} />
          <Tab label="Live Simulation / Reset" sx={{ fontWeight: 700 }} />
        </Tabs>
      </Box>

      <DialogContent sx={{ py: 2.5 }}>
        {testResult && (
          <Alert
            severity={testResult.loading ? 'info' : testResult.success ? 'success' : 'error'}
            sx={{ mb: 2 }}
            icon={testResult.loading ? <CircularProgress size={18} /> : undefined}
          >
            {testResult.loading
              ? 'Connecting via proxy...'
              : typeof testResult.message === 'string'
              ? testResult.message
              : JSON.stringify(testResult.message)}
          </Alert>
        )}

        {/* Tab 0: ESPN Leagues */}
        {tabIndex === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Account Level S2 / SWID Card */}
            <Paper
              sx={{
                p: 2,
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 2.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <KeyIcon sx={{ color: '#34d399', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#34d399' }}>
                  Single-Sign-On: ESPN Account Cookies
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mb: 1.5 }}>
                Your <code>SWID</code> and <code>espn_s2</code> belong to your ESPN user account. Enter them once here,
                and click <strong>"Apply to All ESPN Leagues"</strong> to unlock all 3 of your private leagues simultaneously!
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 1.5 }}>
                <TextField
                  label="Account SWID"
                  size="small"
                  value={accountSwid}
                  onChange={(e) => setAccountSwid(e.target.value)}
                  placeholder="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"
                  helperText="From espn.com > DevTools > Application > Cookies"
                />
                <TextField
                  label="Account espn_s2"
                  size="small"
                  value={accountEspnS2}
                  onChange={(e) => setAccountEspnS2(e.target.value)}
                  placeholder="AEB... (long token)"
                  helperText="Lasts for ~1 full year across all leagues"
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={handleApplyAccountCookiesToAll}
                >
                  Apply Account Cookies to All 4 ESPN Leagues
                </Button>
                {appliedNotice && (
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#10b981' }} />}
                    label="Applied to all ESPN leagues!"
                    size="small"
                    sx={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 700 }}
                  />
                )}
              </Box>
            </Paper>

            <Alert severity="info" icon={<InfoIcon fontSize="inherit" />}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Stateless Pass-Through Proxy Active:
              </Typography>
              <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block' }}>
                Your tokens stay strictly in your personal browser's LocalStorage. When testing or fetching, requests
                relay through the local proxy so ESPN responds without CORS or browser cookie restrictions.
              </Typography>
            </Alert>

            {/* Individual ESPN Leagues */}
            {espnLeagues.map((league) => {
              const discoveredTeams = leagueTeams[league.id] || [];
              const selectedTeam = selectedTeams[league.id];
              const isSyncing = syncingMap[league.id] || false;

              return (
                <Paper
                  key={league.id}
                  sx={{
                    p: 2,
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fff' }}>
                        #{league.priority} {league.name}
                      </Typography>
                      {league.espnConfig?.espnS2 && (
                        <Chip
                          label="Cookies Set"
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                          }}
                        />
                      )}
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<LinkIcon />}
                      onClick={() => handleTestEspn(league)}
                    >
                      Test Connect
                    </Button>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 1.5 }}>
                    <TextField
                      label="ESPN League ID"
                      size="small"
                      value={league.espnConfig?.leagueId || ''}
                      onChange={(e) => updateEspnConfig(league.id, 'leagueId', e.target.value)}
                      placeholder="e.g. 10482914"
                    />
                    <TextField
                      label="Season Year"
                      size="small"
                      value={league.espnConfig?.seasonId || '2026'}
                      onChange={(e) => updateEspnConfig(league.id, 'seasonId', e.target.value)}
                    />
                    <TextField
                      label="SWID (Optional Override)"
                      size="small"
                      value={league.espnConfig?.swid || ''}
                      onChange={(e) => updateEspnConfig(league.id, 'swid', e.target.value)}
                      placeholder="{...}"
                    />
                    <TextField
                      label="espn_s2 (Optional Override)"
                      size="small"
                      value={league.espnConfig?.espnS2 || ''}
                      onChange={(e) => updateEspnConfig(league.id, 'espnS2', e.target.value)}
                      placeholder="AEB..."
                    />
                  </Box>

                  {/* If teams were discovered from ESPN API, show Team Selector & Sync Button */}
                  {discoveredTeams.length > 0 && (
                    <Box
                      sx={{
                        p: 1.5,
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: 1.5,
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 1.5,
                        alignItems: { sm: 'center' },
                      }}
                    >
                      <FormControl size="small" sx={{ minWidth: 200, flexGrow: 1 }}>
                        <InputLabel>Select Your Team</InputLabel>
                        <Select
                          value={selectedTeam || ''}
                          label="Select Your Team"
                          onChange={(e) =>
                            setSelectedTeams((prev) => ({
                              ...prev,
                              [league.id]: Number(e.target.value),
                            }))
                          }
                        >
                          {discoveredTeams.map((t) => (
                            <MenuItem key={t.id} value={t.id}>
                              {t.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        disabled={isSyncing}
                        startIcon={isSyncing ? <CircularProgress size={16} /> : <CloudDownloadIcon />}
                        onClick={() => handleSyncLeague(league)}
                      >
                        {isSyncing ? 'Syncing...' : 'Sync Live Matchup & Rosters'}
                      </Button>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Box>
        )}

        {/* Tab 1: Yahoo Matchup Import */}
        {tabIndex === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Paper
              sx={{
                p: 2.5,
                backgroundColor: 'rgba(96, 165, 250, 0.08)',
                border: '1px solid rgba(96, 165, 250, 0.25)',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CloudDownloadIcon sx={{ color: '#60a5fa' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fff' }}>
                  Import Yahoo Fantasy Matchup
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 1.5 }}>
                Use our Tampermonkey userscript (located at <code>scripts/yahoo-matchup-exporter.user.js</code>) on your Yahoo fantasy matchup screen. Click the floating green <strong>"Export to Football Tracker"</strong> button on Yahoo to copy your matchup JSON to your clipboard, then paste it below.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl size="small" sx={{ maxWidth: 350 }}>
                  <InputLabel>Target Yahoo League</InputLabel>
                  <Select
                    value={targetYahooLeagueId}
                    label="Target Yahoo League"
                    onChange={(e) => setTargetYahooLeagueId(e.target.value)}
                  >
                    {localLeagues
                      .filter((l) => l.platform === 'yahoo')
                      .map((l) => (
                        <MenuItem key={l.id} value={l.id}>
                          #{l.priority} {l.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Paste Yahoo Matchup JSON"
                  multiline
                  rows={6}
                  value={yahooJsonInput}
                  onChange={(e) => setYahooJsonInput(e.target.value)}
                  placeholder='Paste the JSON copied from Yahoo here (e.g. { "leagueName": "...", "matchup": { ... } })'
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                  }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 1.5 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<CloudDownloadIcon />}
                    onClick={handleImportYahooMatchup}
                    disabled={!yahooJsonInput.trim()}
                  >
                    Import & Update Matchup
                  </Button>
                </Box>
              </Box>
            </Paper>

            <Alert severity="info" icon={<InfoIcon fontSize="inherit" />}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Tampermonkey Script Setup:
              </Typography>
              <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block' }}>
                Open Tampermonkey &gt; Create a new script &gt; Paste the contents of <code>scripts/yahoo-matchup-exporter.user.js</code>. Whenever you open your Yahoo fantasy league or matchup, a one-click copy button will be waiting for you.
              </Typography>
            </Alert>
          </Box>
        )}

        {/* Tab 2: Reset & Simulation Info */}
        {tabIndex === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff' }}>
              Data Management & Demo Mode
            </Typography>
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              The application runs with a live real-time simulation engine. Clicking "Simulate Play" in the header or enabling periodic polling creates live touchdown and yardage plays, updates player cards, and recalculates all 6 league matchups on the fly.
            </Typography>

            <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f87171' }}>
                  Reset All Leagues and Player Data
                </Typography>
                <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                  Restores default 6 leagues (4 ESPN, 2 Yahoo) and full starter roster statistics.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="error"
                startIcon={<RestartAltIcon />}
                onClick={() => {
                  onResetAllData();
                  onClose();
                }}
              >
                Reset to Default
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: '#9ca3af' }}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={handleSave} sx={{ px: 3 }}>
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};
