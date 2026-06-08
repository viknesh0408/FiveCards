export type AiLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface Card {
  suit?: 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES' | null;
  rank?: 'ACE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE' | 'SIX' | 'SEVEN' | 'EIGHT' | 'NINE' | 'TEN' | 'JACK' | 'QUEEN' | 'KING' | null;
  joker: boolean;
  value?: number;
}

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
