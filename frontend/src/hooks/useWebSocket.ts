import { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import type { Card } from '../utils/gameHelpers';

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

export interface SanitizedGame {
  gameId: string;
  players: SanitizedPlayer[];
  currentRoundNumber: number;
  maxRounds: number;
  currentRound: SanitizedRound | null;
  rounds: SanitizedRound[];
  status: 'WAITING_FOR_PLAYERS' | 'IN_PROGRESS' | 'ROUND_OVER' | 'GAME_OVER';
  winnerId: string | null;
  isMultiplayer: boolean;
}


const getUrls = () => {
  // If VITE_API_URL and VITE_WS_URL are explicitly configured in env, use them
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_WS_URL) {
    return {
      apiBase: import.meta.env.VITE_API_URL,
      wsUrl: import.meta.env.VITE_WS_URL
    };
  }

  // Check if we are running locally (localhost, 127.0.0.1, or local subnet IPs)
  const hostname = window.location.hostname;
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

  // Fallback to production Render URLs
  return {
    apiBase: "https://fivecards.onrender.com",
    wsUrl: "wss://fivecards.onrender.com/ws-game"
  };
};

const { apiBase: API_BASE, wsUrl: WS_URL } = getUrls();

export const useWebSocket = () => {
  const [gameState, setGameState] = useState<SanitizedGame | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [latestReaction, setLatestReaction] = useState<{ playerId: string; emoji: string; id: string } | null>(null);

  const stompClientRef = useRef<Client | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const playerIdRef = useRef<string | null>(null);

  const disconnect = useCallback(() => {
    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
      stompClientRef.current = null;
    }
    setConnected(false);
    setGameState(null);
    setLatestReaction(null);
  }, []);

  const connect = useCallback((gameId: string, playerId: string) => {
    disconnect(); // Disconnect existing first

    gameIdRef.current = gameId;
    playerIdRef.current = playerId;
    setError(null);

    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setConnected(true);

        // 1. Subscribe to public state channel
        client.subscribe(`/topic/game/${gameId}/state`, (message) => {
          const updatedGame = JSON.parse(message.body) as SanitizedGame;
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

        // 2. Subscribe to private hand channel
        client.subscribe(`/topic/game/${gameId}/player/${playerId}`, (message) => {
          const payload = JSON.parse(message.body);
          if (payload.error) {
            setError(payload.error);
            // Clear error after 4 seconds
            setTimeout(() => setError(null), 4000);
          } else {
            // This is a private state update (contains own cards)
            const updatedGame = payload as SanitizedGame;
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

        // 3. Trigger a REJOIN action to sync client state in case of page reload/reconnection
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

  // Specific game controls
  const drawCard = useCallback((fromDiscard: boolean) => {
    sendAction('DRAW', { fromDiscard });
  }, [sendAction]);

  const discardCard = useCallback((card: Card) => {
    sendAction('DISCARD', { card });
  }, [sendAction]);

  const discardMultipleCards = useCallback((cards: Card[]) => {
    sendAction('DISCARD_MULTI', { cards });
  }, [sendAction]);

  const declareTick = useCallback(() => {
    sendAction('TICK');
  }, [sendAction]);

  const endTurn = useCallback(() => {
    sendAction('END_TURN');
  }, [sendAction]);

  const markReady = useCallback(() => {
    sendAction('READY');
  }, [sendAction]);

  const startNewGame = useCallback(() => {
    sendAction('START');
  }, [sendAction]);

  const endGame = useCallback(() => {
    sendAction('END_GAME');
  }, [sendAction]);

  const sendReaction = useCallback((emoji: string) => {
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
  }, [connected]);

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
    endGame,
    latestReaction,
    sendReaction,
    apiBase: API_BASE,
  };
};
