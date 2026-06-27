import { savePersistentItem } from './persistentStorage';
import { pushStats } from '../services/statsSync';
import { idbDelete } from './idbStore';

export interface MatchHistoryEntry {
  gameId: string;
  date: string;
  placement: number;
  playerScore: number;
  totalPlayers: number;
  isMultiplayer: boolean;
  winnerName: string;
  winnerScore: number;
  isWin: boolean;
  opponents: { name: string; score: number; isAi: boolean }[];
  roundsCount: number;
  roundScores?: number[];
}

export interface PlayerStats {
  name: string;
  gamesPlayedTotal: number;
  gamesPlayedOffline: number;
  gamesPlayedOnline: number;
  winsTotal: number;
  winsOffline: number;
  winsOnline: number;
  winStreakCurrent: number;
  winStreakBest: number;
  recentForm: ('W' | 'L')[];
  totalPointsScored: number;
  roundsPlayed: number;
  lowestRoundScore: number;
  highestRoundScore: number;
  declaresCorrect: number;
  declaresWrong: number;
}

export const createEmptyStats = (name = 'Player'): PlayerStats => ({
  name,
  gamesPlayedTotal: 0,
  gamesPlayedOffline: 0,
  gamesPlayedOnline: 0,
  winsTotal: 0,
  winsOffline: 0,
  winsOnline: 0,
  winStreakCurrent: 0,
  winStreakBest: 0,
  recentForm: [],
  totalPointsScored: 0,
  roundsPlayed: 0,
  lowestRoundScore: 0,
  highestRoundScore: 0,
  declaresCorrect: 0,
  declaresWrong: 0,
});

export const getLocalStats = (): PlayerStats => {
  if (typeof window === 'undefined') {
    return createEmptyStats('Player');
  }
  const name = localStorage.getItem('tickPlayerName') || 'Player';

  // Read stats from localStorage
  const gamesPlayedTotalVal = localStorage.getItem('stats_gamesPlayedTotal');
  const gamesPlayedOfflineVal = localStorage.getItem('stats_gamesPlayedOffline');
  const gamesPlayedOnlineVal = localStorage.getItem('stats_gamesPlayedOnline');
  const winsTotalVal = localStorage.getItem('stats_winsTotal');
  const winsOfflineVal = localStorage.getItem('stats_winsOffline');
  const winsOnlineVal = localStorage.getItem('stats_winsOnline');
  const winStreakCurrentVal = localStorage.getItem('stats_winStreakCurrent');
  const winStreakBestVal = localStorage.getItem('stats_winStreakBest');
  const totalPointsScoredVal = localStorage.getItem('stats_totalPointsScored');
  const roundsPlayedVal = localStorage.getItem('stats_roundsPlayed');
  const lowestRoundScoreVal = localStorage.getItem('stats_lowestRoundScore');
  const highestRoundScoreVal = localStorage.getItem('stats_highestRoundScore');
  const declaresCorrectVal = localStorage.getItem('stats_declaresCorrect');
  const declaresWrongVal = localStorage.getItem('stats_declaresWrong');

  // Support legacy migration if new values are not set
  let legacyGames = 0;
  let legacyWins = 0;
  try {
    legacyGames = parseInt(localStorage.getItem('playerGamesPlayed') || '0', 10);
    legacyWins = parseInt(localStorage.getItem('playerWins') || '0', 10);
  } catch (_) {}

  const gamesPlayedTotal = gamesPlayedTotalVal !== null ? parseInt(gamesPlayedTotalVal, 10) : legacyGames;
  const gamesPlayedOffline = gamesPlayedOfflineVal !== null ? parseInt(gamesPlayedOfflineVal, 10) : 0;
  // If we migrated legacy games, count them towards online for safety
  const gamesPlayedOnline = gamesPlayedOnlineVal !== null ? parseInt(gamesPlayedOnlineVal, 10) : legacyGames;

  const winsTotal = winsTotalVal !== null ? parseInt(winsTotalVal, 10) : legacyWins;
  const winsOffline = winsOfflineVal !== null ? parseInt(winsOfflineVal, 10) : 0;
  const winsOnline = winsOnlineVal !== null ? parseInt(winsOnlineVal, 10) : legacyWins;

  const winStreakCurrent = winStreakCurrentVal !== null ? parseInt(winStreakCurrentVal, 10) : 0;
  const winStreakBest = winStreakBestVal !== null ? parseInt(winStreakBestVal, 10) : 0;
  const totalPointsScored = totalPointsScoredVal !== null ? parseInt(totalPointsScoredVal, 10) : 0;
  const roundsPlayed = roundsPlayedVal !== null ? parseInt(roundsPlayedVal, 10) : 0;
  const lowestRoundScore = lowestRoundScoreVal !== null ? parseInt(lowestRoundScoreVal, 10) : 0;
  const highestRoundScore = highestRoundScoreVal !== null ? parseInt(highestRoundScoreVal, 10) : 0;
  const declaresCorrect = declaresCorrectVal !== null ? parseInt(declaresCorrectVal, 10) : 0;
  const declaresWrong = declaresWrongVal !== null ? parseInt(declaresWrongVal, 10) : 0;

  let recentForm: ('W' | 'L')[] = [];
  try {
    const raw = localStorage.getItem('stats_recentForm');
    if (raw) {
      recentForm = JSON.parse(raw);
    } else {
      // Reconstruct legacy recent form if available
      const legacyRaw = localStorage.getItem('playerRecentForm');
      if (legacyRaw) recentForm = JSON.parse(legacyRaw);
    }
  } catch (_) {}

  return {
    name,
    gamesPlayedTotal,
    gamesPlayedOffline,
    gamesPlayedOnline,
    winsTotal,
    winsOffline,
    winsOnline,
    winStreakCurrent,
    winStreakBest,
    recentForm,
    totalPointsScored,
    roundsPlayed,
    lowestRoundScore,
    highestRoundScore,
    declaresCorrect,
    declaresWrong,
  };
};

export const saveLocalStats = (stats: PlayerStats) => {
  if (typeof window === 'undefined') return;
  savePersistentItem('tickPlayerName', stats.name);
  savePersistentItem('stats_gamesPlayedTotal', stats.gamesPlayedTotal.toString());
  savePersistentItem('stats_gamesPlayedOffline', stats.gamesPlayedOffline.toString());
  savePersistentItem('stats_gamesPlayedOnline', stats.gamesPlayedOnline.toString());
  savePersistentItem('stats_winsTotal', stats.winsTotal.toString());
  savePersistentItem('stats_winsOffline', stats.winsOffline.toString());
  savePersistentItem('stats_winsOnline', stats.winsOnline.toString());
  savePersistentItem('stats_winStreakCurrent', stats.winStreakCurrent.toString());
  savePersistentItem('stats_winStreakBest', stats.winStreakBest.toString());
  savePersistentItem('stats_recentForm', JSON.stringify(stats.recentForm));
  savePersistentItem('stats_totalPointsScored', stats.totalPointsScored.toString());
  savePersistentItem('stats_roundsPlayed', stats.roundsPlayed.toString());
  savePersistentItem('stats_lowestRoundScore', stats.lowestRoundScore.toString());
  savePersistentItem('stats_highestRoundScore', stats.highestRoundScore.toString());
  savePersistentItem('stats_declaresCorrect', stats.declaresCorrect.toString());
  savePersistentItem('stats_declaresWrong', stats.declaresWrong.toString());
};

export const processGameEndStats = (
  placement: number,
  _totalPlayers: number,
  isMultiplayer: boolean,
  roundScores: number[],
  declaresCorrect: number,
  declaresWrong: number
): PlayerStats => {
  const oldStats = getLocalStats();
  const isWin = placement === 1;

  const newGamesPlayedTotal = oldStats.gamesPlayedTotal + 1;
  const newGamesPlayedOffline = oldStats.gamesPlayedOffline + (isMultiplayer ? 0 : 1);
  const newGamesPlayedOnline = oldStats.gamesPlayedOnline + (isMultiplayer ? 1 : 0);

  const newWinsTotal = oldStats.winsTotal + (isWin ? 1 : 0);
  const newWinsOffline = oldStats.winsOffline + (!isMultiplayer && isWin ? 1 : 0);
  const newWinsOnline = oldStats.winsOnline + (isMultiplayer && isWin ? 1 : 0);

  const newWinStreakCurrent = isWin ? oldStats.winStreakCurrent + 1 : 0;
  const newWinStreakBest = Math.max(oldStats.winStreakBest, newWinStreakCurrent);

  const newRecentForm: ('W' | 'L')[] = [...oldStats.recentForm, (isWin ? 'W' : 'L') as ('W' | 'L')].slice(-5);

  const roundPoints = roundScores.reduce((sum, s) => sum + s, 0);
  const newTotalPointsScored = oldStats.totalPointsScored + roundPoints;
  const newRoundsPlayed = oldStats.roundsPlayed + roundScores.length;

  let newLowestRoundScore = oldStats.lowestRoundScore;
  let newHighestRoundScore = oldStats.highestRoundScore;

  if (roundScores.length > 0) {
    const minRound = Math.min(...roundScores);
    const maxRound = Math.max(...roundScores);
    // If it's the very first game tracked, initialize lowest score directly, otherwise check min
    newLowestRoundScore = oldStats.roundsPlayed === 0 ? minRound : Math.min(oldStats.lowestRoundScore, minRound);
    newHighestRoundScore = Math.max(oldStats.highestRoundScore, maxRound);
  }

  const newDeclaresCorrect = oldStats.declaresCorrect + declaresCorrect;
  const newDeclaresWrong = oldStats.declaresWrong + declaresWrong;

  const newStats: PlayerStats = {
    name: oldStats.name,
    gamesPlayedTotal: newGamesPlayedTotal,
    gamesPlayedOffline: newGamesPlayedOffline,
    gamesPlayedOnline: newGamesPlayedOnline,
    winsTotal: newWinsTotal,
    winsOffline: newWinsOffline,
    winsOnline: newWinsOnline,
    winStreakCurrent: newWinStreakCurrent,
    winStreakBest: newWinStreakBest,
    recentForm: newRecentForm,
    totalPointsScored: newTotalPointsScored,
    roundsPlayed: newRoundsPlayed,
    lowestRoundScore: newLowestRoundScore,
    highestRoundScore: newHighestRoundScore,
    declaresCorrect: newDeclaresCorrect,
    declaresWrong: newDeclaresWrong,
  };

  saveLocalStats(newStats);

  // Fire-and-forget cloud sync — errors are silently swallowed
  const playerId = localStorage.getItem('tickPlayerId');
  if (playerId) {
    const currentHistory = getMatchHistory();
    pushStats(playerId, newStats, currentHistory).catch(() => {});
  }

  return newStats;
};

export const getMatchHistory = (): MatchHistoryEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('tickMatchHistory');
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
};

export const saveMatchToHistory = (entry: Omit<MatchHistoryEntry, 'date'>) => {
  if (typeof window === 'undefined') return;
  try {
    const history = getMatchHistory();
    if (history.some(h => h.gameId === entry.gameId)) return;
    
    const newEntry: MatchHistoryEntry = {
      ...entry,
      date: new Date().toISOString(),
    };
    const updated = [newEntry, ...history].slice(0, 50);
    savePersistentItem('tickMatchHistory', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save match to history', e);
  }
};

export const resetLocalStats = () => {
  if (typeof window === 'undefined') return;
  const name = localStorage.getItem('tickPlayerName') || 'Player';
  const empty = createEmptyStats(name);
  saveLocalStats(empty);
  localStorage.removeItem('tickMatchHistory');
  idbDelete('tickMatchHistory');
  
  // Clean up legacy keys too
  localStorage.removeItem('playerGamesPlayed');
  localStorage.removeItem('playerWins');
  localStorage.removeItem('playerLevel');
  localStorage.removeItem('playerXp');
  localStorage.removeItem('playerMmr');
  localStorage.removeItem('playerWinStreak');
  localStorage.removeItem('playerRecentForm');
  localStorage.removeItem('tick_game_tutorial_completed');
};
