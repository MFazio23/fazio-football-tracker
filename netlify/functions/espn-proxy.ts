/**
 * Netlify Serverless Function: Stateless Pass-Through Relay for ESPN API requests.
 * Automatically detected and deployed by Netlify during standard builds.
 */

export const handler = async (event: any) => {
  // Handle CORS Preflight if applicable
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { url, swid, espnS2 } = body;

    if (!url) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing target URL' }),
      };
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
    };

    if (swid && espnS2) {
      headers['Cookie'] = `SWID=${swid}; espn_s2=${espnS2};`;
    }

    const response = await fetch(url, { headers });
    let text = await response.text();

    // Always prune ESPN fantasy response payload to prevent hitting AWS Lambda / Netlify 6MB limit
    try {
      const json = JSON.parse(text);
      if (json && json.teams && Array.isArray(json.teams)) {
        const currentWeek = json.scoringPeriodId || 1;

        const pruneEntry = (e: any) => {
          if (!e) return null;
          const p = e.playerPoolEntry?.player || {};
          const stats = (p.stats || [])
            .filter((s: any) => s.scoringPeriodId === currentWeek)
            .map((s: any) => ({
              scoringPeriodId: s.scoringPeriodId,
              statSourceId: s.statSourceId,
              appliedTotal: s.appliedTotal,
            }));

          return {
            playerId: e.playerId || p.id,
            lineupSlotId: e.lineupSlotId,
            playerPoolEntry: {
              appliedStatTotal: e.playerPoolEntry?.appliedStatTotal,
              player: {
                id: p.id,
                fullName: p.fullName,
                defaultPositionId: p.defaultPositionId,
                proTeamId: p.proTeamId,
                stats,
              },
            },
          };
        };

        const prunedSchedule = (json.schedule || [])
          .filter(
            (m: any) =>
              m.matchupPeriodId === currentWeek ||
              m.scoringPeriodId === currentWeek ||
              m.matchupPeriodId === currentWeek - 1 ||
              m.matchupPeriodId === currentWeek + 1
          )
          .map((m: any) => ({
            id: m.id,
            matchupPeriodId: m.matchupPeriodId,
            scoringPeriodId: m.scoringPeriodId,
            home: m.home
              ? {
                  teamId: m.home.teamId,
                  totalPoints: m.home.totalPoints,
                  totalProjectedPointsLive: m.home.totalProjectedPointsLive,
                  rosterForCurrentScoringPeriod: {
                    entries: (m.home.rosterForCurrentScoringPeriod?.entries || []).map(pruneEntry),
                  },
                }
              : null,
            away: m.away
              ? {
                  teamId: m.away.teamId,
                  totalPoints: m.away.totalPoints,
                  totalProjectedPointsLive: m.away.totalProjectedPointsLive,
                  rosterForCurrentScoringPeriod: {
                    entries: (m.away.rosterForCurrentScoringPeriod?.entries || []).map(pruneEntry),
                  },
                }
              : null,
          }));

        const prunedTeams = (json.teams || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          location: t.location,
          nickname: t.nickname,
          abbrev: t.abbrev,
          roster: {
            entries: (t.roster?.entries || []).map(pruneEntry),
          },
        }));

        const prunedPayload = {
          id: json.id,
          seasonId: json.seasonId,
          scoringPeriodId: json.scoringPeriodId,
          settings: {
            name: json.settings?.name,
          },
          teams: prunedTeams,
          schedule: prunedSchedule,
        };

        text = JSON.stringify(prunedPayload);
      }
    } catch {
      // Fallback to original text if JSON parse fails
    }

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: text,
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Internal proxy error' }),
    };
  }
};
