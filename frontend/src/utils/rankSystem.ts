export interface PlayerProfile {
  name: string;
  level: number;
  xp: number;
  mmr: number;
}

export interface RankTier {
  name: string;
  minMmr: number;
  color: string;
  badge: string;
}

export const RANK_TIERS: RankTier[] = [
  { name: 'Bronze III', minMmr: 0, color: '#cd7f32', badge: '🥉' },
  { name: 'Bronze II', minMmr: 100, color: '#cd7f32', badge: '🥉' },
  { name: 'Bronze I', minMmr: 200, color: '#cd7f32', badge: '🥉' },
  { name: 'Silver III', minMmr: 300, color: '#94a3b8', badge: '🥈' },
  { name: 'Silver II', minMmr: 400, color: '#94a3b8', badge: '🥈' },
  { name: 'Silver I', minMmr: 500, color: '#94a3b8', badge: '🥈' },
  { name: 'Gold III', minMmr: 600, color: '#eab308', badge: '🥇' },
  { name: 'Gold II', minMmr: 750, color: '#eab308', badge: '🥇' },
  { name: 'Gold I', minMmr: 900, color: '#eab308', badge: '🥇' },
  { name: 'Platinum III', minMmr: 1000, color: '#38bdf8', badge: '💎' },
  { name: 'Platinum II', minMmr: 1150, color: '#38bdf8', badge: '💎' },
  { name: 'Platinum I', minMmr: 1300, color: '#38bdf8', badge: '💎' },
  { name: 'Diamond III', minMmr: 1500, color: '#a855f7', badge: '✨' },
  { name: 'Diamond II', minMmr: 1650, color: '#a855f7', badge: '✨' },
  { name: 'Diamond I', minMmr: 1800, color: '#a855f7', badge: '✨' },
  { name: 'Master', minMmr: 2000, color: '#f43f5e', badge: '👑' },
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

export const getXpForNextLevel = (level: number): number => {
  return level * 100;
};

export const getLocalProfile = (): PlayerProfile => {
  if (typeof window === 'undefined') {
    return { name: 'Player', level: 1, xp: 0, mmr: 0 };
  }
  const name = localStorage.getItem('tickPlayerName') || 'Player';
  const level = parseInt(localStorage.getItem('playerLevel') || '1', 10);
  const xp = parseInt(localStorage.getItem('playerXp') || '0', 10);
  const mmr = parseInt(localStorage.getItem('playerMmr') || '0', 10);
  return { name, level, xp, mmr };
};

export const saveLocalProfile = (profile: PlayerProfile) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('tickPlayerName', profile.name);
  localStorage.setItem('playerLevel', profile.level.toString());
  localStorage.setItem('playerXp', profile.xp.toString());
  localStorage.setItem('playerMmr', profile.mmr.toString());
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
}

export const processGameEnd = (placement: number, totalPlayers: number): ProcessedResults => {
  const oldProfile = getLocalProfile();
  
  // Calculate XP
  let xpGained = 50; // base play XP
  if (placement === 1) xpGained += 100;
  else if (placement === 2) xpGained += 50;
  else if (placement === 3) xpGained += 20;

  // Calculate MMR changes based on placement and player count
  let mmrGained = 0;
  if (totalPlayers >= 2) {
    if (placement === 1) {
      mmrGained = 25;
    } else if (placement === 2) {
      mmrGained = totalPlayers >= 3 ? 10 : -5;
    } else if (placement === totalPlayers) {
      // Last place
      mmrGained = -20;
    } else {
      // Middle slots
      mmrGained = -5;
    }
  }

  // Apply XP gains and handle level ups
  let newLevel = oldProfile.level;
  let newXp = oldProfile.xp + xpGained;
  let levelUp = false;

  while (newXp >= getXpForNextLevel(newLevel)) {
    newXp -= getXpForNextLevel(newLevel);
    newLevel += 1;
    levelUp = true;
  }

  // Apply MMR gains (cannot drop below 0)
  const newMmr = Math.max(0, oldProfile.mmr + mmrGained);

  const oldRank = getRankTier(oldProfile.mmr);
  const newRank = getRankTier(newMmr);
  const rankUp = newRank.minMmr > oldRank.minMmr; // MMR crossed threshold upwards

  // Save new profile
  saveLocalProfile({
    name: oldProfile.name,
    level: newLevel,
    xp: newXp,
    mmr: newMmr
  });

  return {
    xpGained,
    mmrGained,
    oldLevel: oldProfile.level,
    newLevel,
    oldXp: oldProfile.xp,
    newXp,
    oldMmr: oldProfile.mmr,
    newMmr,
    oldRank,
    newRank,
    levelUp,
    rankUp
  };
};

export const parsePlayerName = (fullName: string) => {
  if (!fullName) return { name: '', level: 1, mmr: 0 };
  const parts = fullName.split('||');
  if (parts.length < 3) {
    return { name: parts[0], level: 1, mmr: 0 };
  }
  return {
    name: parts[0],
    level: parseInt(parts[1], 10) || 1,
    mmr: parseInt(parts[2], 10) || 0,
  };
};
