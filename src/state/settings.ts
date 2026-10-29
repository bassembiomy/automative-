import { DEFAULT_BAUD } from '../obd/transport/Transport';
import { readJson, writeJson } from './storage';

export type Theme = 'dark' | 'light';

export interface Settings {
  baud: number;
  timeoutMs: number;
  imperial: boolean;
  showConsole: boolean;
  theme: Theme;
  pollMs: number;
  autoSave: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  baud: DEFAULT_BAUD,
  timeoutMs: 3000,
  imperial: false,
  showConsole: false,
  theme: 'dark',
  pollMs: 250,
  autoSave: true,
};

const KEY = 'autoscan.settings.v1';

export function loadSettings(): Settings {
  const stored = readJson<Partial<Settings>>(KEY, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(s: Settings): void {
  writeJson(KEY, s);
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}
