import type { League, Player } from '../types/fantasy';
import { INITIAL_LEAGUES, INITIAL_PLAYERS } from '../data/initialData';

const STORAGE_KEY_LEAGUES = 'fazio_ffb_leagues_v1';
const STORAGE_KEY_PLAYERS = 'fazio_ffb_players_v1';
const STORAGE_KEY_SETTINGS = 'fazio_ffb_settings_v1';

export interface AppSettings {
  refreshIntervalSeconds: number; // 0 for off, 30, 60, 120
  autoSimulate: boolean;
  selectedWeek: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  refreshIntervalSeconds: 30,
  autoSimulate: false,
  selectedWeek: 6,
};

export const loadStoredLeagues = (): League[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LEAGUES);
    if (!raw) return INITIAL_LEAGUES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_LEAGUES;
  } catch {
    return INITIAL_LEAGUES;
  }
};

export const saveStoredLeagues = (leagues: League[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_LEAGUES, JSON.stringify(leagues));
  } catch (e) {
    console.error('Failed to save leagues to storage', e);
  }
};

export const loadStoredPlayers = (): Player[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLAYERS);
    if (!raw) return INITIAL_PLAYERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PLAYERS;
  } catch {
    return INITIAL_PLAYERS;
  }
};

export const saveStoredPlayers = (players: Player[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(players));
  } catch (e) {
    console.error('Failed to save players to storage', e);
  }
};

export const loadStoredSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveStoredSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to storage', e);
  }
};

const STORAGE_KEY_YAHOO_TOKENS = 'fazio_ffb_yahoo_tokens_v1';

export interface YahooTokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
  tokenType?: string;
  clientId?: string;
  clientSecret?: string;
}

export const loadYahooTokens = (): YahooTokenData | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_YAHOO_TOKENS);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveYahooTokens = (tokens: YahooTokenData | null): void => {
  try {
    if (!tokens) {
      localStorage.removeItem(STORAGE_KEY_YAHOO_TOKENS);
    } else {
      localStorage.setItem(STORAGE_KEY_YAHOO_TOKENS, JSON.stringify(tokens));
    }
  } catch (e) {
    console.error('Failed to save Yahoo tokens to storage', e);
  }
};
