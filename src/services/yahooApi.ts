import type { League, Player, Position, RosterRole } from '../types/fantasy';
import { loadYahooTokens, saveYahooTokens, type YahooTokenData } from './storage';

export interface YahooTeamOption {
  teamKey: string;
  name: string;
  logoUrl?: string;
}

/**
 * Returns current valid access token, refreshing if necessary
 */
export async function getValidYahooAccessToken(): Promise<string | null> {
  const tokens = loadYahooTokens();
  if (!tokens || !tokens.accessToken) return null;

  // If token has at least 2 minutes remaining, use it
  const now = Date.now();
  if (tokens.expiresAt && tokens.expiresAt - now > 2 * 60 * 1000) {
    return tokens.accessToken;
  }

  // Token is expired or expiring soon, attempt refresh
  if (!tokens.refreshToken) return null;

  try {
    const res = await fetch('/api/yahoo-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'refresh_token',
        refreshToken: tokens.refreshToken,
        clientId: tokens.clientId,
        clientSecret: tokens.clientSecret,
      }),
    });

    if (!res.ok) {
      console.warn('Yahoo token refresh failed:', await res.text());
      return null;
    }

    const data = await res.json();
    const updated: YahooTokenData = {
      ...tokens,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || tokens.refreshToken,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };

    saveYahooTokens(updated);
    return updated.accessToken;
  } catch (err) {
    console.error('Error refreshing Yahoo token:', err);
    return null;
  }
}

/**
 * Fetches Yahoo Fantasy API endpoint through proxy
 */
export async function fetchYahooViaProxy(url: string): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  const token = await getValidYahooAccessToken();
  if (!token) {
    return { ok: false, status: 401, error: 'Yahoo not connected or token expired. Please connect Yahoo.' };
  }

  try {
    const res = await fetch('/api/yahoo-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, accessToken: token }),
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
      if (typeof data === 'object' && data) {
        if (typeof data.error === 'string') {
          errMsg = data.error;
        } else if (typeof data.error === 'object' && data.error) {
          errMsg = data.error.description || data.error.detail || JSON.stringify(data.error);
        } else if (data.description) {
          errMsg = data.description;
        }
      }
      return { ok: false, status: res.status, error: errMsg };
    }

    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 0, error: err.message || 'Network error reaching Yahoo proxy' };
  }
}

/**
 * Exchange auth code for tokens
 */
export async function exchangeYahooAuthCode(
  code: string,
  redirectUri: string,
  clientId?: string,
  clientSecret?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/yahoo-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'exchange_code',
        code,
        redirectUri,
        clientId,
        clientSecret,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      return { success: false, error: data.error || data.error_description || 'Failed to exchange Yahoo authorization code' };
    }

    const tokenData: YahooTokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      tokenType: data.token_type,
      clientId,
      clientSecret,
    };

    saveYahooTokens(tokenData);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during token exchange' };
  }
}

/**
 * Fetches user's current NFL leagues from Yahoo
 */
export async function fetchUserYahooLeagues(): Promise<{
  success: boolean;
  leagues: Array<{ leagueKey: string; name: string; season: string }>;
  error?: string;
}> {
  const url = 'https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_keys=nfl/leagues';
  const res = await fetchYahooViaProxy(url);

  if (!res.ok || !res.data) {
    return { success: false, leagues: [], error: res.error || 'Failed to fetch Yahoo leagues' };
  }

  try {
    const games = res.data.fantasy_content?.users?.[0]?.user?.[1]?.games || {};
    const count = games.count || 0;
    const leagueList: Array<{ leagueKey: string; name: string; season: string }> = [];

    for (let i = 0; i < count; i++) {
      const gameObj = games[i]?.game;
      if (!gameObj) continue;
      const gameLeagues = gameObj[1]?.leagues || {};
      const lCount = gameLeagues.count || 0;
      for (let j = 0; j < lCount; j++) {
        const l = gameLeagues[j]?.league?.[0];
        if (l) {
          leagueList.push({
            leagueKey: l.league_key,
            name: l.name,
            season: l.season,
          });
        }
      }
    }

    return { success: true, leagues: leagueList };
  } catch {
    return { success: false, leagues: [], error: 'Could not parse Yahoo leagues response.' };
  }
}

/**
 * Fetches league details and teams
 */
export async function testYahooLeagueConnection(leagueKey: string): Promise<{
  success: boolean;
  message: string;
  leagueName?: string;
  teams?: YahooTeamOption[];
}> {
  if (!leagueKey) return { success: false, message: 'League Key is required (e.g. 449.l.123456).' };

  const url = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/teams`;
  const res = await fetchYahooViaProxy(url);

  if (!res.ok || !res.data) {
    return { success: false, message: res.error || 'Failed to connect to Yahoo league.' };
  }

  try {
    const leagueMeta = res.data.fantasy_content?.league?.[0];
    const teamsData = res.data.fantasy_content?.league?.[1]?.teams || {};
    const leagueName = leagueMeta?.name || `Yahoo League ${leagueKey}`;
    const count = teamsData.count || 0;
    const teams: YahooTeamOption[] = [];

    for (let i = 0; i < count; i++) {
      const t = teamsData[i]?.team?.[0];
      if (t) {
        const tKey = t.find((item: any) => item.team_key)?.team_key;
        const name = t.find((item: any) => item.name)?.name || `Team ${i + 1}`;
        if (tKey) {
          teams.push({ teamKey: tKey, name });
        }
      }
    }

    return {
      success: true,
      leagueName,
      teams,
      message: `Connected successfully to "${leagueName}" (${teams.length} teams found)!`,
    };
  } catch {
    return { success: false, message: 'Could not parse Yahoo teams from response.' };
  }
}

/**
 * Maps Yahoo position string to tracker Position type
 */
function mapYahooPosition(pos: string): Position {
  const upper = (pos || '').toUpperCase();
  if (upper.includes('QB')) return 'QB';
  if (upper.includes('RB')) return 'RB';
  if (upper.includes('WR')) return 'WR';
  if (upper.includes('TE')) return 'TE';
  if (upper.includes('K')) return 'K';
  if (upper.includes('DEF') || upper.includes('D/ST')) return 'DEF';
  return 'WR';
}

/**
 * Synchronizes Yahoo League live matchup, score, and rosters
 */
export async function syncYahooLeague(
  league: League,
  selectedTeamKey: string,
  existingPlayers: Player[]
): Promise<{ updatedLeague: League; updatedPlayers: Player[] } | null> {
  const leagueKey = league.yahooConfig?.leagueKey;
  if (!leagueKey || !selectedTeamKey) return null;

  // 1. Fetch scoreboard for this week's head-to-head matchup
  const scoreboardUrl = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/scoreboard`;
  const sbRes = await fetchYahooViaProxy(scoreboardUrl);
  if (!sbRes.ok || !sbRes.data) return null;

  let myTeamName = league.matchup.myTeamName;
  let opponentTeamName = league.matchup.opponentTeamName;
  let myScore = league.matchup.myScore;
  let myProjected = league.matchup.myProjected;
  let opponentScore = league.matchup.opponentScore;
  let opponentProjected = league.matchup.opponentProjected;
  let opponentTeamKey: string | null = null;

  try {
    const matchups = sbRes.data.fantasy_content?.league?.[1]?.scoreboard?.['0']?.matchups || {};
    const mCount = matchups.count || 0;

    for (let i = 0; i < mCount; i++) {
      const match = matchups[i]?.matchup?.['0']?.teams;
      if (!match) continue;

      const teamA = match['0']?.team;
      const teamB = match['1']?.team;

      const teamAKey = teamA?.[0]?.find((item: any) => item.team_key)?.team_key;
      const teamBKey = teamB?.[0]?.find((item: any) => item.team_key)?.team_key;

      if (teamAKey === selectedTeamKey || teamBKey === selectedTeamKey) {
        const isTeamA = teamAKey === selectedTeamKey;
        const myTeamObj = isTeamA ? teamA : teamB;
        const oppTeamObj = isTeamA ? teamB : teamA;

        myTeamName = myTeamObj?.[0]?.find((item: any) => item.name)?.name || myTeamName;
        opponentTeamName = oppTeamObj?.[0]?.find((item: any) => item.name)?.name || opponentTeamName;
        opponentTeamKey = isTeamA ? teamBKey : teamAKey;

        myScore = parseFloat(myTeamObj?.[1]?.team_points?.total || String(myScore));
        myProjected = parseFloat(myTeamObj?.[1]?.team_projected_points?.total || String(myProjected));
        opponentScore = parseFloat(oppTeamObj?.[1]?.team_points?.total || String(opponentScore));
        opponentProjected = parseFloat(oppTeamObj?.[1]?.team_projected_points?.total || String(opponentProjected));
        break;
      }
    }
  } catch (err) {
    console.warn('Could not parse Yahoo scoreboard matchup:', err);
  }

  // 2. Fetch rosters for both teams
  const fetchRoster = async (teamKey: string): Promise<Array<{
    id: string;
    name: string;
    position: Position;
    nflTeam: string;
    headshotUrl: string;
    starterStatus: 'starter' | 'bench';
    points: number;
    projectedPoints: number;
  }>> => {
    const rosterUrl = `https://fantasysports.yahooapis.com/fantasy/v2/team/${teamKey}/roster/players/stats`;
    const res = await fetchYahooViaProxy(rosterUrl);
    if (!res.ok || !res.data) return [];

    try {
      const teamPlayers = res.data.fantasy_content?.team?.[1]?.roster?.[0]?.players || {};
      const count = teamPlayers.count || 0;
      const result = [];

      for (let i = 0; i < count; i++) {
        const pObj = teamPlayers[i]?.player;
        if (!pObj) continue;

        const info = pObj[0];
        const selectedPos = pObj[1]?.selected_position?.position || 'BN';
        const stats = pObj[3]?.player_points;

        const pKey = info?.find((item: any) => item.player_key)?.player_key || `yahoo-p-${i}`;
        const name = info?.find((item: any) => item.name)?.name?.full || `Player ${pKey}`;
        const nflTeam = (info?.find((item: any) => item.editorial_team_abbr)?.editorial_team_abbr || 'FA').toUpperCase();
        const displayPos = info?.find((item: any) => item.display_position)?.display_position || 'WR';
        const headshot = info?.find((item: any) => item.headshot)?.headshot?.url || '';

        const isStarter = selectedPos !== 'BN' && selectedPos !== 'IR';
        const points = parseFloat(stats?.total || '0');

        result.push({
          id: `yahoo-${pKey}`,
          name,
          position: mapYahooPosition(displayPos),
          nflTeam,
          headshotUrl: headshot,
          starterStatus: isStarter ? ('starter' as const) : ('bench' as const),
          points: Math.round(points * 10) / 10,
          projectedPoints: Math.round(points * 10) / 10,
        });
      }

      return result;
    } catch {
      return [];
    }
  };

  const myRoster = await fetchRoster(selectedTeamKey);
  const oppRoster = opponentTeamKey ? await fetchRoster(opponentTeamKey) : [];

  const updatedLeague: League = {
    ...league,
    matchup: {
      ...league.matchup,
      myTeamName,
      myScore: Math.round(myScore * 10) / 10,
      myProjected: Math.round(myProjected * 10) / 10,
      opponentTeamName,
      opponentScore: Math.round(opponentScore * 10) / 10,
      opponentProjected: Math.round(opponentProjected * 10) / 10,
    },
    yahooConfig: {
      ...league.yahooConfig,
      leagueKey,
      teamId: selectedTeamKey,
    },
  };

  // Clear previous participations for this league
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
          summary: `${pData.points} pts`,
        },
        participations: [participation],
      });
    }
  };

  for (const p of myRoster) upsertPlayer(p, 'my_team');
  for (const p of oppRoster) upsertPlayer(p, 'opponent');

  return { updatedLeague, updatedPlayers: playersList };
}
