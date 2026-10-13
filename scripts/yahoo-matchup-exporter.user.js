// ==UserScript==
// @name         Yahoo Fantasy Matchup Exporter
// @namespace    https://football-tracker.mfazio.dev/
// @version      1.2.0
// @description  Export Yahoo Fantasy Football matchup rosters and scores directly to Fazio Football Tracker
// @author       Michael Fazio
// @match        https://football.fantasysports.yahoo.com/f1/*
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Position mapping to Tracker standard positions (including IDP positions)
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

  const VALID_POSITIONS = [
    'QB',
    'RB',
    'WR',
    'TE',
    'W/R/T',
    'W/R',
    'W/T',
    'Q/W/R/T',
    'K',
    'DEF',
    'DST',
    'D/ST',
    'LB',
    'DT',
    'DE',
    'CB',
    'S',
    'DL',
    'DB',
    'IDP',
    'BN',
    'BENCH',
    'IR',
  ];

  function normalizePos(pos) {
    if (!pos) return 'WR';
    const clean = pos.toUpperCase().trim();
    return POS_MAP[clean] || (['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(clean) ? clean : 'WR');
  }

  function parsePlayerTd(playerTd) {
    if (!playerTd) return null;

    const nameEl = playerTd.querySelector('a[data-ys-playerid], a.playernote, a.Nowrap');
    if (!nameEl) return null;

    const name = nameEl.textContent.trim();
    if (!name || name === '(Empty)') return null;

    // Team and position detail usually in a span next to or below player name (e.g. "Jax - QB", "Pit - QB", "Hou - DE")
    const spans = Array.from(playerTd.querySelectorAll('span'));
    const detailSpan = spans.find((s) => s.textContent.includes('-'));

    let nflTeam = 'FA';
    let position = 'WR';

    if (detailSpan) {
      const text = detailSpan.textContent.trim();
      const parts = text.split('-');
      if (parts.length >= 2) {
        nflTeam = parts[0].trim().toUpperCase();
        const posRaw = parts[1].trim().split(' ')[0].split(',')[0];
        position = normalizePos(posRaw);
      }
    }

    return { name, position, nflTeam };
  }

  function exportMatchup() {
    try {
      // 1. Get League Name and ID
      const urlMatch = window.location.pathname.match(/\/f1\/(\d+)/);
      const leagueId = urlMatch ? urlMatch[1] : '';
      const leagueNameEl = document.querySelector('#ysp-league-name a, .Grid-u h1, .league-name, [class*="LeagueName"]');
      const leagueName = leagueNameEl ? leagueNameEl.textContent.trim() : `Yahoo League ${leagueId}`;

      // 2. Identify Team Names from headers or page
      // On this matchup screen, team 1 is "TDs on the Horizon" and team 2 is "FC Упаковщики"
      const urlParams = new URLSearchParams(window.location.search);
      const mid1 = urlParams.get('mid1');
      const mid2 = urlParams.get('mid2');

      let myTeamName = '';
      let oppTeamName = '';

      if (mid1) {
        const link1 = document.querySelector(`a[href*="/f1/${leagueId}/${mid1}"]`);
        if (link1) myTeamName = link1.textContent.trim();
      }
      if (mid2) {
        const link2 = document.querySelector(`a[href*="/f1/${leagueId}/${mid2}"]`);
        if (link2) oppTeamName = link2.textContent.trim();
      }

      if (!myTeamName || !oppTeamName) {
        const teamLinks = Array.from(document.querySelectorAll('a[href*="/f1/' + leagueId + '/"]')).filter((a) => {
          const href = a.getAttribute('href') || '';
          return /\/f1\/\d+\/\d+$/.test(href) && a.textContent.trim().length > 1;
        });
        if (!myTeamName) myTeamName = teamLinks[0] ? teamLinks[0].textContent.trim() : 'TDs on the Horizon';
        if (!oppTeamName) oppTeamName = teamLinks[1] ? teamLinks[1].textContent.trim() : 'FC Упаковщики';
      }

      // 3. Extract Head-to-Head rows
      const myPlayers = [];
      const oppPlayers = [];
      let myTotalScore = 0;
      let myTotalProj = 0;
      let oppTotalScore = 0;
      let oppTotalProj = 0;

      const rows = document.querySelectorAll('tr');

      rows.forEach((row) => {
        // Skip total/summary rows
        if (row.textContent.includes('TOTAL')) return;

        const tds = Array.from(row.querySelectorAll('td'));
        if (tds.length >= 5) {
          // Find the center Position cell (QB, RB, WR, TE, W/R/T, K, DEF, LB, DT, DE, CB, S, BN)
          let posIndex = tds.findIndex((td) => {
            const txt = td.textContent.trim().toUpperCase();
            return VALID_POSITIONS.includes(txt);
          });

          // Fallback if center slot is around middle index
          if (posIndex === -1 && tds.length >= 7) {
            posIndex = Math.floor(tds.length / 2);
          }

          if (posIndex === -1) return;

          const slotText = tds[posIndex].textContent.trim().toUpperCase();
          const isStarter = slotText !== 'BN' && slotText !== 'BENCH' && slotText !== 'IR';

          // Team 1 (Left): Player td is before center
          const t1PlayerTd = tds.slice(0, posIndex).find((td) => td.querySelector('a[data-ys-playerid]'));
          // Team 2 (Right): Player td is after center
          const t2PlayerTd = tds.slice(posIndex + 1).find((td) => td.querySelector('a[data-ys-playerid]'));

          // Left team points & proj
          let t1Pts = 0;
          let t1Proj = 0;
          if (posIndex >= 2) {
            t1Pts = parseFloat(tds[posIndex - 1]?.textContent.trim()) || 0;
            t1Proj = parseFloat(tds[posIndex - 2]?.textContent.trim()) || t1Pts;
          }

          // Right team points & proj
          let t2Pts = 0;
          let t2Proj = 0;
          if (tds.length > posIndex + 2) {
            t2Pts = parseFloat(tds[posIndex + 1]?.textContent.trim()) || 0;
            t2Proj = parseFloat(tds[posIndex + 2]?.textContent.trim()) || t2Pts;
          }

          if (t1PlayerTd) {
            const p1 = parsePlayerTd(t1PlayerTd);
            if (p1) {
              const fullP1 = {
                ...p1,
                starterStatus: isStarter ? 'starter' : 'bench',
                points: t1Pts,
                projectedPoints: t1Proj,
              };
              myPlayers.push(fullP1);
              if (isStarter) {
                myTotalScore += t1Pts;
                myTotalProj += t1Proj;
              }
            }
          }

          if (t2PlayerTd) {
            const p2 = parsePlayerTd(t2PlayerTd);
            if (p2) {
              const fullP2 = {
                ...p2,
                starterStatus: isStarter ? 'starter' : 'bench',
                points: t2Pts,
                projectedPoints: t2Proj,
              };
              oppPlayers.push(fullP2);
              if (isStarter) {
                oppTotalScore += t2Pts;
                oppTotalProj += t2Proj;
              }
            }
          }
        }
      });

      // 4. Look for the top banner big scores (e.g. 218.36 vs 181.44)
      let finalMyScore = Math.round(myTotalScore * 10) / 10;
      let finalMyProj = Math.round(myTotalProj * 10) / 10;
      let finalOppScore = Math.round(oppTotalScore * 10) / 10;
      let finalOppProj = Math.round(oppTotalProj * 10) / 10;

      // Check footer row with totals if present
      const footerRow = Array.from(rows).find((r) => r.textContent.includes('TOTAL'));
      if (footerRow) {
        const fTds = Array.from(footerRow.querySelectorAll('td'));
        const numbers = fTds
          .map((td) => parseFloat(td.textContent.trim()))
          .filter((n) => !isNaN(n) && n > 0);
        if (numbers.length >= 2) {
          // e.g. [146.13, 218.36, 181.44, 137.23]
          const leftScores = numbers.slice(0, Math.floor(numbers.length / 2));
          const rightScores = numbers.slice(Math.floor(numbers.length / 2));
          if (leftScores.length > 0) finalMyScore = leftScores[leftScores.length - 1];
          if (rightScores.length > 0) finalOppScore = rightScores[0];
        }
      }

      const payload = {
        exportedAt: new Date().toISOString(),
        leagueId,
        leagueName,
        platform: 'yahoo',
        matchup: {
          myTeamName,
          myScore: finalMyScore,
          myProjected: finalMyProj,
          opponentTeamName: oppTeamName,
          opponentScore: finalOppScore,
          opponentProjected: finalOppProj,
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
          `Matchup: ${myTeamName} (${finalMyScore}) vs ${oppTeamName} (${finalOppScore})\n` +
          `Players: ${myPlayers.length} on your team, ${oppPlayers.length} on opponent\n\n` +
          `Copied to clipboard! Go to Fazio Football Tracker and paste it in the Yahoo Import tab.`
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

  injectExportButton();
  const observer = new MutationObserver(() => injectExportButton());
  observer.observe(document.body, { childList: true, subtree: true });
})();
