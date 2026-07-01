import { savePersistentItem } from './persistentStorage';

// ─── Types ─────────────────────────────────────────────────────────────────

export type MissionType = 'wins' | 'correctTicks' | 'gamesPlayed' | 'top2Finishes' | 'lowScoreWin';
export type RewardType = 'coins' | 'avatar' | 'cardBack' | 'premium' | 'bonus' | 'avatarPic';

export interface DailyMission {
  id: string;
  label: string;
  description: string;
  icon: string;
  goal: number;
  progress: number;
  claimed: boolean;
  type: MissionType;
}

export interface DailyReward {
  day: number;
  icon: string;
  label: string;
  description: string;
  type: RewardType;
  coinValue: number;
  itemId?: string;
}

export interface DailyState {
  streakDay: number;              // Current streak day (1–7, wraps after 7)
  lastLoginDate: string;          // 'YYYY-MM-DD'
  todayRewardClaimed: boolean;
  missions: DailyMission[];
  missionsDate: string;           // Date missions were generated for
  coins: number;                  // Running coin balance
  lastProcessedGameId?: string;   // Guard against double-counting a game
  unlockedCardBacks: string[];
  unlockedAvatars: string[];
  unlockedAvatarPics: string[];
  selectedCardBack: string;
  selectedAvatar: string;
  unlockedTableFelts?: string[];
  selectedTableFelt?: string;
}

// ─── Reward Schedule ───────────────────────────────────────────────────────

export const DAILY_REWARDS: DailyReward[] = [
  {
    day: 1,
    icon: '🪙',
    label: '100 Coins',
    description: 'A small start to your daily streak',
    type: 'coins',
    coinValue: 100,
  },
  {
    day: 2,
    icon: '🪙',
    label: '150 Coins',
    description: 'Bonus login coins pack!',
    type: 'coins',
    coinValue: 150,
  },
  {
    day: 3,
    icon: '🃏',
    label: 'Card Back',
    description: 'Exclusive holographic card back theme',
    type: 'cardBack',
    coinValue: 75,
  },
  {
    day: 4,
    icon: '🪙',
    label: '200 Coins',
    description: 'Mid-week bonus reward',
    type: 'coins',
    coinValue: 200,
  },
  {
    day: 5,
    icon: '🐲',
    label: 'Dragon Avatar',
    description: 'Unlocks the legendary Dragon profile avatar!',
    type: 'avatarPic',
    coinValue: 150,
  },
  {
    day: 6,
    icon: '🪙',
    label: '300 Coins',
    description: "Almost there — big reward tomorrow!",
    type: 'coins',
    coinValue: 300,
  },
  {
    day: 7,
    icon: '👽',
    label: 'Premium Pack',
    description: 'Alien avatar + Golden card back + 500 coins!',
    type: 'premium',
    coinValue: 500,
  },
];

// ─── Mission Pool ──────────────────────────────────────────────────────────

interface MissionTemplate {
  type: MissionType;
  icon: string;
  goals: number[];
  labelFn: (n: number) => string;
  descFn: (n: number) => string;
}

const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    type: 'gamesPlayed',
    icon: '🎮',
    goals: [2, 3, 4, 5],
    labelFn: (n) => `Play ${n} Games`,
    descFn: (n) => `Complete ${n} full games today`,
  },
  {
    type: 'wins',
    icon: '🏆',
    goals: [1, 2, 3],
    labelFn: (n) => `Win ${n} Game${n > 1 ? 's' : ''}`,
    descFn: (n) => `Finish in 1st place ${n} time${n > 1 ? 's' : ''} today`,
  },
  {
    type: 'correctTicks',
    icon: '🔔',
    goals: [1, 2, 3],
    labelFn: (n) => `${n} Correct Tick${n > 1 ? 's' : ''}`,
    descFn: (n) => `Make ${n} correct Tick declaration${n > 1 ? 's' : ''}`,
  },
  {
    type: 'top2Finishes',
    icon: '🥈',
    goals: [1, 2, 3],
    labelFn: (n) => `Top 2 Finish ×${n}`,
    descFn: (n) => `Finish in top 2 players ${n} time${n > 1 ? 's' : ''}`,
  },
  {
    type: 'lowScoreWin',
    icon: '⭐',
    goals: [5, 10, 15],
    labelFn: (_n) => 'Low-Score Victory',
    descFn: (n) => `Win a game with total score ≤ ${n} pts`,
  },
  {
    type: 'gamesPlayed',
    icon: '🎯',
    goals: [3, 5, 7],
    labelFn: (n) => `Marathon: ${n} Games`,
    descFn: (n) => `Play ${n} games in a single day`,
  },
  {
    type: 'wins',
    icon: '🔥',
    goals: [2, 3],
    labelFn: (n) => `Hot Streak: Win ${n}`,
    descFn: (n) => `Win ${n} games today`,
  },
  {
    type: 'top2Finishes',
    icon: '🎖️',
    goals: [2, 3],
    labelFn: (n) => `Podium Finishes ×${n}`,
    descFn: (n) => `Land in top 2 position ${n} times`,
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Deterministic pseudo-random generator seeded by a number. */
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = ((s * 9301 + 49297) % 233280);
    return s / 233280;
  };
}

function dateToSeed(dateStr: string): number {
  return parseInt(dateStr.replace(/-/g, ''), 10);
}

/** Generate exactly 3 daily missions seeded by the given date string. */
function generateMissions(dateStr: string): DailyMission[] {
  const rand = seededRand(dateToSeed(dateStr));

  // Fisher-Yates shuffle with seeded random
  const indices = MISSION_TEMPLATES.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Pick 3 with distinct types
  const picked: MissionTemplate[] = [];
  const usedTypes = new Set<MissionType>();
  for (const idx of indices) {
    if (picked.length >= 3) break;
    const tmpl = MISSION_TEMPLATES[idx];
    if (!usedTypes.has(tmpl.type)) {
      picked.push(tmpl);
      usedTypes.add(tmpl.type);
    }
  }
  // Fallback: fill to 3 if needed (edge-case)
  for (const idx of indices) {
    if (picked.length >= 3) break;
    if (!picked.includes(MISSION_TEMPLATES[idx])) picked.push(MISSION_TEMPLATES[idx]);
  }

  return picked.slice(0, 3).map((tmpl, i) => {
    const goalIdx = Math.floor(rand() * tmpl.goals.length);
    const goal = tmpl.goals[goalIdx];
    return {
      id: `m_${i}`,
      label: tmpl.labelFn(goal),
      description: tmpl.descFn(goal),
      icon: tmpl.icon,
      goal,
      progress: 0,
      claimed: false,
      type: tmpl.type,
    };
  });
}

// ─── State I/O ─────────────────────────────────────────────────────────────

const DAILY_KEY = 'daily_state';

function createDefault(): DailyState {
  return {
    streakDay: 0,
    lastLoginDate: '',
    todayRewardClaimed: false,
    missions: [],
    missionsDate: '',
    coins: 0,
    unlockedCardBacks: ['classic'],
    unlockedAvatars: ['none'],
    unlockedAvatarPics: ['none', 'cat'],
    selectedCardBack: 'classic',
    selectedAvatar: 'none',
    unlockedTableFelts: ['emerald_green'],
    selectedTableFelt: 'emerald_green',
  };
}

function loadState(): DailyState {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = { ...createDefault(), ...parsed };
      if (!state.unlockedCardBacks || state.unlockedCardBacks.length === 0) {
        state.unlockedCardBacks = ['classic'];
      }
      if (!state.unlockedAvatars || state.unlockedAvatars.length === 0) {
        state.unlockedAvatars = ['none'];
      }
      if (!state.unlockedAvatarPics || state.unlockedAvatarPics.length === 0) {
        state.unlockedAvatarPics = ['none', 'cat'];
      }
      // Migration: lock old default profile pictures
      if (state.unlockedAvatarPics && state.unlockedAvatarPics.length === 7 && state.unlockedAvatarPics.includes('fox') && state.unlockedAvatarPics.includes('unicorn')) {
        state.unlockedAvatarPics = ['none', 'cat'];
      }
      if (!state.unlockedTableFelts || state.unlockedTableFelts.length === 0) {
        state.unlockedTableFelts = ['emerald_green'];
      }
      if (!state.selectedCardBack) state.selectedCardBack = 'classic';
      if (!state.selectedAvatar) state.selectedAvatar = 'none';
      if (!state.selectedTableFelt) state.selectedTableFelt = 'emerald_green';
      return state;
    }
  } catch (_) { /* ignore */ }
  return createDefault();
}

function saveState(state: DailyState): void {
  const raw = JSON.stringify(state);
  localStorage.setItem(DAILY_KEY, raw);
  savePersistentItem(DAILY_KEY, raw);
  
  // Cache active selections for fast components reading (no JSON parsing on hot render paths)
  localStorage.setItem('selected_card_back', state.selectedCardBack);
  localStorage.setItem('selected_avatar', state.selectedAvatar);
  localStorage.setItem('selected_table_felt', state.selectedTableFelt || 'emerald_green');
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Initialize / refresh daily state.
 * - Increments or resets the streak depending on login history.
 * - Generates fresh missions for the current day if not yet done.
 * Call this on app start and when opening the Daily panel.
 */
export function initDailyState(): DailyState {
  let state = loadState();
  const today = getTodayStr();

  if (state.lastLoginDate !== today) {
    const yesterday = getYesterdayStr();
    if (state.lastLoginDate === '') {
      // First ever login
      state.streakDay = 1;
    } else if (state.lastLoginDate === yesterday) {
      // Consecutive day — increment streak indefinitely to allow multiple cycles
      state.streakDay = state.streakDay + 1;
    } else {
      // Streak broken — reset to Day 1
      state.streakDay = 1;
    }
    state.lastLoginDate = today;
    state.todayRewardClaimed = false;
  }

  // Regenerate missions for a new day
  if (state.missionsDate !== today) {
    state.missions = generateMissions(today);
    state.missionsDate = today;
  }

  saveState(state);
  return state;
}

/** Read current daily state without updating streak. */
export function getDailyState(): DailyState {
  return loadState();
}

/** Get the list of rewards for the cycle the player is on. Dynamic compensation if already owned. */
export function getDailyRewardsForState(state: DailyState): DailyReward[] {
  const cycleNum = Math.floor((state.streakDay - 1) / 7) + 1;
  const activeCycle = ((cycleNum - 1) % 7) + 1;

  // Let's determine the profile picture to unlock on Day 5 based on activeCycle
  let day5PicId = 'fox';
  let day5PicName = 'Fox Avatar';
  let day5PicIcon = '🦊';
  let day5PicDesc = 'Unlocks the rare Fox profile picture!';

  if (activeCycle === 1) {
    day5PicId = 'fox';
    day5PicName = 'Fox Avatar';
    day5PicIcon = '🦊';
    day5PicDesc = 'Unlocks the rare Fox profile picture!';
  } else if (activeCycle === 2) {
    day5PicId = 'monkey';
    day5PicName = 'Monkey Avatar';
    day5PicIcon = '🐒';
    day5PicDesc = 'Unlocks the mischievous Monkey profile picture!';
  } else if (activeCycle === 3) {
    day5PicId = 'panda';
    day5PicName = 'Panda Avatar';
    day5PicIcon = '🐼';
    day5PicDesc = 'Unlocks the cute Panda profile picture!';
  } else if (activeCycle === 4) {
    day5PicId = 'robot';
    day5PicName = 'Robot Avatar';
    day5PicIcon = '🤖';
    day5PicDesc = 'Unlocks the cybernetic Robot profile picture!';
  } else if (activeCycle === 5) {
    day5PicId = 'unicorn';
    day5PicName = 'Unicorn Avatar';
    day5PicIcon = '🦄';
    day5PicDesc = 'Unlocks the magical Unicorn profile picture!';
  } else if (activeCycle === 6) {
    day5PicId = 'dragon';
    day5PicName = 'Dragon Avatar';
    day5PicIcon = '🐲';
    day5PicDesc = 'Unlocks the legendary Dragon profile picture!';
  } else if (activeCycle === 7) {
    day5PicId = 'alien';
    day5PicName = 'Alien Avatar';
    day5PicIcon = '👽';
    day5PicDesc = 'Unlocks the cosmic Alien profile picture!';
  }

  // Day 2 Coins (Frame replacement)
  let day2Coins = 100 + activeCycle * 50;

  // Day 3 Card Back
  let day3BackId = 'holographic';
  let day3BackName = 'Holographic Card Back';
  let day3BackIcon = '🃏';
  let day3BackDesc = 'Exclusive holographic card back theme';
  let day3Coins = 75;

  if (activeCycle === 1) {
    day3BackId = 'holographic';
    day3BackName = 'Holographic Card Back';
  } else if (activeCycle === 2) {
    day3BackId = 'emerald';
    day3BackName = 'Emerald Card Back';
    day3BackIcon = '🌲';
    day3BackDesc = 'Elegant emerald marble card back theme';
    day3Coins = 125;
  } else if (activeCycle === 3) {
    day3BackId = 'amethyst';
    day3BackName = 'Amethyst Card Back';
    day3BackIcon = '🔮';
    day3BackDesc = 'Deep purple crystalline card back theme';
    day3Coins = 175;
  } else if (activeCycle === 4) {
    day3BackId = 'ruby';
    day3BackName = 'Ruby Card Back';
    day3BackIcon = '❤️';
    day3BackDesc = 'Crimson red metallic card back theme';
    day3Coins = 225;
  } else if (activeCycle === 5) {
    day3BackId = 'sapphire';
    day3BackName = 'Sapphire Card Back';
    day3BackIcon = '🌊';
    day3BackDesc = 'Royal blue waves card back theme';
    day3Coins = 275;
  } else if (activeCycle === 6) {
    day3BackId = 'steampunk';
    day3BackName = 'Steampunk Card Back';
    day3BackIcon = '🔧';
    day3BackDesc = 'Ornate bronze gears card back theme';
    day3Coins = 325;
  } else if (activeCycle === 7) {
    day3BackId = 'prism';
    day3BackName = 'Prism Card Back';
    day3BackIcon = '💎';
    day3BackDesc = 'Prismatic color shifting card back theme';
    day3Coins = 375;
  }

  // Day 7 Premium Packs
  let day7Label = 'Premium Pack';
  let day7Desc = 'Golden Card Back + 500 coins!';
  let day7Icon = '🎁';
  let day7Coins = 500;

  if (activeCycle === 1) {
    day7Label = 'Premium Pack';
    day7Desc = 'Golden Card Back + 500 coins!';
  } else if (activeCycle === 2) {
    day7Label = 'Mega Pack';
    day7Desc = 'Obsidian Card Back + Gold Aura Frame + 1000 coins!';
    day7Icon = '🔮';
    day7Coins = 1000;
  } else if (activeCycle === 3) {
    day7Label = 'Royal Pack';
    day7Desc = 'Royal Crown Frame + 1500 coins!';
    day7Icon = '👑';
    day7Coins = 1500;
  } else if (activeCycle === 4) {
    day7Label = 'Cyber Pack';
    day7Desc = 'Cyberpunk Card Back + Cyberpunk Frame + 2000 coins!';
    day7Icon = '💻';
    day7Coins = 2000;
  } else if (activeCycle === 5) {
    day7Label = 'Lava Pack';
    day7Desc = 'Volcanic Lava Card Back + Lava Frame + 2500 coins!';
    day7Icon = '🌋';
    day7Coins = 2500;
  } else if (activeCycle === 6) {
    day7Label = 'Cosmic Pack';
    day7Desc = 'Cosmic Nebula Card Back + Cosmic Frame + 3000 coins!';
    day7Icon = '🌌';
    day7Coins = 3000;
  } else if (activeCycle === 7) {
    day7Label = 'Dragon Emperor Pack';
    day7Desc = 'Dragon Scale Card Back + Dragon Frame + 5000 coins!';
    day7Icon = '👑';
    day7Coins = 5000;
  }

  // Generate the 7 rewards for this week
  const baseRewards: DailyReward[] = [
    {
      day: 1,
      icon: '🪙',
      label: `${50 + activeCycle * 50} Coins`,
      description: `A start to your week ${activeCycle} daily streak`,
      type: 'coins',
      coinValue: 50 + activeCycle * 50,
    },
    {
      day: 2,
      icon: '🪙',
      label: `${day2Coins} Coins`,
      description: `Streak day 2 login bonus!`,
      type: 'coins',
      coinValue: day2Coins,
    },
    {
      day: 3,
      icon: day3BackIcon,
      label: day3BackName,
      description: day3BackDesc,
      type: 'cardBack',
      coinValue: day3Coins,
      itemId: day3BackId,
    },
    {
      day: 4,
      icon: '🪙',
      label: '200 Coins',
      description: 'Mid-week bonus reward',
      type: 'coins',
      coinValue: 200,
    },
    {
      day: 5,
      icon: day5PicIcon,
      label: day5PicName,
      description: day5PicDesc,
      type: 'avatarPic',
      coinValue: 100 + activeCycle * 50,
      itemId: day5PicId,
    },
    {
      day: 6,
      icon: '🪙',
      label: '300 Coins',
      description: 'Almost there — big reward tomorrow!',
      type: 'coins',
      coinValue: 300,
    },
    {
      day: 7,
      icon: day7Icon,
      label: day7Label,
      description: day7Desc,
      type: 'premium',
      coinValue: day7Coins,
    },
  ];

  return baseRewards.map(reward => {
    let owned = false;
    let fallbackCoins = 0;
    let fallbackLabel = '';

    if (reward.itemId) {
      if (reward.type === 'avatar' && state.unlockedAvatars.includes(reward.itemId)) {
        owned = true;
        fallbackCoins = 500;
        fallbackLabel = `${fallbackCoins} Coins`;
      } else if (reward.type === 'cardBack' && state.unlockedCardBacks.includes(reward.itemId)) {
        owned = true;
        fallbackCoins = 750;
        fallbackLabel = `${fallbackCoins} Coins`;
      } else if (reward.type === 'avatarPic' && state.unlockedAvatarPics.includes(reward.itemId)) {
        owned = true;
        fallbackCoins = 500;
        fallbackLabel = `${fallbackCoins} Coins`;
      }
    } else if (reward.type === 'premium') {
      let isCardBackUnlocked = false;
      let isAvatarUnlocked = false;

      if (activeCycle === 1) {
        isCardBackUnlocked = state.unlockedCardBacks.includes('gold');
        isAvatarUnlocked = true;
      } else if (activeCycle === 2) {
        isCardBackUnlocked = state.unlockedCardBacks.includes('obsidian');
        isAvatarUnlocked = true;
      } else if (activeCycle === 3) {
        isCardBackUnlocked = true;
        isAvatarUnlocked = true;
      } else if (activeCycle === 4) {
        isCardBackUnlocked = state.unlockedCardBacks.includes('cyberpunk');
        isAvatarUnlocked = true;
      } else if (activeCycle === 5) {
        isCardBackUnlocked = state.unlockedCardBacks.includes('lava');
        isAvatarUnlocked = true;
      } else if (activeCycle === 6) {
        isCardBackUnlocked = state.unlockedCardBacks.includes('cosmic');
        isAvatarUnlocked = true;
      } else if (activeCycle === 7) {
        isCardBackUnlocked = state.unlockedCardBacks.includes('dragon_scale');
        isAvatarUnlocked = true;
      }

      if (isCardBackUnlocked && isAvatarUnlocked) {
        owned = true;
        fallbackCoins = 1500;
        fallbackLabel = `${fallbackCoins} Coins`;
      }
    }

    if (owned) {
      return {
        ...reward,
        label: `${fallbackLabel} (Owned)`,
        description: `You already own the ${reward.label}! Converted to bonus coins.`,
        icon: '🪙',
        coinValue: reward.coinValue + fallbackCoins,
      };
    }

    return reward;
  });
}

/** Claim today's login reward. Returns updated state. */
export function claimDailyReward(): DailyState {
  let state = loadState();
  if (state.todayRewardClaimed) return state;

  const cycleNum = Math.floor((state.streakDay - 1) / 7) + 1;
  const cycleRewards = getDailyRewardsForState(state);
  const rewardIdx = (state.streakDay - 1) % cycleRewards.length;
  const reward = cycleRewards[rewardIdx];

  const nextUnlockedCardBacks = [...state.unlockedCardBacks];
  const nextUnlockedAvatars = [...state.unlockedAvatars];
  const nextUnlockedAvatarPics = [...(state.unlockedAvatarPics || ['none', 'cat'])];

  // Only unlock if they are not already owned (which would mean it was converted to coins)
  if (!reward.label.includes('(Owned)')) {
    if (reward.type === 'avatar' && reward.itemId) {
      if (!nextUnlockedAvatars.includes(reward.itemId)) {
        nextUnlockedAvatars.push(reward.itemId);
      }
    } else if (reward.type === 'cardBack' && reward.itemId) {
      if (!nextUnlockedCardBacks.includes(reward.itemId)) {
        nextUnlockedCardBacks.push(reward.itemId);
      }
    } else if (reward.type === 'avatarPic' && reward.itemId) {
      if (!nextUnlockedAvatarPics.includes(reward.itemId)) {
        nextUnlockedAvatarPics.push(reward.itemId);
      }
    } else if (reward.type === 'premium') {
      const activeCycle = ((cycleNum - 1) % 7) + 1;
      if (activeCycle === 1) {
        if (!nextUnlockedCardBacks.includes('gold')) nextUnlockedCardBacks.push('gold');
      } else if (activeCycle === 2) {
        if (!nextUnlockedCardBacks.includes('obsidian')) nextUnlockedCardBacks.push('obsidian');
      } else if (activeCycle === 3) {
        // No frame to unlock
      } else if (activeCycle === 4) {
        if (!nextUnlockedCardBacks.includes('cyberpunk')) nextUnlockedCardBacks.push('cyberpunk');
      } else if (activeCycle === 5) {
        if (!nextUnlockedCardBacks.includes('lava')) nextUnlockedCardBacks.push('lava');
      } else if (activeCycle === 6) {
        if (!nextUnlockedCardBacks.includes('cosmic')) nextUnlockedCardBacks.push('cosmic');
      } else if (activeCycle === 7) {
        if (!nextUnlockedCardBacks.includes('dragon_scale')) nextUnlockedCardBacks.push('dragon_scale');
      }
    }
  }

  state = {
    ...state,
    todayRewardClaimed: true,
    coins: state.coins + reward.coinValue,
    unlockedCardBacks: nextUnlockedCardBacks,
    unlockedAvatars: nextUnlockedAvatars,
    unlockedAvatarPics: nextUnlockedAvatarPics,
  };
  saveState(state);
  return state;
}



/** Claim a completed mission by id. Returns updated state. */
export function claimMission(missionId: string): DailyState {
  let state = loadState();
  const mission = state.missions.find(m => m.id === missionId);
  if (!mission || mission.progress < mission.goal || mission.claimed) return state;

  state = {
    ...state,
    missions: state.missions.map(m => m.id === missionId ? { ...m, claimed: true } : m),
    coins: state.coins + 75,
  };
  saveState(state);
  return state;
}

/**
 * Update mission progress after a completed game.
 * Pass the gameId to guard against double-counting the same game.
 */
export function recordGameResult(
  data: {
    isWin: boolean;
    isTop2: boolean;
    correctTicks: number;
    winScore?: number;
  },
  gameId?: string
): void {
  let state = loadState();
  const today = getTodayStr();

  // Guard: don't process the same game twice for daily missions
  if (gameId && state.lastProcessedGameId === gameId) return;
  if (state.missionsDate !== today) return; // safety guard for stale state

  state = {
    ...state,
    missions: state.missions.map(m => {
      if (m.claimed || m.progress >= m.goal) return m;

      let delta = 0;
      switch (m.type) {
        case 'gamesPlayed':
          delta = 1;
          break;
        case 'wins':
          delta = data.isWin ? 1 : 0;
          break;
        case 'correctTicks':
          delta = data.correctTicks;
          break;
        case 'top2Finishes':
          delta = data.isTop2 ? 1 : 0;
          break;
        case 'lowScoreWin':
          if (data.isWin && data.winScore !== undefined && data.winScore <= m.goal) {
            return { ...m, progress: m.goal }; // instantly complete
          }
          return m;
      }

      return { ...m, progress: Math.min(m.progress + delta, m.goal) };
    }),
    ...(gameId ? { lastProcessedGameId: gameId } : {}),
  };

  saveState(state);
}

/** Returns true if there are unclaimed login rewards or completed-but-unclaimed missions. */
export function hasUnclaimedDaily(): boolean {
  const state = loadState();
  const today = getTodayStr();
  // Show badge if it's a new day (streak not yet logged)
  if (state.lastLoginDate !== today) return true;
  if (!state.todayRewardClaimed) return true;
  return state.missions.some(m => m.progress >= m.goal && !m.claimed);
}

/** Get the DailyReward definition for the given streak day. */
export function getDailyRewardForDay(streakDay: number, state: DailyState): DailyReward {
  const cycleRewards = getDailyRewardsForState(state);
  const idx = Math.max(0, (streakDay - 1) % cycleRewards.length);
  return cycleRewards[idx];
}

/** Purchase a shop item. Returns updated state. */
export function purchaseShopItem(itemType: 'cardBack' | 'avatar' | 'tableFelt' | 'avatarPic', itemId: string, price: number): DailyState {
  let state = loadState();
  if (state.coins < price) return state;
  
  if (itemType === 'cardBack') {
    if (state.unlockedCardBacks.includes(itemId)) return state;
    state.unlockedCardBacks = [...state.unlockedCardBacks, itemId];
  } else if (itemType === 'avatar') {
    if (state.unlockedAvatars.includes(itemId)) return state;
    state.unlockedAvatars = [...state.unlockedAvatars, itemId];
  } else if (itemType === 'avatarPic') {
    if (!state.unlockedAvatarPics) state.unlockedAvatarPics = ['none', 'cat'];
    if (state.unlockedAvatarPics.includes(itemId)) return state;
    state.unlockedAvatarPics = [...state.unlockedAvatarPics, itemId];
  } else if (itemType === 'tableFelt') {
    if (!state.unlockedTableFelts) state.unlockedTableFelts = ['emerald_green'];
    if (state.unlockedTableFelts.includes(itemId)) return state;
    state.unlockedTableFelts = [...state.unlockedTableFelts, itemId];
  }
  
  state.coins -= price;
  saveState(state);
  return state;
}

/** Equip a purchased shop item. Returns updated state. */
export function equipShopItem(itemType: 'cardBack' | 'avatar' | 'tableFelt' | 'avatarPic', itemId: string): DailyState {
  let state = loadState();
  
  if (itemType === 'cardBack') {
    if (!state.unlockedCardBacks.includes(itemId)) return state;
    state.selectedCardBack = itemId;
  } else if (itemType === 'avatar') {
    if (!state.unlockedAvatars.includes(itemId)) return state;
    state.selectedAvatar = itemId;
  } else if (itemType === 'avatarPic') {
    if (!state.unlockedAvatarPics) state.unlockedAvatarPics = ['none', 'cat'];
    if (!state.unlockedAvatarPics.includes(itemId)) return state;
    localStorage.setItem('selected_avatar_pic', itemId);
  } else if (itemType === 'tableFelt') {
    if (!state.unlockedTableFelts) state.unlockedTableFelts = ['emerald_green'];
    if (!state.unlockedTableFelts.includes(itemId)) return state;
    state.selectedTableFelt = itemId;
  }
  
  saveState(state);
  return state;
}
