export interface PlayerProfile {
  name: string;
  level: number;
  xp: number;
  mmr: number;
  winStreak: number;
  recentForm: ('W' | 'L')[]; // last 5 games
  gamesPlayed: number;
  wins: number;
}

export interface RankTier {
  name: string;
  minMmr: number;
  color: string;
  badge: string;
  crest: string; // larger display emoji/symbol
  bgGradient: string;
}

export const RANK_TIERS: RankTier[] = [
  { name: 'Bronze III', minMmr: 0,    color: '#b87333', badge: '🔱', crest: '🔱', bgGradient: 'linear-gradient(135deg, #3d1a00 0%, #1a0a00 100%)' },
  { name: 'Bronze II',  minMmr: 100,  color: '#cd7f32', badge: '🔱', crest: '🔱', bgGradient: 'linear-gradient(135deg, #3d2000 0%, #1a0d00 100%)' },
  { name: 'Bronze I',   minMmr: 200,  color: '#d4924a', badge: '🔱', crest: '🔱', bgGradient: 'linear-gradient(135deg, #4a2800 0%, #201000 100%)' },
  { name: 'Silver III', minMmr: 350,  color: '#94a3b8', badge: '⚜️', crest: '⚜️', bgGradient: 'linear-gradient(135deg, #1e2a38 0%, #0d1420 100%)' },
  { name: 'Silver II',  minMmr: 500,  color: '#b0bec5', badge: '⚜️', crest: '⚜️', bgGradient: 'linear-gradient(135deg, #22303e 0%, #111820 100%)' },
  { name: 'Silver I',   minMmr: 650,  color: '#cfd8dc', badge: '⚜️', crest: '⚜️', bgGradient: 'linear-gradient(135deg, #263340 0%, #141c26 100%)' },
  { name: 'Gold III',   minMmr: 800,  color: '#d4a017', badge: '🏅', crest: '🏅', bgGradient: 'linear-gradient(135deg, #3a2a00 0%, #1a1200 100%)' },
  { name: 'Gold II',    minMmr: 1000, color: '#eab308', badge: '🏅', crest: '🏅', bgGradient: 'linear-gradient(135deg, #473200 0%, #201600 100%)' },
  { name: 'Gold I',     minMmr: 1200, color: '#f5c518', badge: '🏅', crest: '🏅', bgGradient: 'linear-gradient(135deg, #503a00 0%, #241a00 100%)' },
  { name: 'Platinum III', minMmr: 1400, color: '#38bdf8', badge: '💎', crest: '💎', bgGradient: 'linear-gradient(135deg, #0c2840 0%, #051320 100%)' },
  { name: 'Platinum II',  minMmr: 1600, color: '#56cff9', badge: '💎', crest: '💎', bgGradient: 'linear-gradient(135deg, #0f2f4a 0%, #061524 100%)' },
  { name: 'Platinum I',   minMmr: 1800, color: '#7dd8f8', badge: '💎', crest: '💎', bgGradient: 'linear-gradient(135deg, #123550 0%, #071828 100%)' },
  { name: 'Diamond III',  minMmr: 2000, color: '#c084fc', badge: '✦', crest: '✦', bgGradient: 'linear-gradient(135deg, #2a0a4a 0%, #120520 100%)' },
  { name: 'Diamond II',   minMmr: 2250, color: '#d49aff', badge: '✦', crest: '✦', bgGradient: 'linear-gradient(135deg, #300c55 0%, #160624 100%)' },
  { name: 'Diamond I',    minMmr: 2500, color: '#e2b8ff', badge: '✦', crest: '✦', bgGradient: 'linear-gradient(135deg, #380e60 0%, #1a0728 100%)' },
  { name: 'Master',       minMmr: 2800, color: '#f43f5e', badge: '👑', crest: '👑', bgGradient: 'linear-gradient(135deg, #4a0020 0%, #1e000e 100%)' },
];

export const getRankTier = (mmr: number): RankTier => {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (mmr >= RANK_TIERS[i].minMmr) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
};

export const getNextRankTier = (mmr: number): RankTier | null => {
  const current = getRankTier(mmr);
  const currentIndex = RANK_TIERS.findIndex(t => t.name === current.name);
  if (currentIndex < RANK_TIERS.length - 1) {
    return RANK_TIERS[currentIndex + 1];
  }
  return null;
};

/**
 * Exponential XP curve — early levels feel fast, higher levels feel earned.
 * Level 1→2: 100 XP, 5→6: 207 XP, 10→11: 519 XP, 20→21: 3833 XP
 */
export const getXpForNextLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(1.18, level - 1));
};

export const getLocalProfile = (): PlayerProfile => {
  if (typeof window === 'undefined') {
    return { name: 'Player', level: 1, xp: 0, mmr: 400, winStreak: 0, recentForm: [], gamesPlayed: 0, wins: 0 };
  }
  const name = localStorage.getItem('tickPlayerName') || 'Player';
  const level = parseInt(localStorage.getItem('playerLevel') || '1', 10);
  const xp = parseInt(localStorage.getItem('playerXp') || '0', 10);
  const mmr = parseInt(localStorage.getItem('playerMmr') || '400', 10);
  const winStreak = parseInt(localStorage.getItem('playerWinStreak') || '0', 10);
  const gamesPlayed = parseInt(localStorage.getItem('playerGamesPlayed') || '0', 10);
  const wins = parseInt(localStorage.getItem('playerWins') || '0', 10);
  let recentForm: ('W' | 'L')[] = [];
  try {
    const raw = localStorage.getItem('playerRecentForm');
    if (raw) recentForm = JSON.parse(raw);
  } catch (_) {}
  return { name, level, xp, mmr, winStreak, recentForm, gamesPlayed, wins };
};

export const saveLocalProfile = (profile: PlayerProfile) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('tickPlayerName', profile.name);
  localStorage.setItem('playerLevel', profile.level.toString());
  localStorage.setItem('playerXp', profile.xp.toString());
  localStorage.setItem('playerMmr', profile.mmr.toString());
  localStorage.setItem('playerWinStreak', profile.winStreak.toString());
  localStorage.setItem('playerGamesPlayed', profile.gamesPlayed.toString());
  localStorage.setItem('playerWins', profile.wins.toString());
  localStorage.setItem('playerRecentForm', JSON.stringify(profile.recentForm.slice(-5)));
};

export interface ProcessedResults {
  xpGained: number;
  mmrGained: number;
  oldLevel: number;
  newLevel: number;
  oldXp: number;
  newXp: number;
  oldMmr: number;
  newMmr: number;
  oldRank: RankTier;
  newRank: RankTier;
  levelUp: boolean;
  rankUp: boolean;
  rankDown: boolean;
  newWinStreak: number;
  mmrProtected: boolean;
  placement: number;
}

/**
 * Robust ELO-style MMR formula with:
 *  - Placement-weighted gain (scales with player count)
 *  - Win-streak bonus (up to +12)
 *  - Rank protection at tier boundaries (one half-loss token)
 */
export const processGameEnd = (placement: number, totalPlayers: number): ProcessedResults => {
  const oldProfile = getLocalProfile();
  const isWin = placement === 1;

  // ─── MMR Calculation ─────────────────────────────────────────
  // Base: placement ratio 0.0 (last) → 1.0 (first), scaled to 40 point range
  const placementRatio = totalPlayers > 1
    ? (totalPlayers - placement) / (totalPlayers - 1)
    : 1;
  const baseGain = Math.round(placementRatio * 40);

  // Anchor: -20 so losing is still penalised even in small lobbies
  let mmrChange = baseGain - 20;

  // Win-streak bonus: +2 MMR per consecutive win, capped at +12
  const streakBonus = isWin ? Math.min(oldProfile.winStreak * 2, 12) : 0;
  mmrChange += streakBonus;

  // Rank protection: if the player would drop below a tier boundary, halve the loss (once)
  const oldRank = getRankTier(oldProfile.mmr);
  const protectionKey = `rankProtection_${oldRank.name}`;
  let mmrProtected = false;
  if (mmrChange < 0) {
    const wouldCross = oldProfile.mmr + mmrChange < oldRank.minMmr && oldProfile.mmr >= oldRank.minMmr;
    const tokenAvailable = localStorage.getItem(protectionKey) !== 'used';
    if (wouldCross && tokenAvailable) {
      mmrChange = Math.round(mmrChange / 2);
      mmrProtected = true;
      localStorage.setItem(protectionKey, 'used');
    }
  } else {
    // Reset protection token when gaining MMR above the boundary
    localStorage.removeItem(protectionKey);
  }

  const newMmr = Math.max(0, oldProfile.mmr + mmrChange);

  // ─── XP Calculation ──────────────────────────────────────────
  let xpGained = 30; // base play XP
  if (placement === 1) xpGained += 80;
  else if (placement === 2) xpGained += 40;
  else if (placement === 3) xpGained += 15;

  let newLevel = oldProfile.level;
  let newXp = oldProfile.xp + xpGained;
  let levelUp = false;
  while (newXp >= getXpForNextLevel(newLevel)) {
    newXp -= getXpForNextLevel(newLevel);
    newLevel += 1;
    levelUp = true;
  }

  // ─── Win streak & form ───────────────────────────────────────
  const newWinStreak = isWin ? oldProfile.winStreak + 1 : 0;
  const newRecentForm: ('W' | 'L')[] = [...oldProfile.recentForm, isWin ? 'W' : 'L'].slice(-5);

  const newRank = getRankTier(newMmr);
  const rankUp = newRank.minMmr > oldRank.minMmr;
  const rankDown = newRank.minMmr < oldRank.minMmr;

  // ─── Save ────────────────────────────────────────────────────
  saveLocalProfile({
    name: oldProfile.name,
    level: newLevel,
    xp: newXp,
    mmr: newMmr,
    winStreak: newWinStreak,
    recentForm: newRecentForm,
    gamesPlayed: oldProfile.gamesPlayed + 1,
    wins: oldProfile.wins + (isWin ? 1 : 0),
  });

  return {
    xpGained,
    mmrGained: mmrChange,
    oldLevel: oldProfile.level,
    newLevel,
    oldXp: oldProfile.xp,
    newXp,
    oldMmr: oldProfile.mmr,
    newMmr,
    oldRank,
    newRank,
    levelUp,
    rankUp,
    rankDown,
    newWinStreak,
    mmrProtected,
    placement,
  };
};

export const parsePlayerName = (fullName: string) => {
  if (!fullName) return { name: '', level: 1, mmr: 400 };
  const parts = fullName.split('||');
  if (parts.length < 3) {
    return { name: parts[0], level: 1, mmr: 400 };
  }
  return {
    name: parts[0],
    level: parseInt(parts[1], 10) || 1,
    mmr: parseInt(parts[2], 10) || 400,
  };
};
