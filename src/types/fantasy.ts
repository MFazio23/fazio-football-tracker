export type PlatformType = 'espn' | 'yahoo';
export type ScoringFormat = 'PPR' | 'HALF_PPR' | 'STANDARD';
export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';
export type GameStatus = 'PREGAME' | 'LIVE' | 'FINAL';
export type RosterRole = 'my_team' | 'opponent';

export interface LeagueMatchup {
  myTeamName: string;
  myScore: number;
  myProjected: number;
  opponentTeamName: string;
  opponentScore: number;
  opponentProjected: number;
  winProbability?: number; // 0 to 100
}

export interface League {
  id: string;
  name: string;
  platform: PlatformType;
  priority: number; // 1 = highest / Main league, 6 = lowest
  isMain: boolean;
  scoringFormat: ScoringFormat;
  matchup: LeagueMatchup;
  espnConfig?: {
    leagueId: string;
    seasonId?: string;
    teamId?: number;
    swid?: string;
    espnS2?: string;
  };
  yahooConfig?: {
    leagueKey: string;
    teamId?: string;
  };
}

export interface PlayerGameInfo {
  opponent: string; // e.g. "BUF" or "@ NYJ"
  isHome: boolean;
  status: GameStatus;
  gameClock: string; // e.g. "Q3 04:18", "Sun 1:00 PM", "FINAL"
  teamScore?: number;
  opponentScore?: number;
  inRedZone?: boolean;
  hasPossession?: boolean;
}

export interface PlayerStats {
  summary: string; // e.g. "7 rec, 114 yds, 1 TD"
  passingYards?: number;
  passingTds?: number;
  interceptions?: number;
  rushingYards?: number;
  rushingTds?: number;
  receptions?: number;
  receivingYards?: number;
  receivingTds?: number;
  targets?: number;
}

export interface PlayerLeagueParticipation {
  leagueId: string;
  role: RosterRole; // Owned by user or on opponent roster
  points: number; // League-specific score
  projectedPoints: number;
  starterStatus: 'starter' | 'bench';
}

export interface Player {
  id: string;
  name: string;
  position: Position;
  nflTeam: string;
  headshotUrl: string;
  game: PlayerGameInfo;
  stats: PlayerStats;
  participations: PlayerLeagueParticipation[];
}

export type RootingStance = 'ROOT_FOR' | 'ROOT_AGAINST' | 'NEUTRAL';

export interface NetRootingResult {
  stance: RootingStance;
  netWeight: number;
  label: string;
  summary: string;
}

export interface FilterState {
  searchQuery: string;
  selectedLeagueIds: string[]; // empty means all leagues
  position: 'ALL' | Position;
  ownership: 'ALL' | 'MY_TEAM' | 'OPPONENT' | 'CONFLICT';
  gameStatus: 'ALL' | GameStatus;
  rosterSpot: 'ALL' | 'STARTERS' | 'BENCH';
  rootingFilter: 'ALL' | RootingStance;
  sortBy: 'MAIN_POINTS' | 'PROJECTED' | 'IMPORTANCE' | 'NET_IMPACT' | 'NAME';
  viewMode: 'CARDS' | 'TABLE';
}
