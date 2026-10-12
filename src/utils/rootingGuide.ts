import type { Player, League, NetRootingResult } from '../types/fantasy';

export function calculateNetRooting(player: Player, leagues: League[]): NetRootingResult {
  const leagueMap = new Map<string, League>(leagues.map((l) => [l.id, l]));
  const totalLeagues = leagues.length || 6;

  let netWeight = 0;
  let myCount = 0;
  let oppCount = 0;

  for (const part of player.participations) {
    const league = leagueMap.get(part.leagueId);
    if (!league) continue;

    // Weight: #1 priority has weight totalLeagues, #2 has totalLeagues - 1, etc.
    const weight = Math.max(1, totalLeagues + 1 - league.priority);

    if (part.role === 'my_team') {
      netWeight += weight;
      myCount++;
    } else {
      netWeight -= weight;
      oppCount++;
    }
  }

  if (oppCount === 0) {
    return {
      stance: 'ROOT_FOR',
      netWeight,
      label: 'Root FOR',
      summary: `Owned in ${myCount} of your leagues`,
    };
  }

  if (myCount === 0) {
    return {
      stance: 'ROOT_AGAINST',
      netWeight,
      label: 'Root AGAINST',
      summary: `Started against you in ${oppCount} league${oppCount > 1 ? 's' : ''}`,
    };
  }

  // Conflicted scenario
  if (netWeight > 0) {
    return {
      stance: 'ROOT_FOR',
      netWeight,
      label: `Net Root FOR (+${netWeight} EV)`,
      summary: `Owned in ${myCount}, facing in ${oppCount}. Favors your top leagues!`,
    };
  } else if (netWeight < 0) {
    return {
      stance: 'ROOT_AGAINST',
      netWeight,
      label: `Net Root AGAINST (${netWeight} EV)`,
      summary: `Facing in ${oppCount}, owned in ${myCount}. Hurts your top leagues!`,
    };
  } else {
    return {
      stance: 'NEUTRAL',
      netWeight: 0,
      label: 'Neutral Wash (0 EV)',
      summary: `Even trade-off across your leagues`,
    };
  }
}
