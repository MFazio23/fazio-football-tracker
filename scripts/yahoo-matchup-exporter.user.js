// ==UserScript==
// @name         Yahoo Fantasy Matchup Exporter
// @namespace    https://football-tracker.mfazio.dev/
// @version      1.0.0
// @description  Export Yahoo Fantasy Football matchup rosters and scores directly to Fazio Football Tracker
// @author       Michael Fazio
// @match        https://football.fantasysports.yahoo.com/f1/*
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Position mapping to Tracker standard positions
  const POS_MAP = {
    QB: 'QB',
    RB: 'RB',
    WR: 'WR',
    TE: 'TE',
    K: 'K',
    DEF: 'DEF',
    DST: 'DEF',
    'D/ST': 'DEF',
  };

  function normalizePos(pos) {
    if (!pos) return 'WR';
    const clean = pos.toUpperCase().trim();
    return POS_MAP[clean] || (['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(clean) ? clean : 'WR');
  }

  function parsePlayerRow(row) {
    // Yahoo fantasy table rows have .ysf-player-name or td.player
    const nameEl = row.querySelector('.ysf-player-name a, td.player a.Nowrap');
    if (!nameEl) return null;

    const name = nameEl.textContent.trim();
    if (!name || name === '(Empty)') return null;

    // Team and position detail usually in a span next to or below player name (e.g. "KC - QB", "Buf - WR")
    const detailEl = row.querySelector('.ysf-player-name span, td.player span.F-sub, td.player span');
    let nflTeam = 'FA';
    let position = 'WR';

    if (detailEl) {
      const text = detailEl.textContent.trim();
      // formats: "KC - QB", "KC - WR,RB", "Buf - DEF", "Jax - RB (Q)"
      const parts = text.split('-');
      if (parts.length >= 2) {
        nflTeam = parts[0].trim().toUpperCase();
        const posRaw = parts[1].trim().split(' ')[0].split(',')[0];
        position = normalizePos(posRaw);
      } else {
        const spaceParts = text.split(' ');
        if (spaceParts.length >= 2) {
          nflTeam = spaceParts[0].trim().toUpperCase();
          position = normalizePos(spaceParts[1]);
        }
      }
    }

    // Lineup slot position (e.g. QB, WR, RB, W/R/T, BN, IR)
    const slotEl = row.querySelector('td.pos, td.first, td[data-col="pos"]');
    const slotText = (slotEl ? slotEl.textContent.trim() : '').toUpperCase();
    const isStarter = slotText !== 'BN' && slotText !== 'BENCH' && slotText !== 'IR';

    // Actual score & projected score
    // In Yahoo matchup view, columns include 'fanpts' or 'pts' or 'projected'
    const ptsEl = row.querySelector('td[data-col="0"], td.pts, td.score, td[data-col="points"]');
    const projEl = row.querySelector('td[data-col="1"], td.projected, td[data-col="proj"]');

    const points = ptsEl ? parseFloat(ptsEl.textContent.trim()) || 0 : 0;
    const projected = projEl ? parseFloat(projEl.textContent.trim()) || points : points;

    return {
      name,
      position,
      nflTeam,
      starterStatus: isStarter ? 'starter' : 'bench',
      points,
      projectedPoints: projected,
    };
  }

  function exportMatchup() {
    try {
      // 1. Get League Name and ID from URL or page
      const urlMatch = window.location.pathname.match(/\/f1\/(\d+)/);
      const leagueId = urlMatch ? urlMatch[1] : '';
      const leagueNameEl = document.querySelector('#ysp-league-name a, .Grid-u h1, .league-name');
      const leagueName = leagueNameEl ? leagueNameEl.textContent.trim() : `Yahoo League ${leagueId}`;

      // 2. Identify Team Names & Scores
      // Typical matchup page has #matchup-header with two teams
      const teamHeaders = document.querySelectorAll('#matchup-header .team-info, .matchup-header .team');
      let myTeamName = 'My Team';
      let oppTeamName = 'Opponent';
      let myScore = 0;
      let myProjected = 0;
      let oppScore = 0;
      let oppProjected = 0;

      if (teamHeaders.length >= 2) {
        myTeamName = teamHeaders[0].querySelector('.team-name, h3, a')?.textContent.trim() || 'My Team';
        oppTeamName = teamHeaders[1].querySelector('.team-name, h3, a')?.textContent.trim() || 'Opponent';

        const myScoreEl = teamHeaders[0].querySelector('.total-points, .score');
        const oppScoreEl = teamHeaders[1].querySelector('.total-points, .score');
        myScore = myScoreEl ? parseFloat(myScoreEl.textContent.trim()) || 0 : 0;
        oppScore = oppScoreEl ? parseFloat(oppScoreEl.textContent.trim()) || 0 : 0;

        const myProjEl = teamHeaders[0].querySelector('.projected-points, .projected');
        const oppProjEl = teamHeaders[1].querySelector('.projected-points, .projected');
        myProjected = myProjEl ? parseFloat(myProjEl.textContent.trim()) || myScore : myScore;
        oppProjected = oppProjEl ? parseFloat(oppProjEl.textContent.trim()) || oppScore : oppScore;
      }

      // 3. Extract Players from both teams
      // Yahoo matchup tables usually render as #matchuptable or two tables inside #stat-table
      const tables = document.querySelectorAll('table.teamtable, table.stat-table, #matchuptable table');
      const myPlayers = [];
      const oppPlayers = [];

      if (tables.length >= 2) {
        // Table 0 = user team, Table 1 = opponent team
        tables[0].querySelectorAll('tbody tr').forEach((r) => {
          const p = parsePlayerRow(r);
          if (p) myPlayers.push(p);
        });

        tables[1].querySelectorAll('tbody tr').forEach((r) => {
          const p = parsePlayerRow(r);
          if (p) oppPlayers.push(p);
        });
      } else {
        // Fallback for single combined matchup table or team roster page
        const allRows = document.querySelectorAll('table.teamtable tbody tr, table.stat-table tbody tr');
        allRows.forEach((r) => {
          const p = parsePlayerRow(r);
          if (p) myPlayers.push(p);
        });
      }

      // If scores weren't found in header, sum up starter points
      if (myScore === 0 && myPlayers.length > 0) {
        myScore = myPlayers
          .filter((p) => p.starterStatus === 'starter')
          .reduce((sum, p) => sum + p.points, 0);
        myProjected = myPlayers
          .filter((p) => p.starterStatus === 'starter')
          .reduce((sum, p) => sum + p.projectedPoints, 0);
      }

      if (oppScore === 0 && oppPlayers.length > 0) {
        oppScore = oppPlayers
          .filter((p) => p.starterStatus === 'starter')
          .reduce((sum, p) => sum + p.points, 0);
        oppProjected = oppPlayers
          .filter((p) => p.starterStatus === 'starter')
          .reduce((sum, p) => sum + p.projectedPoints, 0);
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
        `✅ Yahoo Matchup Exported!\n\n` +
          `League: ${leagueName}\n` +
          `Matchup: ${myTeamName} (${payload.matchup.myScore}) vs ${oppTeamName} (${payload.matchup.opponentScore})\n` +
          `Starters: ${myPlayers.length} user players, ${oppPlayers.length} opponent players\n\n` +
          `Matchup data copied to clipboard. Go to Fazio Football Tracker and click "Import Yahoo Data".`
      );
    } catch (err) {
      alert(`❌ Error exporting Yahoo matchup: ${err.message}`);
      console.error(err);
    }
  }

  // Inject floating export button into Yahoo fantasy page
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

  // Run on load and observe page changes (Yahoo uses PJAX for sub-navigation)
  injectExportButton();
  const observer = new MutationObserver(() => injectExportButton());
  observer.observe(document.body, { childList: true, subtree: true });
})();
