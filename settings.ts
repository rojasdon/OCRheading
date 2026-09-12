/**
 * Plugin settings, persisted as JSON via react-native-fs rather than via
 * SQLite or any sn-plugin-lib-native file API.
 */
import RNFS from 'react-native-fs';

export type HeadingStyle = 1 | 2 | 3 | 4;

export type Settings = {
  fontSize: number;
  headingStyle: HeadingStyle;
};

export const FONT_SIZE_MIN = 48;
export const FONT_SIZE_MAX = 192;
export const FONT_SIZE_STEP = 12;

export const HEADING_STYLES: {key: HeadingStyle; label: string}[] = [
  {key: 1, label: 'Black'},
  {key: 2, label: 'Gray / white'},
  {key: 3, label: 'Gray / black'},
  {key: 4, label: 'Shadow'},
];

export const DEFAULT_SETTINGS: Settings = {
  fontSize: 96,
  headingStyle: 1,
};

// Rename 'OCRheading' below if your plugin's folder name differs.
const CONFIG_DIR = `${RNFS.ExternalStorageDirectoryPath}/MyStyle/Plugins/OCRheading`;
const CONFIG_FILE = `${CONFIG_DIR}/config.json`;

let cached: Settings | null = null;

/** Synchronous access to the last loaded/saved settings (defaults before
 * the first load). */
export function getCachedSettings(): Settings {
  return cached || DEFAULT_SETTINGS;
}

/** Load persisted settings, falling back to defaults field by field.
 * Cached in memory after the first read within this process — but each
 * plugin invocation should call this fresh rather than trust a stale
 * cache, since the settings screen may have changed things since the
 * last conversion run in the same session. */
export async function loadSettings(): Promise<Settings> {
  try {
    if (await RNFS.exists(CONFIG_FILE)) {
      const raw = await RNFS.readFile(CONFIG_FILE, 'utf8');
      cached = {...DEFAULT_SETTINGS, ...JSON.parse(raw)};
      return cached;
    }
  } catch (e: any) {
    console.warn(`[OCRheading] loadSettings failed: ${e?.message}`);
  }
  cached = {...DEFAULT_SETTINGS};
  return cached;
}

/** Persist settings and refresh the in-memory cache. */
export async function saveSettings(settings: Settings): Promise<boolean> {
  cached = {...DEFAULT_SETTINGS, ...settings};
  try {
    await RNFS.mkdir(CONFIG_DIR);
    await RNFS.writeFile(CONFIG_FILE, JSON.stringify(cached, null, 2), 'utf8');
    return true;
  } catch (e: any) {
    console.warn(`[OCRheading] saveSettings failed: ${e?.message}`);
    return false;
  }
}

export function clampFontSize(size: number): number {
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, size));
}
