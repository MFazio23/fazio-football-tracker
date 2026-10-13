// ==UserScript==
// @name         Yahoo Fantasy Matchup Exporter (Multi-League API Edition)
// @namespace    https://football-tracker.mfazio.dev/
// @version      2.1.0
// @description  Export official Yahoo Fantasy Football rosters, matchups, and stats for all active leagues directly via internal read-only API
// @author       Michael Fazio
// @match        https://football.fantasysports.yahoo.com/*
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const POS_MAP = {
    QB: 'QB',
    RB: 'RB',
    WR: 'WR',
    TE: 'TE',
    K: 'K',
    DEF: 'DEF',
    DST: 'DEF',
    'D/ST': 'DEF',
    LB: 'DEF',
    DT: 'DEF',
    DE: 'DEF',
    CB: 'DEF',
    S: 'DEF',
    DL: 'DEF',
    DB: 'DEF',
    IDP: 'DEF',
  };

  function normalizePos(pos) {
    if (!pos) return 'WR';
    const clean = pos.toUpperCase().trim();
    return POS_MAP[clean] || (['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(clean) ? clean : 'WR');
  }

  async function fetchYahooApi(endpoint) {
    const res = await fetch(`https://pub-api-ro.fantasysports.yahoo.com${endpoint}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`API error HTTP ${res.status} on ${endpoint}`);
    }
    return res.json();
  }

  function transformRosterPlayer(pObj) {
    const p = pObj.player || pObj;
    const name = p.name?.full || `${p.name?.first || ''} ${p.name?.last || ''}`.trim() || 'Unknown Player';
    const rawPos = p.display_position || p.primary_position || 'WR';
    const position = normalizePos(rawPos);
    const nflTeam = (p.editorial_team_abbr || 'FA').toUpperCase();
    const headshotUrl = p.headshot?.url || p.image_url || '';

    const slot = (p.selected_position?.position || '').toUpperCase();
    const isStarter = slot !== 'BN' && slot !== 'BENCH' && slot !== 'IR';

    const points = parseFloat(p.player_points?.total || '0') || 0;
    const projected = parseFloat(p.player_projected_points?.total || '0') || points;

    return {
      name,
      position,
      nflTeam,
      headshotUrl,
      starterStatus: isStarter ? 'starter' : 'bench',
      points: Math.round(points * 10) / 10,
      projectedPoints: Math.round(projected * 10) / 10,
    };
  }

  async function exportSingleLeague(leagueId, gameKey, initialLeagueName, initialMyTeamKey) {
    let myTeamKey = initialMyTeamKey;
    let leagueName = initialLeagueName;

    // 1. Fetch league metadata if name is missing or generic
    if (!leagueName || leagueName.startsWith('Yahoo League')) {
      const meta = await fetchYahooApi(
        `/fantasy/v2/league/${gameKey}.l.${leagueId}/metadata?format=json_f`
      ).catch(() => null);
      const fetchedName = meta?.fantasy_content?.league?.name;
      if (fetchedName) {
        leagueName = fetchedName;
      }
    }

    const fullLeagueKey = `${gameKey}.l.${leagueId}`;

    // If myTeamKey isn't resolved yet, fetch user teams for this league
    if (!myTeamKey) {
      const teamMeta = await fetchYahooApi(
        `/fantasy/v2/users;use_login=1/games;game_keys=${gameKey}/leagues;league_keys=${fullLeagueKey}/teams?format=json_f`
      ).catch(() => null);

      const leagueObj = teamMeta?.fantasy_content?.users?.[0]?.user?.games?.[0]?.game?.leagues?.[0]?.league;
      if (leagueObj) {
        if (!leagueName) leagueName = leagueObj.name;
        const myTeamObj = (leagueObj.teams || []).find((t) => t.team?.is_owned_by_current_login === 1);
        if (myTeamObj) {
          myTeamKey = myTeamObj.team.team_key;
        }
      }
    }

    if (!myTeamKey) {
      myTeamKey = `${fullLeagueKey}.t.1`;
    }

    // 2. Fetch Matchups list for this team
    const matchupData = await fetchYahooApi(
      `/fantasy/v2/team/${myTeamKey}/matchups?format=json_f`
    );

    const allMatchups = matchupData.fantasy_content?.team?.matchups || [];
    const urlParams = new URLSearchParams(window.location.search);
    const currentWeekParam = urlParams.get('week');

    // Find active week matchup
    let activeMatchup = currentWeekParam
      ? allMatchups.find((m) => String(m.matchup?.week) === String(currentWeekParam))
      : allMatchups.find((m) => m.matchup?.status === 'midevent' || m.matchup?.status === 'preevent') ||
        allMatchups[allMatchups.length - 1];

    if (!activeMatchup) {
      activeMatchup = allMatchups[0];
    }

    const m = activeMatchup?.matchup;
    if (!m) {
      throw new Error(`No matchup data returned for league ${leagueId}`);
    }

    const weekNum = m.week || 1;
    const teams = m.teams || [];
    const myTeamApi = teams.find((t) => t.team?.team_key === myTeamKey) || teams[0];
    const oppTeamApi = teams.find((t) => t.team?.team_key !== myTeamKey) || teams[1] || teams[0];

    const myTeamName = myTeamApi?.team?.name || 'My Team';
    const oppTeamName = oppTeamApi?.team?.name || 'Opponent';
    const oppTeamKey = oppTeamApi?.team?.team_key;

    const myScore = parseFloat(myTeamApi?.team?.team_points?.total || '0') || 0;
    const myProjected = parseFloat(myTeamApi?.team?.team_projected_points?.total || '0') || myScore;
    const oppScore = parseFloat(oppTeamApi?.team?.team_points?.total || '0') || 0;
    const oppProjected = parseFloat(oppTeamApi?.team?.team_projected_points?.total || '0') || oppScore;

    // Check official win probability on page if on current league page
    let winProbability = undefined;
    const currentPathMatch = window.location.pathname.match(/\/f1\/(\d+)/);
    if (currentPathMatch && currentPathMatch[1] === leagueId) {
      const probText = document.body.innerText;
      const favMatch = probText.match(/(?:Favorite|Chance to win|Win prob(?:ability)?)\s*[:\s]?\s*(\d+)%/i);
      if (favMatch) {
        winProbability = parseInt(favMatch[1], 10);
      }
    }

    // Fallback win probability calculation if not on page or not found
    if (winProbability === undefined) {
      if (myScore > 0 || oppScore > 0 || myProjected > 0 || oppProjected > 0) {
        const spread = myProjected - oppProjected;
        // Standard normal CDF approximation for fantasy spreads
        const prob = Math.round(100 / (1 + Math.exp(-spread / 12)));
        winProbability = Math.max(1, Math.min(99, prob));
      }
    }

    // 3. Fetch Full Roster (players, positions, headshots, and stats) for both teams
    const [myRosterData, oppRosterData] = await Promise.all([
      fetchYahooApi(
        `/fantasy/v2/team/${myTeamKey}/roster;week=${weekNum}/players/stats?format=json_f`
      ).catch(() =>
        fetchYahooApi(`/fantasy/v2/team/${myTeamKey}/roster;week=${weekNum}?format=json_f`)
      ),
      oppTeamKey
        ? fetchYahooApi(
            `/fantasy/v2/team/${oppTeamKey}/roster;week=${weekNum}/players/stats?format=json_f`
          ).catch(() =>
            fetchYahooApi(`/fantasy/v2/team/${oppTeamKey}/roster;week=${weekNum}?format=json_f`)
          )
        : Promise.resolve(null),
    ]);

    const myRawPlayers = myRosterData?.fantasy_content?.team?.roster?.players || [];
    const oppRawPlayers = oppRosterData?.fantasy_content?.team?.roster?.players || [];

    const myPlayers = myRawPlayers.map(transformRosterPlayer);
    const oppPlayers = oppRawPlayers.map(transformRosterPlayer);

    return {
      exportedAt: new Date().toISOString(),
      leagueId,
      leagueName: leagueName || `Yahoo League ${leagueId}`,
      platform: 'yahoo',
      matchup: {
        myTeamName,
        myScore: Math.round(myScore * 10) / 10,
        myProjected: Math.round(myProjected * 10) / 10,
        opponentTeamName: oppTeamName,
        opponentScore: Math.round(oppScore * 10) / 10,
        opponentProjected: Math.round(oppProjected * 10) / 10,
        winProbability,
      },
      myPlayers,
      oppPlayers,
    };
  }

  async function exportAllActiveLeagues() {
    const btn = document.getElementById('fft-export-btn');
    if (btn) btn.textContent = '⏳ Fetching All Yahoo Leagues...';

    try {
      // 1. Fetch user games & teams to discover active NFL leagues for the current season
      const userMeta = await fetchYahooApi(
        `/fantasy/v2/users;use_login=1/games;game_codes=nfl/teams?format=json_f`
      );

      const games = userMeta.fantasy_content?.users?.[0]?.user?.games || [];
      // Pick the most recent/active NFL game season (first game entry is usually active season)
      const activeGame = games.find((g) => g.game?.season === '2026' || g.game?.is_game_over === 0) || games[0];
      const gameKey = activeGame?.game?.game_key || '470';
      const teams = activeGame?.game?.teams || [];

      // Filter to valid active teams with league keys
      const activeLeaguesList = [];
      for (const t of teams) {
        const teamObj = t.team;
        if (!teamObj || !teamObj.team_key) continue;

        // team_key looks like "470.l.444541.t.1"
        const parts = teamObj.team_key.split('.l.');
        if (parts.length >= 2) {
          const lId = parts[1].split('.t.')[0];
          // avoid duplicates
          if (!activeLeaguesList.some((al) => al.leagueId === lId)) {
            // Also grab league name from teamObj if present or fetch metadata
            activeLeaguesList.push({
              leagueId: lId,
              gameKey: parts[0] || gameKey,
              myTeamKey: teamObj.team_key,
              myTeamName: teamObj.name,
            });
          }
        }
      }

      // Fallback: If no teams returned from /teams endpoint, try current page URL
      if (activeLeaguesList.length === 0) {
        const urlMatch = window.location.pathname.match(/\/f1\/(\d+)/);
        if (urlMatch) {
          activeLeaguesList.push({
            leagueId: urlMatch[1],
            gameKey: '470',
            myTeamKey: '',
          });
        }
      }

      if (activeLeaguesList.length === 0) {
        throw new Error('No active Yahoo Fantasy Football leagues found for this user account.');
      }

      if (btn) btn.textContent = `⏳ Exporting ${activeLeaguesList.length} League(s)...`;

      // 2. Fetch matchups and rosters for each active league in parallel
      const results = await Promise.all(
        activeLeaguesList.map((al) =>
          exportSingleLeague(al.leagueId, al.gameKey, '', al.myTeamKey)
        )
      );

      // JSON payload is an array of leagues (or single object if only 1)
      const payload = results.length === 1 ? results[0] : results;
      const jsonStr = JSON.stringify(payload, null, 2);

      if (typeof GM_setClipboard !== 'undefined') {
        GM_setClipboard(jsonStr);
      } else {
        navigator.clipboard.writeText(jsonStr);
      }

      const leagueSummary = results
        .map((r) => `• ${r.leagueName}: ${r.matchup.myTeamName} (${r.matchup.myScore}) vs ${r.matchup.opponentTeamName} (${r.matchup.opponentScore})`)
        .join('\n');

      alert(
        `✅ Yahoo Matchups Exported (${results.length} Active League${results.length > 1 ? 's' : ''})!\n\n` +
          `${leagueSummary}\n\n` +
          `Copied to clipboard. Paste into your Football Tracker to sync all Yahoo leagues at once!`
      );
    } catch (err) {
      alert(`❌ Error exporting Yahoo leagues: ${err.message}`);
      console.error(err);
    } finally {
      if (btn) btn.textContent = '🏈 Export to Football Tracker';
    }
  }

  function injectExportButton() {
    if (document.getElementById('fft-export-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'fft-export-btn';
    btn.textContent = '🏈 Export to Football Tracker';
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '99999';
    btn.style.backgroundColor = '#10b981';
    btn.style.color = '#ffffff';
    btn.style.border = 'none';
    btn.style.borderRadius = '8px';
    btn.style.padding = '12px 18px';
    btn.style.fontSize = '14px';
    btn.style.fontWeight = '700';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    btn.style.transition = 'all 0.2s ease';

    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = '#059669';
      btn.style.transform = 'scale(1.04)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = '#10b981';
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', exportAllActiveLeagues);

    document.body.appendChild(btn);
  }

  injectExportButton();
  const observer = new MutationObserver(() => injectExportButton());
  observer.observe(document.body, { childList: true, subtree: true });
})();
