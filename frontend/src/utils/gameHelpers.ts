export type AiLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface Card {
  suit?: 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES' | null;
  rank?: 'ACE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE' | 'SIX' | 'SEVEN' | 'EIGHT' | 'NINE' | 'TEN' | 'JACK' | 'QUEEN' | 'KING' | null;
  joker: boolean;
  value?: number;
}

/** Shape returned by the update-checker service. */
export interface UpdateInfo {
  version: string;
  apkUrl: string;
}

/**
 * Resolves the avatar picture ID for a player.
 * Shared across GameTable, GameOverModal and RoundResultModal.
 *
 * @param player       - The player object from game state.
 * @param currentPlayerId - The local player's ID (used to read local storage for their own pic).
 */
export const getAvatarPic = (player: { id: string; name?: string | null; isAi?: boolean; avatarPic?: string | null }, currentPlayerId: string): string | null => {
  if (player.avatarPic && player.avatarPic !== 'none') {
    return player.avatarPic;
  }
  if (player.id === currentPlayerId) {
    const pic = localStorage.getItem('selected_avatar_pic');
    return pic && pic !== 'none' ? pic : null;
  }
  if (player.isAi) {
    const name = player.name || '';
    const numMatch = name.match(/\d+/);
    const index = numMatch ? parseInt(numMatch[0], 10) : (player.id ? player.id.charCodeAt(0) : 0);
    const botAvatars = ['panda', 'fox', 'cat', 'alien', 'monkey', 'unicorn', 'dragon'];
    return botAvatars[(index - 1 + botAvatars.length) % botAvatars.length];
  }
  return null;
};

export const getSuitSymbol = (suit?: string | null): string => {
  if (!suit) return '';
  switch (suit) {
    case 'HEARTS': return '♥';
    case 'DIAMONDS': return '♦';
    case 'CLUBS': return '♣';
    case 'SPADES': return '♠';
    default: return '';
  }
};

export const getSuitClass = (suit?: string | null): string => {
  if (!suit) return 'suit-joker';
  return `suit-${suit.toLowerCase()}`;
};

export const getRankDisplay = (rank?: string | null): string => {
  if (!rank) return '';
  switch (rank) {
    case 'ACE': return 'A';
    case 'TWO': return '2';
    case 'THREE': return '3';
    case 'FOUR': return '4';
    case 'FIVE': return '5';
    case 'SIX': return '6';
    case 'SEVEN': return '7';
    case 'EIGHT': return '8';
    case 'NINE': return '9';
    case 'TEN': return '10';
    case 'JACK': return 'J';
    case 'QUEEN': return 'Q';
    case 'KING': return 'K';
    default: return '';
  }
};
