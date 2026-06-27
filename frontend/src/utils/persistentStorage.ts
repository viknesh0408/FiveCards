import { Preferences } from '@capacitor/preferences';
import { idbSet, idbGetAll } from './idbStore';

const PERSISTENT_KEYS = [
  'tickPlayerName',
  'tickPlayerId',
  'soundEnabled',
  'vibrationEnabled',
  'batterySaverEnabled',
  'hasSeenTutorial',
  'stats_gamesPlayedTotal',
  'stats_gamesPlayedOffline',
  'stats_gamesPlayedOnline',
  'stats_winsTotal',
  'stats_winsOffline',
  'stats_winsOnline',
  'stats_winStreakCurrent',
  'stats_winStreakBest',
  'stats_recentForm',
  'stats_totalPointsScored',
  'stats_roundsPlayed',
  'stats_lowestRoundScore',
  'stats_highestRoundScore',
  'stats_declaresCorrect',
  'stats_declaresWrong',
  'daily_state',
  'tickMatchHistory',
];

// Keys that are heavy and should skip Capacitor Preferences but go to IndexedDB
const HEAVY_KEYS = ['tickMatchHistory', 'daily_state'];

/**
 * Initializes and synchronizes localStorage with IndexedDB and native Preferences.
 * If localStorage has been cleared, restores all values from IndexedDB/Preferences back to localStorage.
 */
export async function initPersistentStorage(): Promise<void> {
  // Fetch all items from IndexedDB once on startup
  const idbData = await idbGetAll();

  for (const key of PERSISTENT_KEYS) {
    let localVal = localStorage.getItem(key);
    
    // 1. If local value is missing, check IDB first
    if (localVal === null) {
      const idbVal = idbData[key];
      if (idbVal !== undefined && idbVal !== null) {
        localStorage.setItem(key, idbVal);
        localVal = idbVal;
      }
    }

    // 2. If still missing and not heavy, check native Preferences
    if (localVal === null && !HEAVY_KEYS.includes(key)) {
      try {
        const { value: nativeVal } = await Preferences.get({ key });
        if (nativeVal !== null) {
          localStorage.setItem(key, nativeVal);
          localVal = nativeVal;
          // Sync native value back to IDB
          idbSet(key, nativeVal);
        }
      } catch (e) {
        console.error(`Failed to read key ${key} from native preferences:`, e);
      }
    }

    // 3. Keep stores in sync: make sure IDB and Preferences have the local value
    if (localVal !== null) {
      if (idbData[key] !== localVal) {
        idbSet(key, localVal);
      }

      if (!HEAVY_KEYS.includes(key)) {
        try {
          await Preferences.set({ key, value: localVal });
        } catch (e) {
          console.error(`Failed to sync key ${key} to native preferences:`, e);
        }
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
    idbSet('tickPlayerId', playerId);
    try {
      await Preferences.set({ key: 'tickPlayerId', value: playerId });
    } catch (e) {
      console.error('Failed to save generated tickPlayerId natively:', e);
    }
  }
}

/**
 * Saves a key-value pair to localStorage, IndexedDB, and native Preferences (if not heavy).
 */
export async function savePersistentItem(key: string, value: string): Promise<void> {
  localStorage.setItem(key, value);
  
  // Write-through to IndexedDB
  idbSet(key, value);

  // Write to Capacitor Preferences if not heavy
  if (!HEAVY_KEYS.includes(key)) {
    try {
      await Preferences.set({ key, value });
    } catch (e) {
      console.error(`Failed to save key ${key} natively:`, e);
    }
  }
}
