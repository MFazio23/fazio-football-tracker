import type { Player, League, ScoringFormat } from '../types/fantasy';

export interface SimulatedPlayEvent {
  id: string;
  timestamp: string;
  playerName: string;
  team: string;
  description: string;
  pointsAdded: number;
  isTouchdown: boolean;
}

export function simulateLivePlay(
  currentPlayers: Player[],
  currentLeagues: League[]
): {
  updatedPlayers: Player[];
  updatedLeagues: League[];
  event: SimulatedPlayEvent | null;
} {
  const livePlayers = currentPlayers.filter((p) => p.game.status === 'LIVE');
  if (livePlayers.length === 0) {
    return { updatedPlayers: currentPlayers, updatedLeagues: currentLeagues, event: null };
  }

  // Pick a random live player
  const randomIndex = Math.floor(Math.random() * livePlayers.length);
  const targetPlayer = livePlayers[randomIndex];

  let playDescription = '';
  let standardPts = 0;
  let pprPts = 0;
  let halfPprPts = 0;
  let isTd = false;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (targetPlayer.position === 'WR' || targetPlayer.position === 'TE') {
    const isBigPlay = Math.random() < 0.25;
    if (isBigPlay) {
      isTd = true;
      const yards = Math.floor(Math.random() * 25) + 10;
      standardPts = 6 + yards * 0.1;
      halfPprPts = 6.5 + yards * 0.1;
      pprPts = 7 + yards * 0.1;
      playDescription = `TOUCHDOWN! ${targetPlayer.name} ${yards}-yard receiving TD!`;
    } else {
      const yards = Math.floor(Math.random() * 18) + 4;
      standardPts = yards * 0.1;
      halfPprPts = 0.5 + yards * 0.1;
      pprPts = 1.0 + yards * 0.1;
      playDescription = `${targetPlayer.name} ${yards}-yard reception`;
    }
  } else if (targetPlayer.position === 'RB') {
    const isBigPlay = Math.random() < 0.25;
    if (isBigPlay) {
      isTd = true;
      const yards = Math.floor(Math.random() * 15) + 2;
      standardPts = 6 + yards * 0.1;
      halfPprPts = 6 + yards * 0.1;
      pprPts = 6 + yards * 0.1;
      playDescription = `TOUCHDOWN! ${targetPlayer.name} ${yards}-yard rush into the endzone!`;
    } else {
      const isCatch = Math.random() < 0.4;
      if (isCatch) {
        const yards = Math.floor(Math.random() * 12) + 3;
        standardPts = yards * 0.1;
        halfPprPts = 0.5 + yards * 0.1;
        pprPts = 1.0 + yards * 0.1;
        playDescription = `${targetPlayer.name} catch for ${yards} yards out of backfield`;
      } else {
        const yards = Math.floor(Math.random() * 14) + 2;
        standardPts = yards * 0.1;
        halfPprPts = yards * 0.1;
        pprPts = yards * 0.1;
        playDescription = `${targetPlayer.name} carries for ${yards} yards`;
      }
    }
  } else if (targetPlayer.position === 'QB') {
    const isTdPass = Math.random() < 0.3;
    if (isTdPass) {
      isTd = true;
      const yards = Math.floor(Math.random() * 30) + 12;
      const pts = 4 + yards * 0.04;
      standardPts = pts;
      halfPprPts = pts;
      pprPts = pts;
      playDescription = `TOUCHDOWN PASS! ${targetPlayer.name} fires a ${yards}-yard TD strike!`;
    } else {
      const isRush = Math.random() < 0.3;
      if (isRush) {
        const yards = Math.floor(Math.random() * 10) + 2;
        const pts = yards * 0.1;
        standardPts = pts;
        halfPprPts = pts;
        pprPts = pts;
        playDescription = `${targetPlayer.name} scrambles for ${yards} yards`;
      } else {
        const yards = Math.floor(Math.random() * 22) + 6;
        const pts = yards * 0.04;
        standardPts = pts;
        halfPprPts = pts;
        pprPts = pts;
        playDescription = `${targetPlayer.name} completes pass for ${yards} yards`;
      }
    }
  } else if (targetPlayer.position === 'K') {
    const is50 = Math.random() < 0.4;
    const pts = is50 ? 5 : 3;
    standardPts = pts;
    halfPprPts = pts;
    pprPts = pts;
    playDescription = `${targetPlayer.name} drills ${is50 ? '51-yard' : '38-yard'} Field Goal!`;
  } else {
    // DEF
    const isSack = Math.random() < 0.6;
    const pts = isSack ? 1 : 2;
    standardPts = pts;
    halfPprPts = pts;
    pprPts = pts;
    playDescription = isSack ? `${targetPlayer.name} brings down the QB for a sack (-7 yds)` : `${targetPlayer.name} forces and recovers a FUMBLE!`;
  }

  // Calculate points to add per scoring format
  const getPtsToAdd = (format: ScoringFormat) => {
    switch (format) {
      case 'PPR':
        return pprPts;
      case 'HALF_PPR':
        return halfPprPts;
      case 'STANDARD':
        return standardPts;
      default:
        return pprPts;
    }
  };

  // Create league score deltas
  const leagueDeltas: Record<string, { myDelta: number; oppDelta: number }> = {};

  const updatedPlayers = currentPlayers.map((player) => {
    if (player.id !== targetPlayer.id) return player;

    const newParticipations = player.participations.map((part) => {
      const league = currentLeagues.find((l) => l.id === part.leagueId);
      const format = league?.scoringFormat || 'PPR';
      const added = getPtsToAdd(format);
      const roundedAdded = Math.round(added * 10) / 10;
      const newScore = Math.round((part.points + roundedAdded) * 10) / 10;

      if (!leagueDeltas[part.leagueId]) {
        leagueDeltas[part.leagueId] = { myDelta: 0, oppDelta: 0 };
      }
      if (part.role === 'my_team') {
        leagueDeltas[part.leagueId].myDelta += roundedAdded;
      } else {
        leagueDeltas[part.leagueId].oppDelta += roundedAdded;
      }

      return {
        ...part,
        points: newScore,
      };
    });

    return {
      ...player,
      participations: newParticipations,
      game: {
        ...player.game,
        inRedZone: isTd ? false : Math.random() < 0.4,
      },
    };
  });

  const updatedLeagues = currentLeagues.map((league) => {
    const deltas = leagueDeltas[league.id];
    if (!deltas) return league;

    return {
      ...league,
      matchup: {
        ...league.matchup,
        myScore: Math.round((league.matchup.myScore + deltas.myDelta) * 10) / 10,
        opponentScore: Math.round((league.matchup.opponentScore + deltas.oppDelta) * 10) / 10,
      },
    };
  });

  const event: SimulatedPlayEvent = {
    id: `play-${Date.now()}`,
    timestamp: timeStr,
    playerName: targetPlayer.name,
    team: targetPlayer.nflTeam,
    description: playDescription,
    pointsAdded: Math.round(pprPts * 10) / 10,
    isTouchdown: isTd,
  };

  return { updatedPlayers, updatedLeagues, event };
}
