import { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import type { Card } from '../utils/gameHelpers';
import {
  createLocalGame,
  startNextRound as startNextRoundLocal,
  drawCard as drawCardLocal,
  discardCard as discardCardLocal,
  discardMultipleCards as discardMultipleCardsLocal,
  declareTick as declareTickLocal,
  endTurn as endTurnLocal,
  endGame as endGameLocal,
  botShouldDeclareTick,
  botChooseCardsToDiscard,
  botShouldDrawFromDiscard
} from '../utils/localGame';
import type { LocalGame } from '../utils/localGame';

export interface SanitizedPlayer {
  id: string;
  name: string;
  isAi: boolean;
  aiLevel: string | null;
  hand: Card[];
  cardCount: number;
  roundScore: number;
  totalScore: number;
  ready: boolean;
  declaredTick: boolean;
  avatar: string | null;
  avatarPic: string | null;
}

export interface SanitizedRound {
  roundNumber: number;
  jokerCard: Card;
  jokerRank: string;
  drawPileSize: number;
  discardPile: Card[];
  currentPlayerIndex: number;
  roundEnded: boolean;
  tickPlayerId: string | null;
  endCondition: string | null;
  needsToDraw: boolean;
  hasDiscardedThisTurn: boolean;
  cardsDiscardedThisTurn: number;
  turnStartedAt: number | null;
  firstTurnCompleted: boolean;
  playerScores: Record<string, number>;
}

export interface Spectator {
  id: string;
  name: string;
  joinedAt: number;
}

export interface SanitizedGame {
  gameId: string;
  players: SanitizedPlayer[];
  currentRoundNumber: number;
  maxRounds: number;
  currentRound: SanitizedRound | null;
  rounds: SanitizedRound[];
  status: 'WAITING_FOR_PLAYERS' | 'IN_PROGRESS' | 'ROUND_OVER' | 'GAME_OVER';
  winnerId: string | null;
  hostId: string;
  isMultiplayer: boolean;
  spectators?: Spectator[];
}


const getUrls = () => {
  const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('customBackendUrl') : null;
  if (savedUrl && savedUrl.trim()) {
    let cleanUrl = savedUrl.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    let wsUrl = '';
    if (cleanUrl.startsWith('https://')) {
      wsUrl = cleanUrl.replace('https://', 'wss://') + '/ws-game';
    } else if (cleanUrl.startsWith('http://')) {
      wsUrl = cleanUrl.replace('http://', 'ws://') + '/ws-game';
    } else {
      wsUrl = `ws://${cleanUrl}/ws-game`;
      cleanUrl = `http://${cleanUrl}`;
    }
    return {
      apiBase: cleanUrl,
      wsUrl: wsUrl
    };
  }

  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_WS_URL) {
    return {
      apiBase: import.meta.env.VITE_API_URL,
      wsUrl: import.meta.env.VITE_WS_URL
    };
  }

  const hostname = window.location.hostname;
  const isNative = !!(window as any).Capacitor;

  if (isNative) {
    return {
      apiBase: "https://fivecards.onrender.com",
      wsUrl: "wss://fivecards.onrender.com/ws-game"
    };
  }

  const isLocal = hostname === 'localhost' || 
                  hostname === '127.0.0.1' || 
                  hostname.startsWith('192.168.') || 
                  hostname.startsWith('10.') || 
                  hostname.startsWith('172.');

  if (isLocal) {
    return {
      apiBase: `http://${hostname}:8080`,
      wsUrl: `ws://${hostname}:8080/ws-game`
    };
  }

  return {
    apiBase: "https://fivecards.onrender.com",
    wsUrl: "wss://fivecards.onrender.com/ws-game"
  };
};

export const { apiBase: API_BASE, wsUrl: WS_URL } = getUrls();

// Helper to sanitize local state for human view (hides opponent hands)
const sanitizeLocalGame = (localGame: LocalGame, playerId: string): SanitizedGame => {
  return {
    gameId: localGame.gameId,
    status: localGame.status,
    currentRoundNumber: localGame.currentRoundNumber,
    maxRounds: localGame.maxRounds,
    winnerId: localGame.winnerId,
    hostId: localGame.hostId,
    isMultiplayer: localGame.isMultiplayer,
    spectators: [],
    players: localGame.players.map(p => {
      const revealCards = localGame.status === 'ROUND_OVER' || localGame.status === 'GAME_OVER' || p.id === playerId;
      return {
        id: p.id,
        name: p.name,
        isAi: p.isAi,
        aiLevel: p.aiLevel,
        hand: revealCards ? p.hand : [],
        cardCount: p.hand.length,
        roundScore: p.roundScore,
        totalScore: p.totalScore,
        ready: p.ready,
        declaredTick: p.declaredTick,
        avatar: p.avatar,
        avatarPic: p.avatarPic
      };
    }),
    currentRound: localGame.currentRound ? {
      roundNumber: localGame.currentRound.roundNumber,
      jokerCard: localGame.currentRound.jokerCard,
      jokerRank: localGame.currentRound.jokerRank,
      drawPileSize: localGame.currentRound.drawPile.length,
      discardPile: localGame.currentRound.discardPile,
      currentPlayerIndex: localGame.currentRound.currentPlayerIndex,
      roundEnded: localGame.currentRound.roundEnded,
      tickPlayerId: localGame.currentRound.tickPlayerId,
      endCondition: localGame.currentRound.endCondition,
      needsToDraw: localGame.currentRound.needsToDraw,
      hasDiscardedThisTurn: localGame.currentRound.hasDiscardedThisTurn,
      cardsDiscardedThisTurn: localGame.currentRound.cardsDiscardedThisTurn,
      turnStartedAt: localGame.currentRound.turnStartedAt,
      firstTurnCompleted: localGame.currentRound.firstTurnCompleted,
      playerScores: localGame.currentRound.playerScores
    } : null,
    rounds: localGame.rounds.map(r => ({
      roundNumber: r.roundNumber,
      jokerCard: r.jokerCard,
      jokerRank: r.jokerRank,
      drawPileSize: 0,
      discardPile: [],
      currentPlayerIndex: r.currentPlayerIndex,
      roundEnded: r.roundEnded,
      tickPlayerId: r.tickPlayerId,
      endCondition: r.endCondition,
      needsToDraw: r.needsToDraw,
      hasDiscardedThisTurn: r.hasDiscardedThisTurn,
      cardsDiscardedThisTurn: r.cardsDiscardedThisTurn,
      turnStartedAt: r.turnStartedAt,
      firstTurnCompleted: r.firstTurnCompleted,
      playerScores: r.playerScores
    }))
  };
};

export const useWebSocket = () => {
  const [gameState, setGameState] = useState<SanitizedGame | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [latestReaction, setLatestReaction] = useState<{ playerId: string; emoji: string; id: string } | null>(null);
  const [isSpectatorState, setIsSpectatorState] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const stompClientRef = useRef<Client | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const localGameRef = useRef<LocalGame | null>(null);
  const aiTurnStartedRef = useRef<string | null>(null);

  const disconnect = useCallback(() => {
    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
      stompClientRef.current = null;
    }
    setConnected(false);
    setGameState(null);
    setLatestReaction(null);
    setIsSpectatorState(false);
    setIsOffline(false);
    localGameRef.current = null;
    aiTurnStartedRef.current = null;
  }, []);

  const saveAndBroadcastLocalGame = (game: LocalGame) => {
    localGameRef.current = game;
    localStorage.setItem('localGameState', JSON.stringify(game));
    setGameState(sanitizeLocalGame(game, playerIdRef.current!));
  };

  const connect = useCallback((gameId: string, playerId: string, isSpectator = false, isOfflineOption = false) => {
    disconnect(); // Disconnect existing first

    gameIdRef.current = gameId;
    playerIdRef.current = playerId;
    setIsSpectatorState(isSpectator);
    setIsOffline(isOfflineOption);
    setError(null);

    if (isOfflineOption) {
      setConnected(true);
      const savedLocalGame = localStorage.getItem('localGameState');
      if (savedLocalGame) {
        try {
          const game = JSON.parse(savedLocalGame);
          localGameRef.current = game;
          setGameState(sanitizeLocalGame(game, playerId));
        } catch (_) {
          localStorage.removeItem('localGameState');
          // Re-create if parse fails
          const maxRounds = parseInt(localStorage.getItem('offline_maxRounds') || '10');
          const aiCount = parseInt(localStorage.getItem('offline_aiCount') || '3');
          const playerName = localStorage.getItem('offline_playerName') || 'Player';
          const game = createLocalGame(maxRounds, aiCount, playerName, playerId);
          startNextRoundLocal(game);
          saveAndBroadcastLocalGame(game);
        }
      } else {
        const maxRounds = parseInt(localStorage.getItem('offline_maxRounds') || '10');
        const aiCount = parseInt(localStorage.getItem('offline_aiCount') || '3');
        const playerName = localStorage.getItem('offline_playerName') || 'Player';
        const game = createLocalGame(maxRounds, aiCount, playerName, playerId);
        startNextRoundLocal(game);
        saveAndBroadcastLocalGame(game);
      }
      return;
    }

    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setConnected(true);

        // 1. Subscribe to public state channel
        client.subscribe(`/topic/game/${gameId}/state`, (message) => {
          const rawGame = JSON.parse(message.body);
          const updatedGame: SanitizedGame = {
            ...rawGame,
            isMultiplayer: rawGame.isMultiplayer !== undefined ? rawGame.isMultiplayer : !!rawGame.multiplayer
          };
          setGameState(prev => {
            if (!prev) return updatedGame;
            const updatedPlayers = updatedGame.players.map(p => {
              if (p.id === playerId) {
                const prevMe = prev.players.find(pm => pm.id === playerId);
                const shouldMerge = (!p.hand || p.hand.length === 0) &&
                                    p.cardCount > 0 &&
                                    prevMe?.hand &&
                                    prevMe.hand.length > 0 &&
                                    prev.currentRoundNumber === updatedGame.currentRoundNumber &&
                                    updatedGame.status === 'IN_PROGRESS';
                if (shouldMerge) {
                  return { ...p, hand: prevMe.hand };
                }
              }
              return p;
            });
            return { ...updatedGame, players: updatedPlayers };
          });
        });

        // 2. Subscribe to private hand/spectator channel
        const privateChannel = isSpectator
          ? `/topic/game/${gameId}/spectator/${playerId}`
          : `/topic/game/${gameId}/player/${playerId}`;

        client.subscribe(privateChannel, (message) => {
          const payload = JSON.parse(message.body);
          if (payload.error) {
            setError(payload.error);
            setTimeout(() => setError(null), 4000);
          } else {
            const rawGame = payload;
            const updatedGame: SanitizedGame = {
              ...rawGame,
              isMultiplayer: rawGame.isMultiplayer !== undefined ? rawGame.isMultiplayer : !!rawGame.multiplayer
            };
            setGameState(prev => {
              if (!prev) return updatedGame;
              const updatedPlayers = updatedGame.players.map(p => {
                if (isSpectator) return p;

                if (p.id === playerId) {
                  const prevMe = prev.players.find(pm => pm.id === playerId);
                  const shouldMerge = (!p.hand || p.hand.length === 0) &&
                                      p.cardCount > 0 &&
                                      prevMe?.hand &&
                                      prevMe.hand.length > 0 &&
                                      prev.currentRoundNumber === updatedGame.currentRoundNumber &&
                                      updatedGame.status === 'IN_PROGRESS';
                  if (shouldMerge) {
                    return { ...p, hand: prevMe.hand };
                  }
                }
                return p;
              });
              return { ...updatedGame, players: updatedPlayers };
            });
          }
        });

        // 2.5 Subscribe to reactions topic
        client.subscribe(`/topic/game/${gameId}/reactions`, (message) => {
          const payload = JSON.parse(message.body);
          setLatestReaction({
            playerId: payload.playerId,
            emoji: payload.emoji,
            id: Math.random().toString(36).substring(2, 9),
          });
        });

        // 3. Trigger a REJOIN action
        client.publish({
          destination: `/app/game/${gameId}/action`,
          body: JSON.stringify({
            type: 'REJOIN',
            playerId: playerId,
          }),
        });
      },
      onDisconnect: () => {
        setConnected(false);
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
        setError('WebSocket Connection Error');
      },
    });

    stompClientRef.current = client;
    client.activate();
  }, [disconnect]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Reactive Offline AI loop
  useEffect(() => {
    if (!isOffline || !gameState || gameState.status !== 'IN_PROGRESS' || !gameState.currentRound) {
      return;
    }

    const round = gameState.currentRound;
    const activePlayer = gameState.players[round.currentPlayerIndex];
    if (!activePlayer || !activePlayer.isAi) {
      return;
    }

    const gameId = gameState.gameId;

    const turnKey = `${gameId}_${round.roundNumber}_${round.currentPlayerIndex}_${round.hasDiscardedThisTurn ? 'draw' : 'discard'}`;
    if (aiTurnStartedRef.current === turnKey) {
      return;
    }
    aiTurnStartedRef.current = turnKey;

    const executeBotTurn = async () => {
      // Natural thinking delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const game = localGameRef.current;
      if (!game || !game.currentRound || game.currentRound.currentPlayerIndex !== round.currentPlayerIndex || game.status !== 'IN_PROGRESS') return;

      const botPlayer = game.players[round.currentPlayerIndex];
      const botRound = game.currentRound;

      // 1. Tick check
      if (!botRound.hasDiscardedThisTurn) {
        const wantsTick = botShouldDeclareTick(botPlayer, game);
        if (wantsTick) {
          declareTickLocal(game, botPlayer.id);
          saveAndBroadcastLocalGame(game);
          return;
        }

        // 2. Discard
        const cardsToDiscard = botChooseCardsToDiscard(botPlayer, botRound);
        discardMultipleCardsLocal(game, botPlayer.id, cardsToDiscard);
        saveAndBroadcastLocalGame(game);
        
        // Check if matched
        const updatedGame = localGameRef.current;
        if (updatedGame && updatedGame.currentRound && !updatedGame.currentRound.needsToDraw) {
          await new Promise(resolve => setTimeout(resolve, 800));
          endTurnLocal(updatedGame, botPlayer.id);
          saveAndBroadcastLocalGame(updatedGame);
        }
        return;
      }

      // 3. Draw
      if (botRound.hasDiscardedThisTurn && botRound.needsToDraw) {
        const drawFromDiscard = botShouldDrawFromDiscard(botPlayer, botRound);
        try {
          drawCardLocal(game, botPlayer.id, drawFromDiscard);
          saveAndBroadcastLocalGame(game);
          
          // 4. End Turn
          await new Promise(resolve => setTimeout(resolve, 800));
          endTurnLocal(game, botPlayer.id);
          saveAndBroadcastLocalGame(game);
        } catch (_) {
          // Empty draw pile ends round, ignore draw error
        }
        return;
      }
    };

    executeBotTurn();
  }, [gameState, isOffline]);

  // Publish action helper
  const sendAction = useCallback((type: string, payload: any = {}) => {
    if (!stompClientRef.current || !connected) {
      console.warn('STOMP client not connected');
      return;
    }

    stompClientRef.current.publish({
      destination: `/app/game/${gameIdRef.current}/action`,
      body: JSON.stringify({
        type,
        playerId: playerIdRef.current,
        ...payload,
      }),
    });
  }, [connected]);

  // Game control API mapping (switches between online WS and offline local engine)
  const drawCard = useCallback((fromDiscard: boolean) => {
    if (isOffline) {
      const game = localGameRef.current;
      if (game) {
        try {
          drawCardLocal(game, playerIdRef.current!, fromDiscard);
          saveAndBroadcastLocalGame(game);
        } catch (e: any) {
          setError(e.message);
          setTimeout(() => setError(null), 4000);
        }
      }
      return;
    }
    sendAction('DRAW', { fromDiscard });
  }, [sendAction, isOffline]);

  const discardCard = useCallback((card: Card) => {
    if (isOffline) {
      const game = localGameRef.current;
      if (game) {
        try {
          discardCardLocal(game, playerIdRef.current!, card);
          saveAndBroadcastLocalGame(game);
        } catch (e: any) {
          setError(e.message);
          setTimeout(() => setError(null), 4000);
        }
      }
      return;
    }
    sendAction('DISCARD', { card });
  }, [sendAction, isOffline]);

  const discardMultipleCards = useCallback((cards: Card[]) => {
    if (isOffline) {
      const game = localGameRef.current;
      if (game) {
        try {
          discardMultipleCardsLocal(game, playerIdRef.current!, cards);
          saveAndBroadcastLocalGame(game);
        } catch (e: any) {
          setError(e.message);
          setTimeout(() => setError(null), 4000);
        }
      }
      return;
    }
    sendAction('DISCARD_MULTI', { cards });
  }, [sendAction, isOffline]);

  const declareTick = useCallback(() => {
    if (isOffline) {
      const game = localGameRef.current;
      if (game) {
        try {
          declareTickLocal(game, playerIdRef.current!);
          saveAndBroadcastLocalGame(game);
        } catch (e: any) {
          setError(e.message);
          setTimeout(() => setError(null), 4000);
        }
      }
      return;
    }
    sendAction('TICK');
  }, [sendAction, isOffline]);

  const endTurn = useCallback(() => {
    if (isOffline) {
      const game = localGameRef.current;
      if (game) {
        try {
          endTurnLocal(game, playerIdRef.current!);
          saveAndBroadcastLocalGame(game);
        } catch (e: any) {
          setError(e.message);
          setTimeout(() => setError(null), 4000);
        }
      }
      return;
    }
    sendAction('END_TURN');
  }, [sendAction, isOffline]);

  const markReady = useCallback(() => {
    if (isOffline) {
      const game = localGameRef.current;
      if (game) {
        if (game.status === 'ROUND_OVER' || game.status === 'WAITING_FOR_PLAYERS') {
          startNextRoundLocal(game);
          saveAndBroadcastLocalGame(game);
        }
      }
      return;
    }
    sendAction('READY');
  }, [sendAction, isOffline]);

  const startNewGame = useCallback(() => {
    localStorage.removeItem('processedGameId');
    localStorage.removeItem('lastGameResults');
    if (isOffline) {
      const game = localGameRef.current;
      if (game) {
        game.currentRoundNumber = 0;
        game.winnerId = null;
        game.rounds = [];
        for (const p of game.players) {
          p.totalScore = 0;
          p.roundScore = 0;
        }
        startNextRoundLocal(game);
        saveAndBroadcastLocalGame(game);
      }
      return;
    }
    sendAction('START');
  }, [sendAction, isOffline]);

  const startNextRound = useCallback(() => {
    if (isOffline) {
      const game = localGameRef.current;
      if (game) {
        startNextRoundLocal(game);
        saveAndBroadcastLocalGame(game);
      }
      return;
    }
    sendAction('START_NEXT_ROUND');
  }, [sendAction, isOffline]);

  const endGame = useCallback(() => {
    if (isOffline) {
      const game = localGameRef.current;
      if (game) {
        endGameLocal(game);
        saveAndBroadcastLocalGame(game);
      }
      return;
    }
    sendAction('END_GAME');
  }, [sendAction, isOffline]);

  const leaveGame = useCallback(() => {
    if (isOffline) {
      localStorage.removeItem('localGameState');
      disconnect();
      return;
    }
    sendAction('LEAVE');
  }, [isOffline, disconnect, sendAction]);

  const sendReaction = useCallback((emoji: string) => {
    if (isOffline) {
      setLatestReaction({
        playerId: playerIdRef.current!,
        emoji,
        id: Math.random().toString(36).substring(2, 9),
      });
      return;
    }
    if (!stompClientRef.current || !connected) {
      console.warn('STOMP client not connected');
      return;
    }
    stompClientRef.current.publish({
      destination: `/app/game/${gameIdRef.current}/reaction`,
      body: JSON.stringify({
        playerId: playerIdRef.current,
        emoji,
      }),
    });
  }, [connected, isOffline]);

  return {
    gameState,
    connected,
    error,
    connect,
    disconnect,
    drawCard,
    discardCard,
    discardMultipleCards,
    declareTick,
    endTurn,
    markReady,
    startNewGame,
    startNextRound,
    endGame,
    leaveGame,
    latestReaction,
    sendReaction,
    apiBase: API_BASE,
    isSpectator: isSpectatorState,
    isOffline,
    stompClientRef,
    playerIdRef,
    gameIdRef,
  };
};
