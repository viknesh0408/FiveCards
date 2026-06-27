import type { Card } from './gameHelpers';

export type AiLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface LocalPlayer {
  id: string;
  name: string;
  isAi: boolean;
  aiLevel: AiLevel | null;
  hand: Card[];
  roundScore: number;
  totalScore: number;
  ready: boolean;
  declaredTick: boolean;
  timeoutCount: number;
  avatar: string;
  avatarPic: string;
}

export interface LocalRound {
  roundNumber: number;
  jokerCard: Card;
  jokerRank: string;
  drawPile: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  roundEnded: boolean;
  tickPlayerId: string | null;
  endCondition: string | null; // "TICK" | "DECK_EXHAUSTED" | "OUT_OF_CARDS"
  needsToDraw: boolean;
  hasDiscardedThisTurn: boolean;
  cardsDiscardedThisTurn: number;
  turnStartedAt: number | null;
  firstTurnCompleted: boolean;
  playerScores: Record<string, number>;
}

export interface LocalGame {
  gameId: string;
  players: LocalPlayer[];
  currentRoundNumber: number;
  maxRounds: number;
  currentRound: LocalRound | null;
  rounds: LocalRound[];
  status: 'WAITING_FOR_PLAYERS' | 'IN_PROGRESS' | 'ROUND_OVER' | 'GAME_OVER';
  winnerId: string | null;
  isMultiplayer: boolean;
  hostId: string;
  spectators: any[];
}

// Map ranks to their default points
const RANK_POINTS: Record<string, number> = {
  'ACE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5,
  'SIX': 6, 'SEVEN': 7, 'EIGHT': 8, 'NINE': 9, 'TEN': 10,
  'JACK': 11, 'QUEEN': 12, 'KING': 13
};

const SUITS: Card['suit'][] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
const RANKS: Card['rank'][] = [
  'ACE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN',
  'EIGHT', 'NINE', 'TEN', 'JACK', 'QUEEN', 'KING'
];

export const getCardValue = (card: Card, jokerRank: string | null): number => {
  if (card.joker) return 0;
  if (jokerRank && card.rank === jokerRank) return 0;
  return card.rank ? RANK_POINTS[card.rank] || 0 : 0;
};

// Shuffle helper
const shuffle = <T>(array: T[]): T[] => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const createStandardDeck = (): Card[] => {
  let deck: Card[] = [];
  
  // Standard 52 cards
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        joker: false,
        value: RANK_POINTS[rank!]
      });
    }
  }

  // 2 Printed Jokers
  deck.push({ suit: null, rank: null, joker: true, value: 0 });
  deck.push({ suit: null, rank: null, joker: true, value: 0 });

  // 20 extra cards from second deck
  let extraDeck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      extraDeck.push({
        suit,
        rank,
        joker: false,
        value: RANK_POINTS[rank!]
      });
    }
  }
  extraDeck = shuffle(extraDeck);
  deck.push(...extraDeck.slice(0, 20));

  return deck;
};

export const createLocalGame = (maxRounds: number, aiCount: number, playerName: string, playerId: string): LocalGame => {
  const players: LocalPlayer[] = [];

  // Add Human Player
  players.push({
    id: playerId,
    name: playerName,
    isAi: false,
    aiLevel: null,
    hand: [],
    roundScore: 0,
    totalScore: 0,
    ready: false,
    declaredTick: false,
    timeoutCount: 0,
    avatar: localStorage.getItem('selected_avatar') || 'none',
    avatarPic: localStorage.getItem('selected_avatar_pic') || 'none',
  });

  // Add Bots
  const firstNames = ['Aarav', 'Vihaan', 'Aditya', 'Sai', 'Arjun', 'Kabir', 'Rohan', 'Reyansh', 'Ishaan', 'Dev'];
  const shuffledNames = shuffle(firstNames);

  for (let i = 0; i < aiCount; i++) {
    players.push({
      id: `BOT_${i + 1}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: shuffledNames[i] || `Bot ${i + 1}`,
      isAi: true,
      aiLevel: 'MEDIUM',
      hand: [],
      roundScore: 0,
      totalScore: 0,
      ready: true, // Bots are always ready
      declaredTick: false,
      timeoutCount: 0,
      avatar: 'none',
      avatarPic: 'none',
    });
  }

  return {
    gameId: `LOCAL_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    players,
    currentRoundNumber: 0,
    maxRounds: maxRounds > 0 ? maxRounds : 10,
    currentRound: null,
    rounds: [],
    status: 'WAITING_FOR_PLAYERS',
    winnerId: null,
    isMultiplayer: false,
    hostId: playerId,
    spectators: [],
  };
};

export const startNextRound = (game: LocalGame): void => {
  const nextRoundNumber = game.currentRoundNumber + 1;
  if (nextRoundNumber > game.maxRounds) {
    return;
  }

  game.currentRoundNumber = nextRoundNumber;
  game.status = 'IN_PROGRESS';

  // 1. Create and shuffle deck
  const deck = shuffle(createStandardDeck());

  // 2. Select Joker card
  const jokerCard = deck.shift()!;
  const jokerRank = jokerCard.joker ? 'ACE' : (jokerCard.rank as string);

  // Mark all remaining cards of same rank as Jokers
  for (const card of deck) {
    if (card.rank === jokerRank) {
      card.joker = true;
    }
    card.value = getCardValue(card, jokerRank);
  }

  // 3. Clear hands and reset readiness
  for (const p of game.players) {
    p.hand = [];
    p.declaredTick = false;
    p.roundScore = 0;
    if (!p.isAi) {
      p.ready = false;
    }
  }

  // 4. Deal 5 cards
  for (let i = 0; i < 5; i++) {
    for (const p of game.players) {
      const card = deck.shift()!;
      p.hand.push(card);
    }
  }

  // Calculate hands points initially
  for (const p of game.players) {
    for (const c of p.hand) {
      c.value = getCardValue(c, jokerRank);
    }
  }

  // 5. Setup Round
  const startingPlayerIndex = (nextRoundNumber - 1) % game.players.length;
  
  const round: LocalRound = {
    roundNumber: nextRoundNumber,
    jokerCard,
    jokerRank,
    drawPile: deck,
    discardPile: [deck.shift()!],
    currentPlayerIndex: startingPlayerIndex,
    roundEnded: false,
    tickPlayerId: null,
    endCondition: null,
    needsToDraw: false,
    hasDiscardedThisTurn: false,
    cardsDiscardedThisTurn: 0,
    turnStartedAt: Date.now(),
    firstTurnCompleted: false,
    playerScores: {},
  };

  // Ensure first discard pile card is marked correctly for points
  round.discardPile[0].value = getCardValue(round.discardPile[0], jokerRank);

  game.currentRound = round;
};

export const drawCard = (game: LocalGame, playerId: string, fromDiscard: boolean): Card => {
  const round = game.currentRound;
  if (!round || round.roundEnded) {
    throw new Error('Round is not active');
  }

  const currentPlayer = game.players[round.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    throw new Error('Not your turn!');
  }

  if (!round.hasDiscardedThisTurn) {
    throw new Error('Must discard a card before drawing');
  }

  if (!round.needsToDraw) {
    throw new Error('You matched the previous discard; no need to draw.');
  }

  let drawnCard: Card;
  if (fromDiscard) {
    let k = round.cardsDiscardedThisTurn;
    if (k <= 0) {
      k = 5 - currentPlayer.hand.length;
    }
    const drawableIndex = round.discardPile.length - k - 1;
    if (drawableIndex < 0 || drawableIndex >= round.discardPile.length) {
      throw new Error('No previous discard card available to draw.');
    }
    drawnCard = round.discardPile.splice(drawableIndex, 1)[0];
  } else {
    if (round.drawPile.length === 0) {
      round.endCondition = 'DECK_EXHAUSTED';
      endRound(game, round);
      throw new Error('Draw pile is empty. Round ended.');
    }
    drawnCard = round.drawPile.shift()!;
  }

  drawnCard.value = getCardValue(drawnCard, round.jokerRank);
  currentPlayer.hand.push(drawnCard);
  round.needsToDraw = false;
  return drawnCard;
};

export const discardCard = (game: LocalGame, playerId: string, cardToDiscard: Card): void => {
  const round = game.currentRound;
  if (!round || round.roundEnded) {
    throw new Error('Round is not active');
  }

  const currentPlayer = game.players[round.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    throw new Error('Not your turn!');
  }

  if (round.hasDiscardedThisTurn) {
    throw new Error('Already discarded this turn.');
  }

  // Find in hand
  const foundIndex = currentPlayer.hand.findIndex(
    c => c.rank === cardToDiscard.rank && c.suit === cardToDiscard.suit && c.joker === cardToDiscard.joker
  );
  if (foundIndex === -1) {
    throw new Error('Card not in hand');
  }

  const handCard = currentPlayer.hand.splice(foundIndex, 1)[0];
  const previousTopCard = round.discardPile[round.discardPile.length - 1] || null;

  round.discardPile.push(handCard);
  round.hasDiscardedThisTurn = true;
  round.cardsDiscardedThisTurn = 1;

  // Check matching rank rule
  if (previousTopCard && (handCard.rank === previousTopCard.rank || (handCard.joker && previousTopCard.joker))) {
    round.needsToDraw = false;
  } else {
    round.needsToDraw = true;
    round.turnStartedAt = Date.now();
  }
};

export const discardMultipleCards = (game: LocalGame, playerId: string, cardsToDiscard: Card[]): void => {
  if (!cardsToDiscard || cardsToDiscard.length === 0) {
    throw new Error('No cards provided to discard.');
  }

  const round = game.currentRound;
  if (!round || round.roundEnded) {
    throw new Error('Round is not active');
  }

  const currentPlayer = game.players[round.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    throw new Error('Not your turn!');
  }

  if (round.hasDiscardedThisTurn) {
    throw new Error('Already discarded this turn.');
  }

  const targetRank = cardsToDiscard[0].rank;
  for (const c of cardsToDiscard) {
    if (c.rank !== targetRank) {
      throw new Error('All discarded cards must share the same rank.');
    }
  }

  // Remove cards from hand
  const resolvedCards: Card[] = [];
  const handCopy = [...currentPlayer.hand];
  for (const cd of cardsToDiscard) {
    const foundIndex = handCopy.findIndex(
      c => c.rank === cd.rank && c.suit === cd.suit && c.joker === cd.joker
    );
    if (foundIndex === -1) {
      throw new Error('Card not in hand');
    }
    resolvedCards.push(handCopy.splice(foundIndex, 1)[0]);
  }

  currentPlayer.hand = handCopy;
  const previousTopCard = round.discardPile[round.discardPile.length - 1] || null;

  for (const resolved of resolvedCards) {
    round.discardPile.push(resolved);
  }
  round.hasDiscardedThisTurn = true;
  round.cardsDiscardedThisTurn = resolvedCards.length;

  if (previousTopCard && (previousTopCard.rank === targetRank || (previousTopCard.joker && cardsToDiscard[0].joker))) {
    round.needsToDraw = false;
  } else {
    round.needsToDraw = true;
    round.turnStartedAt = Date.now();
  }
};

export const declareTick = (game: LocalGame, playerId: string): void => {
  const round = game.currentRound;
  if (!round || round.roundEnded) {
    throw new Error('Round is not active');
  }

  const currentPlayer = game.players[round.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    throw new Error('Not your turn!');
  }

  if (round.hasDiscardedThisTurn) {
    throw new Error('Cannot declare Tick after discarding/drawing cards');
  }

  currentPlayer.declaredTick = true;
  round.tickPlayerId = playerId;
  round.endCondition = 'TICK';
  endRound(game, round);
};

export const endTurn = (game: LocalGame, playerId: string): void => {
  const round = game.currentRound;
  if (!round || round.roundEnded) {
    throw new Error('Round is not active');
  }

  const currentPlayer = game.players[round.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    throw new Error('Not your turn!');
  }

  if (!round.hasDiscardedThisTurn) {
    throw new Error('Must discard a card before ending turn');
  }

  // Handle hand empty
  if (currentPlayer.hand.length === 0) {
    if (!round.needsToDraw) {
      // Player matched and has 0 cards
      const activeCount = game.players.filter(p => p.hand.length > 0).length;
      if (activeCount < 2) {
        round.endCondition = 'OUT_OF_CARDS';
        endRound(game, round);
        return;
      }
    } else {
      throw new Error('You have no cards! You must draw before ending your turn.');
    }
  }

  if (round.needsToDraw) {
    throw new Error('Must draw a card before ending turn');
  }

  round.hasDiscardedThisTurn = false;
  round.needsToDraw = false;
  round.firstTurnCompleted = true;

  // Advance turn to next player with cards
  let nextIndex = (round.currentPlayerIndex + 1) % game.players.length;
  let attempts = 0;
  while (game.players[nextIndex].hand.length === 0 && attempts < game.players.length) {
    nextIndex = (nextIndex + 1) % game.players.length;
    attempts++;
  }

  round.currentPlayerIndex = nextIndex;
  round.turnStartedAt = Date.now();
};

const endRound = (game: LocalGame, round: LocalRound): void => {
  round.roundEnded = true;
  calculateRoundScores(game, round);
  game.rounds.push(round);

  if (game.currentRoundNumber >= game.maxRounds) {
    game.status = 'ROUND_OVER';
  } else {
    game.status = 'ROUND_OVER';
  }
};

const getHandValue = (player: LocalPlayer): number => {
  return player.hand.reduce((sum, c) => sum + (c.value || 0), 0);
};

const calculateRoundScores = (game: LocalGame, round: LocalRound): void => {
  const isTick = round.tickPlayerId !== null && round.endCondition === 'TICK';

  const activePlayers = game.players.filter(p => p.hand.length > 0);

  // Set scores for safe players (who already ran out of cards during the play)
  for (const p of game.players) {
    if (p.hand.length === 0) {
      p.roundScore = 0;
      p.totalScore += 0;
      round.playerScores[p.id] = 0;
    }
  }

  if (activePlayers.length === 0) return;

  if (isTick) {
    const tickPlayerId = round.tickPlayerId!;
    const tickPlayer = game.players.find(p => p.id === tickPlayerId)!;

    const minHandValue = Math.min(...activePlayers.map(p => getHandValue(p)));

    // Correct Tick: declarer gets 0, others get hand value
    // (unless they tied the declarer, in which case they get 0 too)
    const tickPlayerHandValue = getHandValue(tickPlayer);
    const isCorrectTick = activePlayers.every(p => p.id === tickPlayerId || getHandValue(p) >= tickPlayerHandValue);

    if (isCorrectTick) {
      for (const p of activePlayers) {
        if (p.id === tickPlayerId || getHandValue(p) === tickPlayerHandValue) {
          p.roundScore = 0;
        } else {
          p.roundScore = getHandValue(p);
        }
        p.totalScore += p.roundScore;
        round.playerScores[p.id] = p.roundScore;
      }
    } else {
      // Wrong Tick: declarer gets 80, player with lowest hand gets 0, others get their score
      for (const p of activePlayers) {
        if (p.id === tickPlayerId) {
          p.roundScore = 80;
        } else if (getHandValue(p) === minHandValue) {
          p.roundScore = 0;
        } else {
          p.roundScore = getHandValue(p);
        }
        p.totalScore += p.roundScore;
        round.playerScores[p.id] = p.roundScore;
      }
    }
  } else {
    // OUT_OF_CARDS or DECK_EXHAUSTED
    const minHandValue = Math.min(...game.players.map(p => p.hand.length === 0 ? 0 : getHandValue(p)));

    for (const p of activePlayers) {
      if (getHandValue(p) === minHandValue) {
        p.roundScore = 0;
      } else {
        p.roundScore = getHandValue(p);
      }
      p.totalScore += p.roundScore;
      round.playerScores[p.id] = p.roundScore;
    }
  }
};

export const endGame = (game: LocalGame): void => {
  game.status = 'GAME_OVER';

  let minTotalScore = Infinity;
  let winner: LocalPlayer | null = null;
  for (const p of game.players) {
    if (p.totalScore < minTotalScore) {
      minTotalScore = p.totalScore;
      winner = p;
    }
  }

  let drawCount = 0;
  for (const p of game.players) {
    if (p.totalScore === minTotalScore) {
      drawCount++;
    }
  }

  if (drawCount > 1) {
    game.winnerId = 'DRAW';
  } else if (winner) {
    game.winnerId = winner.id;
  }
};


// ── Bot AI Strategies ────────────────────────────────────────────────────────

export const botShouldDeclareTick = (aiPlayer: LocalPlayer, game: LocalGame): boolean => {
  const round = game.currentRound;
  if (!round) return false;

  const myHandValue = getHandValue(aiPlayer);
  let maxHandValueToTick = 10;

  for (const p of game.players) {
    if (p.id !== aiPlayer.id && p.hand) {
      const opponentCardCount = p.hand.length;
      if (opponentCardCount === 1) {
        maxHandValueToTick = Math.min(maxHandValueToTick, 3);
      } else if (opponentCardCount === 2) {
        maxHandValueToTick = Math.min(maxHandValueToTick, 6);
      } else if (opponentCardCount === 3) {
        maxHandValueToTick = Math.min(maxHandValueToTick, 8);
      }
    }
  }

  // 20% bluff chance
  if (myHandValue <= maxHandValueToTick + 2 && Math.random() < 0.2) {
    return true;
  }

  return myHandValue <= maxHandValueToTick;
};

export const botChooseCardsToDiscard = (aiPlayer: LocalPlayer, round: LocalRound): Card[] => {
  const hand = aiPlayer.hand;
  if (!hand || hand.length === 0) return [];

  const topDiscard = round.discardPile[round.discardPile.length - 1] || null;

  // 1. Match top discard to avoid drawing
  if (topDiscard) {
    const matching = hand.filter(c => c.rank === topDiscard.rank);
    if (matching.length > 0) {
      return matching; // Multi-discard all matching
    }
  }

  // 2. Discard pair/set of highest rank (excluding jokers)
  const nonJokers = hand.filter(c => !c.joker);
  const byRank: Record<string, Card[]> = {};
  for (const c of nonJokers) {
    if (c.rank) {
      if (!byRank[c.rank]) byRank[c.rank] = [];
      byRank[c.rank].push(c);
    }
  }

  let bestGroup: Card[] | null = null;
  let bestGroupValue = -1;
  for (const rank of Object.keys(byRank)) {
    const group = byRank[rank];
    const groupValue = group.reduce((sum, c) => sum + (c.value || 0), 0);
    if (group.length >= 2 && groupValue > bestGroupValue) {
      bestGroupValue = groupValue;
      bestGroup = group;
    }
  }

  if (bestGroup) {
    return bestGroup;
  }

  // 3. Discard highest-value card
  const sortedNonJokers = [...nonJokers].sort((a, b) => (b.value || 0) - (a.value || 0));
  if (sortedNonJokers.length > 0) {
    return [sortedNonJokers[0]];
  }

  return [hand[0]];
};

export const botShouldDrawFromDiscard = (aiPlayer: LocalPlayer, round: LocalRound): boolean => {
  if (round.discardPile.length === 0) return false;

  let k = round.cardsDiscardedThisTurn;
  if (k <= 0) {
    k = 5 - aiPlayer.hand.length;
  }
  const drawableIndex = round.discardPile.length - k - 1;
  if (drawableIndex < 0 || drawableIndex >= round.discardPile.length) {
    return false;
  }

  const drawableCard = round.discardPile[drawableIndex];

  if (drawableCard.joker) return true;

  const makesPair = aiPlayer.hand.some(c => c.rank === drawableCard.rank);
  if (makesPair) {
    return Math.random() < 0.9;
  }

  if ((drawableCard.value || 0) <= 7) {
    return Math.random() < 0.9;
  }

  return false;
};
