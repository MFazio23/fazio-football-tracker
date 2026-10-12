import type { League, Player, Position, RosterRole } from '../types/fantasy';

export interface EspnTeamOption {
  id: number;
  name: string;
}

export interface EspnLeagueSyncResult {
  leagueName: string;
  currentWeek: number;
  teams: EspnTeamOption[];
  updatedLeague?: League;
  syncedPlayers?: Player[];
}

/**
 * Maps ESPN lineupSlotId to starter vs bench.
 * 20 = Bench, 21 = IR. All others (0=QB, 2=RB, 4=WR, 6=TE, 16=D/ST, 17=K, 23=FLEX) are starters.
 */
export function isEspnStarter(lineupSlotId: number): boolean {
  return lineupSlotId !== 20 && lineupSlotId !== 21;
}

/**
 * Maps ESPN defaultPositionId to standard Position
 * 1 = QB, 2 = RB, 3 = WR, 4 = TE, 5 = K, 16 = D/ST
 */
export function mapEspnPosition(posId: number): Position {
  switch (posId) {
    case 1:
      return 'QB';
    case 2:
      return 'RB';
    case 3:
      return 'WR';
    case 4:
      return 'TE';
    case 5:
      return 'K';
    case 16:
      return 'DEF';
    default:
      return 'WR';
  }
}

/**
 * ESPN pro team ID to NFL abbreviation
 */
const ESPN_PRO_TEAMS: Record<number, string> = {
  1: 'ATL',
  2: 'BUF',
  3: 'CHI',
  4: 'CIN',
  5: 'CLE',
  6: 'DAL',
  7: 'DEN',
  8: 'DET',
  9: 'GB',
  10: 'TEN',
  11: 'IND',
  12: 'KC',
  13: 'LV',
  14: 'LAR',
  15: 'MIA',
  16: 'MIN',
  17: 'NE',
  18: 'NO',
  19: 'NYG',
  20: 'NYJ',
  21: 'PHI',
  22: 'ARI',
  23: 'PIT',
  24: 'LAC',
  25: 'SF',
  26: 'SEA',
  27: 'TB',
  28: 'WSH',
  29: 'CAR',
  30: 'JAX',
  33: 'BAL',
  34: 'HOU',
};

/**
 * Fetches real NFL game scores and game clock in real-time from public ESPN scoreboard API
 */
export async function fetchLiveNflScoreboard(): Promise<
  Record<
    string,
    {
      status: 'PREGAME' | 'LIVE' | 'FINAL';
      gameClock: string;
      teamScore: number;
      opponentScore: number;
      opponent: string;
      isHome: boolean;
      inRedZone: boolean;
    }
  >
> {
  try {
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
    if (!res.ok) {
      throw new Error(`ESPN Scoreboard returned status ${res.status}`);
    }
    const data = await res.json();
    const result: Record<string, any> = {};

    for (const event of data.events || []) {
      const comp = event.competitions?.[0];
      if (!comp) continue;

      const home = comp.competitors?.find((c: any) => c.homeAway === 'home');
      const away = comp.competitors?.find((c: any) => c.homeAway === 'away');
      if (!home || !away) continue;

      const state = event.status?.type?.state;
      const statusType: 'PREGAME' | 'LIVE' | 'FINAL' =
        state === 'post' ? 'FINAL' : state === 'in' ? 'LIVE' : 'PREGAME';

      const homeAbbr = home.team?.abbreviation;
      const awayAbbr = away.team?.abbreviation;

      const clockDetail = event.status?.type?.shortDetail || event.status?.displayClock || 'Scheduled';
      const isRedZone = comp.situation?.isRedZone || false;

      if (homeAbbr) {
        result[homeAbbr] = {
          status: statusType,
          gameClock: clockDetail,
          teamScore: parseInt(home.score || '0', 10),
          opponentScore: parseInt(away.score || '0', 10),
          opponent: `vs ${awayAbbr}`,
          isHome: true,
          inRedZone: isRedZone && comp.situation?.possession === home.team?.id,
        };
      }

      if (awayAbbr) {
        result[awayAbbr] = {
          status: statusType,
          gameClock: clockDetail,
          teamScore: parseInt(away.score || '0', 10),
          opponentScore: parseInt(home.score || '0', 10),
          opponent: `@ ${homeAbbr}`,
          isHome: false,
          inRedZone: isRedZone && comp.situation?.possession === away.team?.id,
        };
      }
    }

    return result;
  } catch (err) {
    console.warn('Failed to fetch ESPN NFL scoreboard live data, continuing with cached/simulated data:', err);
    return {};
  }
}

/**
 * Builds request headers and URL for ESPN Fantasy League API v3
 */
export function getEspnFantasyUrl(leagueId: string, seasonId: string = '2024', scoringPeriodId?: number): string {
  const base = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonId}/segments/0/leagues/${leagueId}`;
  const views = ['mMatchup', 'mRoster', 'mSettings', 'mTeam'];
  const viewParams = views.map((v) => `view=${v}`).join('&');
  return scoringPeriodId ? `${base}?scoringPeriodId=${scoringPeriodId}&${viewParams}` : `${base}?${viewParams}`;
}

/**
 * Sends a request to ESPN API via the local/serverless pass-through proxy
 */
export async function fetchEspnViaProxy(
  targetUrl: string,
  swid?: string,
  espnS2?: string
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  try {
    const res = await fetch('/api/espn-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl, swid, espnS2 }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      if (res.status === 401 || res.status === 403) {
        errMsg = 'ESPN 401/403: Private league. Requires valid SWID and espn_s2 cookies.';
      } else if (res.status === 404) {
        errMsg = 'ESPN 404: League not found. Check your League ID and Season year.';
      } else if (typeof data === 'object' && data.error) {
        errMsg = data.error;
      }
      return { ok: false, status: res.status, error: errMsg };
    }

    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 0, error: err.message || 'Network error reaching proxy' };
  }
}

/**
 * Tests connection to an ESPN league and retrieves available teams
 */
export async function testEspnLeagueConnection(
  leagueId: string,
  seasonId: string = '2024',
  swid?: string,
  espnS2?: string
): Promise<{
  success: boolean;
  message: string;
  leagueName?: string;
  teamCount?: number;
  currentWeek?: number;
  teams?: EspnTeamOption[];
}> {
  if (!leagueId) {
    return { success: false, message: 'League ID is required.' };
  }

  const url = getEspnFantasyUrl(leagueId, seasonId);
  const result = await fetchEspnViaProxy(url, swid, espnS2);

  if (!result.ok) {
    return { success: false, message: result.error || 'Failed to connect to ESPN league.' };
  }

  const data = result.data;
  const leagueName = data.settings?.name || `ESPN League ${leagueId}`;
  const currentWeek = data.scoringPeriodId || 1;

  const teams: EspnTeamOption[] = (data.teams || []).map((t: any) => {
    const teamName = t.name || `${t.location || ''} ${t.nickname || ''}`.trim() || `Team ${t.id}`;
    return { id: t.id, name: teamName };
  });

  return {
    success: true,
    leagueName,
    teamCount: teams.length,
    currentWeek,
    teams,
    message: `Connected successfully! League: "${leagueName}" (${teams.length} teams, Week ${currentWeek})`,
  };
}

/**
 * Fetches real ESPN league data and synchronizes matchups and player rosters
 */
export async function syncEspnLeague(
  league: League,
  selectedTeamId: number,
  existingPlayers: Player[]
): Promise<{ updatedLeague: League; updatedPlayers: Player[] } | null> {
  const cfg = league.espnConfig;
  if (!cfg?.leagueId) return null;

  const seasonId = cfg.seasonId || '2024';
  const url = getEspnFantasyUrl(cfg.leagueId, seasonId);
  const result = await fetchEspnViaProxy(url, cfg.swid, cfg.espnS2);

  if (!result.ok || !result.data) return null;

  const data = result.data;
  const currentWeek = data.scoringPeriodId || 1;
  const teams = data.teams || [];
  const schedule = data.schedule || [];

  const myTeam = teams.find((t: any) => t.id === selectedTeamId);
  if (!myTeam) return null;

  const myTeamName = myTeam.name || `${myTeam.location || ''} ${myTeam.nickname || ''}`.trim() || `Team ${myTeam.id}`;

  // Find this week's matchup
  const thisWeekMatchup = schedule.find(
    (m: any) =>
      (m.matchupPeriodId === currentWeek || m.scoringPeriodId === currentWeek) &&
      (m.home?.teamId === selectedTeamId || m.away?.teamId === selectedTeamId)
  );

  let opponentTeamId: number | null = null;
  let myScore = 0;
  let myProjected = 0;
  let opponentScore = 0;
  let opponentProjected = 0;

  if (thisWeekMatchup) {
    const isHome = thisWeekMatchup.home?.teamId === selectedTeamId;
    const myData = isHome ? thisWeekMatchup.home : thisWeekMatchup.away;
    const oppData = isHome ? thisWeekMatchup.away : thisWeekMatchup.home;

    opponentTeamId = oppData?.teamId ?? null;

    // Helper to calculate total team starter points and projections
    const calculateMatchupTeamScores = (matchData: any, teamId: number) => {
      const entries = matchData?.rosterForCurrentScoringPeriod?.entries || [];
      let totalPts = 0;
      let totalProj = 0;

      for (const e of entries) {
        if (isEspnStarter(e.lineupSlotId)) {
          const pts = e.playerPoolEntry?.appliedStatTotal || 0;
          totalPts += pts;

          const teamObj = teams.find((t: any) => t.id === teamId);
          const tPlayer = teamObj?.roster?.entries?.find(
            (re: any) => (re.playerPoolEntry?.player?.id || re.playerId) === (e.playerPoolEntry?.player?.id || e.playerId)
          );
          const stats = tPlayer?.playerPoolEntry?.player?.stats || e.playerPoolEntry?.player?.stats || [];
          const projStats = stats.find((s: any) => s.scoringPeriodId === currentWeek && s.statSourceId === 1);
          totalProj += projStats?.appliedTotal ?? pts;
        }
      }

      return {
        score: Math.round(totalPts * 10) / 10,
        projected: Math.round(totalProj * 10) / 10,
      };
    };

    const myCalc = calculateMatchupTeamScores(myData, selectedTeamId);
    const oppCalc = opponentTeamId ? calculateMatchupTeamScores(oppData, opponentTeamId) : { score: 0, projected: 0 };

    myScore = (myData?.totalPoints && myData.totalPoints > 0) ? Math.round(myData.totalPoints * 10) / 10 : myCalc.score;
    myProjected = myData?.totalProjectedPointsLive ? Math.round(myData.totalProjectedPointsLive * 10) / 10 : myCalc.projected;

    opponentScore = (oppData?.totalPoints && oppData.totalPoints > 0) ? Math.round(oppData.totalPoints * 10) / 10 : oppCalc.score;
    opponentProjected = oppData?.totalProjectedPointsLive ? Math.round(oppData.totalProjectedPointsLive * 10) / 10 : oppCalc.projected;
  }

  const oppTeam = opponentTeamId ? teams.find((t: any) => t.id === opponentTeamId) : null;
  const oppTeamName = oppTeam
    ? oppTeam.name || `${oppTeam.location || ''} ${oppTeam.nickname || ''}`.trim() || `Team ${opponentTeamId}`
    : 'Opponent';

  const updatedLeague: League = {
    ...league,
    name: data.settings?.name || league.name,
    matchup: {
      ...league.matchup,
      myTeamName,
      myScore,
      myProjected,
      opponentTeamName: oppTeamName,
      opponentScore,
      opponentProjected,
    },
  };

  // Helper to extract players from a team's roster (using current scoring period roster when available)
  const extractRosterPlayers = (team: any, matchData?: any): Array<{
    id: string;
    name: string;
    position: Position;
    nflTeam: string;
    headshotUrl: string;
    starterStatus: 'starter' | 'bench';
    points: number;
    projectedPoints: number;
  }> => {
    const matchEntries = matchData?.rosterForCurrentScoringPeriod?.entries;
    const entries = matchEntries && matchEntries.length > 0 ? matchEntries : (team?.roster?.entries || []);

    return entries.map((e: any) => {
      const p = e.playerPoolEntry?.player || {};
      const playerId = String(p.id || e.playerId);
      const name = p.fullName || `Player ${playerId}`;
      const position = mapEspnPosition(p.defaultPositionId || 3);
      const nflTeam = ESPN_PRO_TEAMS[p.proTeamId] || 'FA';
      const isStarter = isEspnStarter(e.lineupSlotId);

      // Matchup player appliedStatTotal has the actual live week points
      const liveAppliedPts = e.playerPoolEntry?.appliedStatTotal;

      // Find projection from team roster stats
      const teamPlayer = team?.roster?.entries?.find(
        (re: any) => (re.playerPoolEntry?.player?.id || re.playerId) === (p.id || e.playerId)
      );
      const stats = teamPlayer?.playerPoolEntry?.player?.stats || p.stats || [];
      const currentStats = stats.find((s: any) => s.scoringPeriodId === currentWeek && s.statSourceId === 0);
      const projStats = stats.find((s: any) => s.scoringPeriodId === currentWeek && s.statSourceId === 1);

      const pts = Math.round((liveAppliedPts !== undefined ? liveAppliedPts : (currentStats?.appliedTotal || 0)) * 10) / 10;
      const proj = Math.round((projStats?.appliedTotal ?? pts) * 10) / 10;

      return {
        id: `espn-${playerId}`,
        name,
        position,
        nflTeam,
        headshotUrl:
          position === 'DEF'
            ? `https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500/${nflTeam.toLowerCase()}.png`
            : `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${playerId}.png`,
        starterStatus: isStarter ? 'starter' : 'bench',
        points: pts,
        projectedPoints: proj,
      };
    });
  };

  const isHome = thisWeekMatchup?.home?.teamId === selectedTeamId;
  const myMatchData = thisWeekMatchup ? (isHome ? thisWeekMatchup.home : thisWeekMatchup.away) : undefined;
  const oppMatchData = thisWeekMatchup ? (isHome ? thisWeekMatchup.away : thisWeekMatchup.home) : undefined;

  const myPlayers = extractRosterPlayers(myTeam, myMatchData);
  const oppPlayers = oppTeam ? extractRosterPlayers(oppTeam, oppMatchData) : [];

  // Clear previous participations for this league so real roster cleanly replaces old mock data
  let playersList = existingPlayers
    .map((p) => ({
      ...p,
      participations: p.participations.filter((part) => part.leagueId !== league.id),
    }))
    .filter((p) => p.participations.length > 0);

  const upsertPlayer = (pData: any, role: RosterRole) => {
    const existingIndex = playersList.findIndex(
      (p) => p.name.toLowerCase() === pData.name.toLowerCase() || p.id === pData.id
    );

    const participation = {
      leagueId: league.id,
      role,
      points: pData.points,
      projectedPoints: pData.projectedPoints,
      starterStatus: pData.starterStatus,
    };

    if (existingIndex >= 0) {
      const existing = playersList[existingIndex];
      const otherParts = existing.participations.filter((part) => part.leagueId !== league.id);
      playersList[existingIndex] = {
        ...existing,
        headshotUrl: existing.headshotUrl || pData.headshotUrl,
        participations: [...otherParts, participation],
      };
    } else {
      playersList.push({
        id: pData.id,
        name: pData.name,
        position: pData.position,
        nflTeam: pData.nflTeam,
        headshotUrl: pData.headshotUrl,
        game: {
          opponent: 'vs NFL',
          isHome: true,
          status: 'LIVE',
          gameClock: 'Q2 10:00',
        },
        stats: {
          summary: `${pData.points} pts in Week ${currentWeek}`,
        },
        participations: [participation],
      });
    }
  };

  for (const p of myPlayers) upsertPlayer(p, 'my_team');
  for (const p of oppPlayers) upsertPlayer(p, 'opponent');

  return { updatedLeague, updatedPlayers: playersList };
}
