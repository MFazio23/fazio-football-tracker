// ==UserScript==
// @name         Yahoo Fantasy Matchup Exporter (API Edition)
// @namespace    https://football-tracker.mfazio.dev/
// @version      2.0.0
// @description  Export official Yahoo Fantasy Football rosters, matchups, and stats directly via internal read-only API
// @author       Michael Fazio
// @match        https://football.fantasysports.yahoo.com/f1/*
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
    const res = await fetch(`https://pub-api-ro.fantasysports.yahoo.com${endpoint}`);
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

  async function exportMatchup() {
    const btn = document.getElementById('fft-export-btn');
    if (btn) btn.textContent = '⏳ Fetching Official API...';

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlMatch = window.location.pathname.match(/\/f1\/(\d+)/);
      const leagueId = urlMatch ? urlMatch[1] : '';

      if (!leagueId) {
        throw new Error('Could not identify League ID from URL');
      }

      // 1. Fetch user games & leagues metadata to identify game_key (e.g. 470) and user's team ID
      const metaData = await fetchYahooApi(
        `/fantasy/v2/users;use_login=1/games;game_codes=nfl/leagues;league_keys=nfl.l.${leagueId}/teams?format=json_f`
      ).catch(() => null);

      let gameKey = '470';
      let myTeamKey = '';
      let leagueName = '';

      if (metaData) {
        const leagueObj = metaData.fantasy_content?.users?.[0]?.user?.games?.[0]?.game?.leagues?.[0]?.league;
        if (leagueObj) {
          gameKey = leagueObj.league_key.split('.l.')[0] || '470';
          leagueName = leagueObj.name || '';
          const myTeamObj = (leagueObj.teams || []).find((t) => t.team?.is_owned_by_current_login === 1);
          if (myTeamObj) {
            myTeamKey = myTeamObj.team.team_key;
          }
        }
      }

      const fullLeagueKey = `${gameKey}.l.${leagueId}`;

      // If team key wasn't resolved, use mid1 or team links
      if (!myTeamKey) {
        const mid1 = urlParams.get('mid1');
        if (mid1) {
          myTeamKey = `${fullLeagueKey}.t.${mid1}`;
        } else {
          // Look for user's team link on page
          const myLink = document.querySelector(`a[href*="/f1/${leagueId}/"]`);
          const tId = myLink?.getAttribute('href')?.split('/')?.pop();
          myTeamKey = `${fullLeagueKey}.t.${tId || '1'}`;
        }
      }

      // 2. Fetch Matchups list for this team to get scores and opponent team_key
      const matchupData = await fetchYahooApi(
        `/fantasy/v2/team/${myTeamKey}/matchups?format=json_f`
      );

      const allMatchups = matchupData.fantasy_content?.team?.matchups || [];
      const currentWeekParam = urlParams.get('week');

      // Find target week matchup (or active week)
      let activeMatchup = currentWeekParam
        ? allMatchups.find((m) => String(m.matchup?.week) === String(currentWeekParam))
        : allMatchups.find((m) => m.matchup?.status === 'midevent' || m.matchup?.status === 'preevent') ||
          allMatchups[allMatchups.length - 1];

      if (!activeMatchup) {
        activeMatchup = allMatchups[0];
      }

      const m = activeMatchup?.matchup;
      if (!m) {
        throw new Error('No matchup data returned from API');
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

      // Check official win probability on page
      let winProbability = undefined;
      const probText = document.body.innerText;
      const favMatch = probText.match(/(?:Favorite|Chance to win|Win prob(?:ability)?)\s*[:\s]?\s*(\d+)%/i);
      if (favMatch) {
        winProbability = parseInt(favMatch[1], 10);
      }

      // 3. Fetch Full Roster (players, positions, headshots, and stats) for both teams
      // Request players with stats for the active week
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

      // Fallback for league name if not in metadata
      if (!leagueName) {
        const teamEls = Array.from(document.querySelectorAll('*')).filter(
          (el) => el.children.length === 0 && el.textContent.trim() === myTeamName
        );
        for (const tEl of teamEls) {
          const container = tEl.closest('div');
          const sibling = container?.nextElementSibling || container?.parentElement?.nextElementSibling;
          if (sibling && sibling.textContent.trim() && sibling.textContent.trim() !== myTeamName) {
            leagueName = sibling.textContent.trim();
            break;
          }
        }
      }

      if (!leagueName) {
        leagueName = `Yahoo League ${leagueId}`;
      }

      const payload = {
        exportedAt: new Date().toISOString(),
        leagueId,
        leagueName,
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

      const jsonStr = JSON.stringify(payload, null, 2);

      if (typeof GM_setClipboard !== 'undefined') {
        GM_setClipboard(jsonStr);
      } else {
        navigator.clipboard.writeText(jsonStr);
      }

      alert(
        `✅ Yahoo Matchup Exported (Official API)!\n\n` +
          `League: "${leagueName}"\n` +
          `Matchup: ${myTeamName} (${payload.matchup.myScore} pts) vs ${oppTeamName} (${payload.matchup.opponentScore} pts)\n` +
          `Rosters: ${myPlayers.length} players for your team, ${oppPlayers.length} for opponent\n` +
          `Full names and official headshots loaded!\n\n` +
          `Copied to clipboard. Paste into your tracker!`
      );
    } catch (err) {
      alert(`❌ Error exporting Yahoo matchup: ${err.message}`);
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

    btn.addEventListener('click', exportMatchup);

    document.body.appendChild(btn);
  }

  injectExportButton();
  const observer = new MutationObserver(() => injectExportButton());
  observer.observe(document.body, { childList: true, subtree: true });
})();
