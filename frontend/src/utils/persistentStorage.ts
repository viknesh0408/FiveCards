import { Preferences } from '@capacitor/preferences';

const PERSISTENT_KEYS = [
  'tickPlayerName',
  'tickPlayerId',
  'soundEnabled',
  'vibrationEnabled',
  'batterySaverEnabled',
  'hasSeenTutorial'
];

/**
 * Initializes and synchronizes localStorage with native Preferences.
 * If localStorage has been cleared (e.g. during an app update),
 * this restores all values from native SharedPreferences/NSUserDefaults back to localStorage.
 */
export async function initPersistentStorage(): Promise<void> {
  for (const key of PERSISTENT_KEYS) {
    const localVal = localStorage.getItem(key);
    
    // If local value is missing, check native Preferences
    if (localVal === null) {
      try {
        const { value: nativeVal } = await Preferences.get({ key });
        if (nativeVal !== null) {
          localStorage.setItem(key, nativeVal);
        }
      } catch (e) {
        console.error(`Failed to read key ${key} from native preferences:`, e);
      }
    } else {
      // If local value exists, make sure native Preferences is in sync
      try {
        await Preferences.set({ key, value: localVal });
      } catch (e) {
        console.error(`Failed to sync key ${key} to native preferences:`, e);
      }
    }
  }

  // Ensure tickPlayerId exists (backwards compatible UUID generation)
  let playerId = localStorage.getItem('tickPlayerId');
  if (!playerId) {
    playerId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : 'USR_' + Math.random().toString(36).substring(2, 15).toUpperCase();
    localStorage.setItem('tickPlayerId', playerId);
    try {
      await Preferences.set({ key: 'tickPlayerId', value: playerId });
    } catch (e) {
      console.error('Failed to save generated tickPlayerId natively:', e);
    }
  }
}

/**
 * Saves a key-value pair to both localStorage and native Preferences.
 */
export async function savePersistentItem(key: string, value: string): Promise<void> {
  localStorage.setItem(key, value);
  try {
    await Preferences.set({ key, value });
  } catch (e) {
    console.error(`Failed to save key ${key} natively:`, e);
  }
}
