import type { Position } from '../types/fantasy';

/**
 * Strips punctuation, suffixes (Jr., Sr., III, etc.), and defense labels
 */
export function cleanPlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(d\/st|dst|def)\s+/i, '')
    .replace(/\s+(d\/st|dst|def)$/i, '')
    .replace(/\b(jr\.?|sr\.?|ii|iii|iv|v)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Extracts first initial and sanitized last name from raw name
 * e.g. "Drake Maye" -> { initial: 'd', last: 'maye' }
 * e.g. "D. Maye" -> { initial: 'd', last: 'maye' }
 * e.g. "A. Jones Sr." -> { initial: 'a', last: 'jones' }
 */
export function getInitialAndLast(rawName: string): { initial: string; last: string } | null {
  const clean = rawName
    .toLowerCase()
    .replace(/^(d\/st|dst|def)\s+/i, '')
    .replace(/\s+(d\/st|dst|def)$/i, '')
    .replace(/\b(jr\.?|sr\.?|ii|iii|iv|v)\b/gi, '')
    .trim();

  // Split on whitespace or periods (e.g. "D. Maye" or "D.Maye" or "Drake Maye")
  const parts = clean.split(/[\s.]+/).filter(Boolean);
  if (parts.length >= 2) {
    const initial = parts[0][0];
    const last = parts[parts.length - 1].replace(/[^a-z0-9]/g, '');
    if (initial && last) {
      return { initial, last };
    }
  }
  return null;
}

/**
 * Robust matcher that determines if two player entries across ESPN, Yahoo, or NFL scoreboard
 * refer to the same human player.
 *
 * Handles:
 * 1. Exact / normalized match: "Drake Maye" === "Drake Maye"
 * 2. Initial vs Full name match: "Drake Maye" === "D. Maye" (verified by same NFL team or position)
 * 3. Defense aliases: "49ers" === "San Francisco 49ers" === "SF D/ST"
 */
export function arePlayersSame(
  nameA: string,
  teamA?: string,
  posA?: Position | string,
  nameB?: string,
  teamB?: string,
  posB?: Position | string
): boolean {
  if (!nameA || !nameB) return false;

  const normA = cleanPlayerName(nameA);
  const normB = cleanPlayerName(nameB);

  // Exact normalized match
  if (normA === normB && normA.length > 0) {
    return true;
  }

  // Position match check (defense vs offensive players should never cross-match)
  const isDefA = posA === 'DEF' || nameA.includes('DEF') || nameA.includes('D/ST');
  const isDefB = posB === 'DEF' || (nameB && (nameB.includes('DEF') || nameB.includes('D/ST')));
  if (isDefA !== isDefB && posA && posB) {
    return false;
  }

  // Defense team matching (e.g. "49ers" or "Jets" matching by NFL team)
  if (isDefA && isDefB && teamA && teamB && teamA !== 'FA' && teamB !== 'FA') {
    if (teamA.toUpperCase() === teamB.toUpperCase()) {
      return true;
    }
  }

  // Cross-match initial and last name (e.g. "Drake Maye" and "D. Maye")
  const pA = getInitialAndLast(nameA);
  const pB = getInitialAndLast(nameB);

  if (pA && pB && pA.last === pB.last && pA.initial === pB.initial) {
    // If last name and first initial match, verify NFL team and/or position
    const cleanTeamA = teamA?.toUpperCase().trim();
    const cleanTeamB = teamB?.toUpperCase().trim();

    const teamsMatch = cleanTeamA && cleanTeamB && cleanTeamA !== 'FA' && cleanTeamB !== 'FA' && cleanTeamA === cleanTeamB;
    const posMatch = posA && posB && posA === posB;

    // Both match or team matches
    if (teamsMatch || posMatch) {
      return true;
    }
  }

  return false;
}

/**
 * Returns a preferred canonical display name (prefers full name "Drake Maye" over "D. Maye")
 */
export function getPreferredDisplayName(nameA: string, nameB: string): string {
  // If one is abbreviated (e.g. "D. Maye" with dot or single letter first name), prefer the full one
  const isAbbrA = /^[a-z]\.?\s+/i.test(nameA.trim());
  const isAbbrB = /^[a-z]\.?\s+/i.test(nameB.trim());

  if (isAbbrA && !isAbbrB) return nameB;
  if (!isAbbrA && isAbbrB) return nameA;
  return nameA.length >= nameB.length ? nameA : nameB;
}
