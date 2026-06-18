import { savePersistentItem } from './persistentStorage';

// ─── Types ─────────────────────────────────────────────────────────────────

export type MissionType = 'wins' | 'correctTicks' | 'gamesPlayed' | 'top2Finishes' | 'lowScoreWin';
export type RewardType = 'coins' | 'avatar' | 'cardBack' | 'premium' | 'bonus';

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
  selectedCardBack: string;
  selectedAvatar: string;
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
    icon: '🎨',
    label: 'Avatar Frame',
    description: 'Rare neon avatar frame unlocked',
    type: 'avatar',
    coinValue: 50,
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
    icon: '⚡',
    label: 'XP Boost',
    description: 'Score multiplier for 3 upcoming games',
    type: 'bonus',
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
    icon: '🎁',
    label: 'Premium Pack',
    description: 'Special card back + 500 bonus coins!',
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
    selectedCardBack: 'classic',
    selectedAvatar: 'none',
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
      if (!state.selectedCardBack) state.selectedCardBack = 'classic';
      if (!state.selectedAvatar) state.selectedAvatar = 'none';
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
      // Consecutive day — increment streak, wrap at 7 back to 1
      state.streakDay = (state.streakDay % 7) + 1;
    } else {
      // Streak broken
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

/** Claim today's login reward. Returns updated state. */
export function claimDailyReward(): DailyState {
  let state = loadState();
  if (state.todayRewardClaimed) return state;

  const rewardIdx = (state.streakDay - 1) % DAILY_REWARDS.length;
  const reward = DAILY_REWARDS[rewardIdx];

  const nextUnlockedCardBacks = [...state.unlockedCardBacks];
  const nextUnlockedAvatars = [...state.unlockedAvatars];

  if (reward.type === 'avatar') {
    if (!nextUnlockedAvatars.includes('neon_frame')) {
      nextUnlockedAvatars.push('neon_frame');
    }
  } else if (reward.type === 'cardBack') {
    if (!nextUnlockedCardBacks.includes('holographic')) {
      nextUnlockedCardBacks.push('holographic');
    }
  } else if (reward.type === 'premium') {
    if (!nextUnlockedCardBacks.includes('gold')) {
      nextUnlockedCardBacks.push('gold');
    }
  }

  state = {
    ...state,
    todayRewardClaimed: true,
    coins: state.coins + reward.coinValue,
    unlockedCardBacks: nextUnlockedCardBacks,
    unlockedAvatars: nextUnlockedAvatars,
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
export function getDailyRewardForDay(streakDay: number): DailyReward {
  const idx = Math.max(0, (streakDay - 1) % DAILY_REWARDS.length);
  return DAILY_REWARDS[idx];
}

/** Purchase a shop item. Returns updated state. */
export function purchaseShopItem(itemType: 'cardBack' | 'avatar', itemId: string, price: number): DailyState {
  let state = loadState();
  if (state.coins < price) return state;
  
  if (itemType === 'cardBack') {
    if (state.unlockedCardBacks.includes(itemId)) return state;
    state.unlockedCardBacks = [...state.unlockedCardBacks, itemId];
  } else {
    if (state.unlockedAvatars.includes(itemId)) return state;
    state.unlockedAvatars = [...state.unlockedAvatars, itemId];
  }
  
  state.coins -= price;
  saveState(state);
  return state;
}

/** Equip a purchased shop item. Returns updated state. */
export function equipShopItem(itemType: 'cardBack' | 'avatar', itemId: string): DailyState {
  let state = loadState();
  
  if (itemType === 'cardBack') {
    if (!state.unlockedCardBacks.includes(itemId)) return state;
    state.selectedCardBack = itemId;
  } else {
    if (!state.unlockedAvatars.includes(itemId)) return state;
    state.selectedAvatar = itemId;
  }
  
  saveState(state);
  return state;
}
