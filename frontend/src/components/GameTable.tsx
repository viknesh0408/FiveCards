import React, { useState, useEffect, useRef } from 'react';
import type { SanitizedGame } from '../hooks/useWebSocket';
import type { Card as CardType } from '../utils/gameHelpers';
import { Card } from './Card';
import { Scoreboard } from './Scoreboard';

interface GameTableProps {
  gameState: SanitizedGame;
  currentPlayerId: string;
  onDraw: (fromDiscard: boolean) => void;
  onDiscard: (card: CardType) => void;
  onDiscardMulti: (cards: CardType[]) => void;
  onTick: () => void;
  onEndTurn: () => void;
  onLeave: () => void;
  onReady: () => void;
  latestReaction: { playerId: string; emoji: string; id: string } | null;
  onSendReaction: (emoji: string) => void;
}

export const GameTable: React.FC<GameTableProps> = ({
  gameState,
  currentPlayerId,
  onDraw,
  onDiscard,
  onDiscardMulti,
  onTick,
  onEndTurn,
  onLeave,
  onReady,
  latestReaction,
  onSendReaction,
}) => {
  const [displayedGameState, setDisplayedGameState] = useState<SanitizedGame>(gameState);
  const { gameId, players, currentRound, status } = displayedGameState;
  const bufferedStateRef = useRef<SanitizedGame>(gameState);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isPickingFromPile, setIsPickingFromPile] = useState<boolean>(false);
  const [animateHand, setAnimateHand] = useState<boolean>(true);
  const drawTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showScoreboard, setShowScoreboard] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showDeclareConfirm, setShowDeclareConfirm] = useState<boolean>(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false);
  const [activeReactions, setActiveReactions] = useState<Record<string, { emoji: string; timestamp: number }>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [tutorialActive, setTutorialActive] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<number>(0);

  const selectedBack = localStorage.getItem('selected_card_back') || 'classic';
  const selectedAvatar = localStorage.getItem('selected_avatar') || 'none';

  // Trigger tutorial automatically when the match starts for the first time
  useEffect(() => {
    if (status === 'IN_PROGRESS') {
      const completed = localStorage.getItem('tick_game_tutorial_completed');
      if (!completed) {
        setTutorialActive(true);
        setTutorialStep(0);
      }
    } else {
      setTutorialActive(false);
    }
  }, [status]);

  const tutorialSteps = [
    {
      title: "Welcome to 5 Cards! 🂠",
      text: "The objective of 5 Cards is to minimize the total point value of the cards in your hand. Hand values: Jokers = 0 pts · Aces = 1 pt · Cards 2-10 = face value · J/Q/K = 11/12/13 pts.",
      targetClass: "",
      position: "center" as const
    },
    {
      title: "Joker Rank Info 🃏",
      text: "A random card is drawn at the start of each round to determine the Joker Rank. All cards of this rank (e.g., all 4s) plus printed Jokers are worth 0 points!",
      targetClass: "joker-display",
      position: "bottom-right" as const
    },
    {
      title: "The Draw Deck 🂠",
      text: "On your turn, you draw one card from this face-down pile after you discard. Tap it to draw.",
      targetClass: "tutorial-step-draw",
      position: "bottom-left" as const
    },
    {
      title: "The Discard Pile 🔄",
      text: "Discarded cards go here. If you discard a card that matches the rank of the top card on this pile, you skip drawing—instantly shrinking your hand size!",
      targetClass: "tutorial-step-discard",
      position: "bottom-left" as const
    },
    {
      title: "Your Hand & Score 🂱",
      text: "These are your cards. Drag to reorder. The sum value of your hand is shown in the gold badge on the top right.",
      targetClass: "user-hand-cards",
      position: "top-right" as const
    },
    {
      title: "Declare '5 Cards' 🔔",
      text: "When your total hand score is 5 points or less, you can declare '5 Cards' (Tick) at the start of your turn to claim victory. Be careful: if someone has a lower score, you'll receive an 80-point penalty!",
      targetClass: "hand-controls",
      position: "top-left" as const
    }
  ];

  const handleCompleteTutorial = () => {
    localStorage.setItem('tick_game_tutorial_completed', 'true');
    setTutorialActive(false);
  };

  // Listen for latest reaction
  useEffect(() => {
    if (latestReaction) {
      setActiveReactions(prev => ({
        ...prev,
        [latestReaction.playerId]: {
          emoji: latestReaction.emoji,
          timestamp: Date.now()
        }
      }));
    }
  }, [latestReaction]);

  // Clean up expired reactions (older than 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveReactions(prev => {
        const updated = { ...prev };
        let changed = false;
        for (const [pId, data] of Object.entries(updated)) {
          if (now - data.timestamp > 3000) {
            delete updated[pId];
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getInitials = (name: string): string => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };


  if (!players || players.length === 0) return null;

  // Find user profile
  const self = players.find(p => p.id === currentPlayerId);
  const selfIndex = players.findIndex(p => p.id === currentPlayerId);

  // Rotate players so that current player is at the bottom (index 0)
  const rotatedPlayers = [...players];
  if (selfIndex !== -1) {
    const beforeSelf = players.slice(0, selfIndex);
    const afterSelf = players.slice(selfIndex);
    rotatedPlayers.splice(0, rotatedPlayers.length, ...afterSelf, ...beforeSelf);
  }

  // Opponents are everyone except index 0 (self)
  const opponents = rotatedPlayers.slice(1);

  const [lastDiscarderId, setLastDiscarderId] = useState<string | null>(null);
  const prevDiscardLengthRef = useRef<number>(0);
  const prevTopCardRef = useRef<string>('');

  useEffect(() => {
    const discardPile = currentRound?.discardPile || [];
    const currentLength = discardPile.length;
    const topCard = currentLength > 0 ? discardPile[currentLength - 1] : null;
    const topCardKey = topCard ? `${topCard.rank}-${topCard.suit}-${topCard.joker}` : '';

    if (currentLength > prevDiscardLengthRef.current || topCardKey !== prevTopCardRef.current) {
      if (currentLength > 0) {
        if (currentLength === 1 && currentRound && !currentRound.firstTurnCompleted) {
          setLastDiscarderId('system');
        } else if (currentRound && currentRound.currentPlayerIndex !== undefined && players[currentRound.currentPlayerIndex]) {
          setLastDiscarderId(players[currentRound.currentPlayerIndex].id);
        }
      } else {
        setLastDiscarderId(null);
      }
      prevDiscardLengthRef.current = currentLength;
      prevTopCardRef.current = topCardKey;
    }
  }, [currentRound?.discardPile, currentRound?.currentPlayerIndex, players, currentRound?.firstTurnCompleted]);

  const getDiscardDirectionClass = (): string => {
    if (!lastDiscarderId) return 'discard-from-center';
    if (lastDiscarderId === 'system') return 'discard-from-center';
    if (lastDiscarderId === currentPlayerId) return 'discard-from-bottom';
    
    const leftOpponents = opponents.slice(0, Math.ceil(opponents.length / 2));
    if (leftOpponents.some(o => o.id === lastDiscarderId)) {
      return 'discard-from-left';
    }
    
    const rightOpponents = opponents.slice(Math.ceil(opponents.length / 2));
    if (rightOpponents.some(o => o.id === lastDiscarderId)) {
      return 'discard-from-right';
    }
    
    return 'discard-from-center';
  };

  const discardDirectionClass = getDiscardDirectionClass();

  // Find who is the active player whose turn it is
  const activePlayer = currentRound && !currentRound.roundEnded
    ? players[currentRound.currentPlayerIndex]
    : null;
  const isMyTurn = activePlayer?.id === currentPlayerId;

  // Check state of my hand with unique client-side IDs to track identical duplicates
  const [orderedHand, setOrderedHand] = useState<any[]>(() => {
    const initialHand = self?.hand || [];
    const cardKey = (c: CardType) => `${c.rank ?? 'null'}-${c.suit ?? 'null'}-${c.joker}`;
    return initialHand.map(c => ({
      ...c,
      clientId: `${cardKey(c)}-${Math.random().toString(36).substring(2, 9)}`
    }));
  });
  const draggedIndexRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchHasMovedRef = useRef<boolean>(false);

  // Sync hand cards while preserving custom order and exact counts
  useEffect(() => {
    const serverHand = self?.hand || [];
    const cardKey = (c: CardType) => `${c.rank ?? 'null'}-${c.suit ?? 'null'}-${c.joker}`;
    
    // Count occurrences in server hand
    const serverCounts: Record<string, number> = {};
    for (const card of serverHand) {
      const key = cardKey(card);
      serverCounts[key] = (serverCounts[key] || 0) + 1;
    }
    
    setOrderedHand(prev => {
      const newOrderedHand: any[] = [];
      const tempCounts = { ...serverCounts };
      
      // Keep cards from prev if they still exist in server hand
      for (const card of prev) {
        const key = cardKey(card);
        if (tempCounts[key] && tempCounts[key] > 0) {
          newOrderedHand.push(card);
          tempCounts[key]--;
        }
      }
      
      // Append any new cards that are in server hand but not matched from prev
      for (const card of serverHand) {
        const key = cardKey(card);
        if (tempCounts[key] && tempCounts[key] > 0) {
          newOrderedHand.push({
            ...card,
            clientId: `${key}-${Math.random().toString(36).substring(2, 9)}`
          });
          tempCounts[key]--;
        }
      }
      
      return newOrderedHand;
    });
  }, [self?.hand]);

  const handleDraw = (fromDiscard: boolean) => {
    if (drawTimeoutRef.current) {
      clearTimeout(drawTimeoutRef.current);
    }
    setIsPickingFromPile(true);
    onDraw(fromDiscard);
    drawTimeoutRef.current = setTimeout(() => {
      setIsPickingFromPile(false);
    }, 1000);
  };

  const prevHandLength = useRef(self?.hand?.length || 0);

  useEffect(() => {
    const currentLength = self?.hand?.length || 0;
    if (currentLength !== prevHandLength.current) {
      if (isPickingFromPile) {
        if (drawTimeoutRef.current) {
          clearTimeout(drawTimeoutRef.current);
        }
        drawTimeoutRef.current = setTimeout(() => {
          setIsPickingFromPile(false);
        }, 150);
      }
      prevHandLength.current = currentLength;
    }
  }, [self?.hand?.length, isPickingFromPile]);

  useEffect(() => {
    return () => {
      if (drawTimeoutRef.current) {
        clearTimeout(drawTimeoutRef.current);
      }
    };
  }, []);

  // Sync effect to keep bufferedStateRef pointing to latest live gameState prop
  useEffect(() => {
    bufferedStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const prevRoundNumber = displayedGameState?.currentRoundNumber;
    const prevStatus = displayedGameState?.status;
    const newRoundNumber = gameState?.currentRoundNumber;
    const newStatus = gameState?.status;

    // Check if a new round or new game started
    const isNewRound = gameState && displayedGameState && (
      (newStatus === 'IN_PROGRESS' && prevStatus === 'WAITING_FOR_PLAYERS') ||
      (newRoundNumber > prevRoundNumber)
    );

    if (isNewRound) {
      // Set the initial round state to displayedGameState
      setDisplayedGameState(gameState);
      setAnimateHand(false);

      // Set timer to enable hand animation after 300ms
      const handAnimateTimer = setTimeout(() => {
        setDisplayedGameState(bufferedStateRef.current);
        setAnimateHand(true);
      }, 300);

      return () => {
        clearTimeout(handAnimateTimer);
      };
    } else {
      // Update the displayed game state instantly
      setDisplayedGameState(gameState);
    }
  }, [gameState, displayedGameState]);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    draggedIndexRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, hoverIdx: number) => {
    e.preventDefault();
    const draggedIdx = draggedIndexRef.current;
    if (draggedIdx === null || draggedIdx === hoverIdx) return;

    const updated = [...orderedHand];
    const [draggedCard] = updated.splice(draggedIdx, 1);
    updated.splice(hoverIdx, 0, draggedCard);

    setOrderedHand(updated);
    draggedIndexRef.current = hoverIdx;
  };

  const handleDragEnd = () => {
    draggedIndexRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent, idx: number) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchHasMovedRef.current = false;
    draggedIndexRef.current = idx;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const draggedIdx = draggedIndexRef.current;
    if (draggedIdx === null || !touchStartRef.current) return;

    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 10) {
      touchHasMovedRef.current = true;
      if (e.cancelable) {
        e.preventDefault();
      }

      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const cardEl = element?.closest('[data-index]');
      if (cardEl) {
        const hoverIdxAttr = cardEl.getAttribute('data-index');
        if (hoverIdxAttr !== null) {
          const hoverIdx = parseInt(hoverIdxAttr, 10);
          if (hoverIdx !== draggedIdx) {
            const updated = [...orderedHand];
            const [draggedCard] = updated.splice(draggedIdx, 1);
            updated.splice(hoverIdx, 0, draggedCard);
            setOrderedHand(updated);
            draggedIndexRef.current = hoverIdx;
          }
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, card: CardType) => {
    draggedIndexRef.current = null;
    touchStartRef.current = null;
    if (!touchHasMovedRef.current) {
      e.preventDefault(); // Prevent synthetic mouse click
      handleCardClick(card);
    }
  };
  // Wait, did I discard during my turn? 
  // If my hand is 5, isMyTurn is true, and I haven't drawn yet: then hasDrawn is false, and I must draw.
  // If I have drawn, hand is 6, must discard.
  // If I have discarded, hand is 5, and I am waiting to end turn or tick.
  // We can track if I have discarded in this turn. A simple way:
  // In the backend, drawing is required first. So if hand size is 5 and it is my turn:
  // - If the turn just started: I must draw.
  // - If I drew (hand size 6) and then discarded (hand size 5): I can now Tick or End Turn!
  // To distinguish, we can track a local or backend turn state. The backend does not automatically advance the turn after discard.
  // This means if hand is 5, and it's my turn, and I ALREADY discarded: I can click "End Turn" or "Tick".
  // If hand is 5, it's my turn, and I HAVEN'T drawn: I must draw first!
  // Let's implement a state tracker or simple flag. If hand is 5 and it's my turn, how do we know if we drew?
  // We can keep track of a local state `drewThisTurn` which resets when the turn index changes!
  // Let's do that. We can check if `isMyTurn` is true, and we store the turn number.
  // Or even simpler: the draw pile/discard pile click will call `onDraw` when hand is 5 and we haven't drawn.
  // How do we know if we already drew and discarded?
  // If we drew and discarded, we are allowed to click "End Turn" or "Tick".
  // Wait! In the backend, `endTurn` and `declareTick` both check `currentPlayer.getHand().size() == 5`.
  // If a player hasn't drawn yet, their hand size is 5. If they call `endTurn` before drawing, the backend will block it:
  // Wait, does the backend block it? Let's check `GameEngine.java`:
  // `endTurn` checks: `currentPlayer.getHand().size() != 5`. But their hand size is 5 if they haven't drawn!
  // Ah! If they haven't drawn, hand size is 5. If they call `endTurn`, they would skip drawing.
  // In card games, skipping drawing is illegal. To prevent this, we should track if the player has drawn.
  // Let's check if the backend has a way to enforce this. The backend has:
  // `drawCard` checks: `currentPlayer.getHand().size() >= 6`.
  // `discardCard` checks: `currentPlayer.getHand().size() < 6` -> throws "Must draw a card before discarding".
  // So a player cannot discard before drawing.
  // If a player tries to end turn without drawing, their hand is 5. Since hand is 5, does the backend block `endTurn`?
  // In `endTurn(gameId, playerId)`:
  // `if (currentPlayer.getHand().size() != 5) { throw new IllegalStateException("Must discard a card before ending turn"); }`
  // Ah! It checks if hand size is NOT 5. If the player hasn't drawn, their hand size is 5.
  // So to prevent ending turn before drawing, we should track whether the player has drawn!
  // In our React code, we can easily track:
  // `const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false);`
  // We can reset `hasDrawnThisTurn` when the active turn player index changes in `gameState`.
  // This is extremely simple and effective!
  
  const currentTurnIndex = currentRound ? currentRound.currentPlayerIndex : -1;
  const hasDiscardedThisTurn = currentRound ? currentRound.hasDiscardedThisTurn : false;
  const needsToDraw = currentRound ? currentRound.needsToDraw : false;

  const getDrawableDiscardCard = (): CardType | null => {
    if (!currentRound || !currentRound.discardPile || currentRound.discardPile.length === 0) return null;
    let k = currentRound.cardsDiscardedThisTurn;
    if (!k || k <= 0) {
      const handSize = self?.hand?.length || 0;
      k = 5 - handSize;
    }
    const idx = currentRound.discardPile.length - k - 1;
    return idx >= 0 ? currentRound.discardPile[idx] : null;
  };
  const drawableDiscardCard = getDrawableDiscardCard();

  // Reset selected cards when turn changes or after discard
  useEffect(() => {
    if (!isMyTurn) {
      setSelectedClientIds([]);
    }
  }, [currentTurnIndex, isMyTurn]);

  // Automatically end turn when the player's turn is completed
  useEffect(() => {
    if (isMyTurn && hasDiscardedThisTurn && !needsToDraw) {
      onEndTurn();
    }
  }, [isMyTurn, hasDiscardedThisTurn, needsToDraw, onEndTurn]);

  // Turn timer countdown effect
  useEffect(() => {
    if (status !== 'IN_PROGRESS' || !currentRound || !currentRound.turnStartedAt || currentRound.roundEnded) {
      setTimeLeft(null);
      return;
    }

    const turnStartedAt = currentRound.turnStartedAt;

    const updateTimer = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - turnStartedAt) / 1000));
      const remaining = Math.min(60, Math.max(0, 60 - elapsed));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [status, currentRound?.turnStartedAt, currentRound?.roundEnded, currentRound?.currentPlayerIndex, currentRound?.hasDiscardedThisTurn, currentRound?.needsToDraw]);

  const isCardSelected = (card: any) =>
    selectedClientIds.includes(card.clientId);

  const hasMatch = (): boolean => {
    if (!self || !self.hand || !currentRound || !currentRound.discardPile || currentRound.discardPile.length === 0) return false;
    const topDiscard = currentRound.discardPile[currentRound.discardPile.length - 1];
    return self.hand.some(c => 
      (c.rank && topDiscard.rank && c.rank === topDiscard.rank) ||
      (c.joker && !c.rank && topDiscard.joker && !topDiscard.rank)
    );
  };
  const isDiscardMatch = hasMatch();

  const handleCardClick = (card: any) => {
    if (!isMyTurn || hasDiscardedThisTurn) return;

    if (isCardSelected(card)) {
      // Deselect this card
      setSelectedClientIds(prev => prev.filter(id => id !== card.clientId));
    } else {
      // Find the first selected card object to compare rank
      const firstSelectedCard = orderedHand.find(c => selectedClientIds.includes(c.clientId));
      
      // Only allow selecting cards of the same rank as the first selected
      if (!firstSelectedCard || card.rank === firstSelectedCard.rank) {
        setSelectedClientIds(prev => [...prev, card.clientId]);
      } else {
        // Clicking a different rank resets selection to just this card
        setSelectedClientIds([card.clientId]);
      }
    }
  };

  const handleDiscardClick = () => {
    if (selectedClientIds.length === 0) return;
    
    // Map clientIds back to actual Card objects and strip clientId
    const cardsToDiscard = orderedHand
      .filter(c => selectedClientIds.includes(c.clientId))
      .map(({ clientId, ...card }) => card);

    if (cardsToDiscard.length === 1) {
      onDiscard(cardsToDiscard[0]);
    } else {
      onDiscardMulti(cardsToDiscard);
    }
    setSelectedClientIds([]);
  };



  const copyRoomCode = () => {
    navigator.clipboard.writeText(gameId);
    alert('Room code copied to clipboard!');
  };

  const showSelfAvatar = status === 'WAITING_FOR_PLAYERS' || isMyTurn || !activePlayer;

  const getAvatarPic = (player: any): string | null => {
    if (player.id === currentPlayerId) {
      const pic = localStorage.getItem('selected_avatar_pic');
      return pic && pic !== 'none' ? pic : null;
    }
    if (player.isAi) {
      const name = player.name || '';
      const numMatch = name.match(/\d+/);
      const index = numMatch ? parseInt(numMatch[0], 10) : (player.id ? player.id.charCodeAt(0) : 0);
      const botAvatars = ['panda', 'fox', 'cat', 'robot', 'monkey', 'unicorn'];
      return botAvatars[(index - 1 + botAvatars.length) % botAvatars.length];
    }
    return null;
  };

  const getActiveDisplayAvatar = (): React.ReactNode => {
    const activeDisplayPlayer = showSelfAvatar ? self : activePlayer;
    if (activeDisplayPlayer) {
      const avatarPic = getAvatarPic(activeDisplayPlayer);
      if (avatarPic) {
        return <img src={`/avatars/${avatarPic}.png`} alt="Avatar" className="mm-avatar-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
      }
      return showSelfAvatar 
        ? (self?.name || localStorage.getItem('tickPlayerName') || 'P')[0].toUpperCase()
        : (activePlayer?.name || 'P')[0].toUpperCase();
    } else {
      const localPic = localStorage.getItem('selected_avatar_pic');
      if (localPic && localPic !== 'none') {
        return <img src={`/avatars/${localPic}.png`} alt="Avatar" className="mm-avatar-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
      }
      return (localStorage.getItem('tickPlayerName') || 'P')[0].toUpperCase();
    }
  };

  return (
    <div className="game-table-container">
      {/* HUD Header */}
      <div className="game-hud-header">
        {/* Left Section: Leave & Room Code */}
        <div className="hud-section left">
          <button 
            className="hud-btn-leave" 
            onClick={() => setShowLeaveConfirm(true)}
            title="Leave Game"
          >
            <span className="hud-leave-pulse" />
            <svg className="hud-svg-icon exit-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="btn-text">Leave</span>
          </button>
          
          <div className="hud-pill room-pill" onClick={copyRoomCode} title="Click to copy Room Code">
            <svg className="hud-svg-icon key-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3" />
            </svg>
            <span className="pill-label">Room:</span>
            <span className="pill-value">{gameId}</span>
          </div>
        </div>
        
        {/* Center Section: Round Info & Turn Status */}
        <div className="hud-section center">
          {currentRound && (
            <div className="hud-pill round-pill">
              <svg className="hud-svg-icon deck-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect className="fan-card fan-left" x="3" y="5" width="10" height="14" rx="1.5" />
                <rect className="fan-card fan-right" x="11" y="5" width="10" height="14" rx="1.5" />
                <rect className="fan-card fan-center" x="7" y="4" width="10" height="14" rx="1.5" />
              </svg>
              <span className="pill-label">Round:</span>
              <span className="pill-value">{currentRound.roundNumber} / {gameState.maxRounds}</span>
            </div>
          )}
          
          {activePlayer && (
            <div className={`hud-pill turn-pill ${isMyTurn ? 'my-turn' : 'opponent-turn'}`}>
              <span className="turn-indicator-dot" />
              <svg className={`hud-svg-icon clock-icon ${isMyTurn && timeLeft !== null && timeLeft <= 15 ? 'warning-speed' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="pill-value">
                {isMyTurn ? 'Your Turn' : `${activePlayer.name}'s Turn`}
              </span>
            </div>
          )}
        </div>

        {/* Right Section: Scoreboard Trigger & Emoji Picker */}
        <div className="hud-section right" style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          
          {/* Floating Emoji Reaction Button & Picker */}
          <div className="emoji-reaction-picker-container">
            <button 
              className={`emoji-trigger-btn glass-panel ${showEmojiPicker ? 'active' : ''}`}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="React with Emoji"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>
            
            {showEmojiPicker && (
              <div className="emoji-picker-options glass-panel">
                {['😂', '😡', '😲', '👏'].map(emoji => (
                  <button
                    key={emoji}
                    className="emoji-option-btn"
                    onClick={() => {
                      onSendReaction(emoji);
                      setShowEmojiPicker(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            className={`hud-btn-scores ${showScoreboard ? 'active' : ''}`}
            onClick={() => setShowScoreboard(!showScoreboard)}
            title="Toggle Leaderboard"
          >
            <svg className="hud-svg-icon trophy-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 2H5c-1.1 0-2 .9-2 2v3c0 2.24 1.54 4.12 3.6 4.77C7.3 13.56 9.44 15 12 15s4.7-1.44 5.4-3.23c2.06-.65 3.6-2.53 3.6-4.77V4c0-1.1-.9-2-2-2zm-12.4 8c-1.1-.15-1.99-.95-2.2-2H5V4h1.6v6zm12.4-2c-.21 1.05-1.1 1.85-2.2 2V4H20v2h-1zM12 17c-2.21 0-4-1.79-4-4h8c0 2.21-1.79 4-4 4zm4.5 2h-9v2h9v-2z" />
            </svg>
            <span className="btn-text">{showScoreboard ? 'Hide Scores' : 'Show Scores'}</span>
          </button>
        </div>
      </div>

      {/* ── Mobile layout wrapper ─────────────────────────────────
           On mobile  → column: [opponents-strip] [game-field] [hand]
           On desktop → table-play-area is relative, opponents go
                        absolute left/right, center stays absolute.
      ──────────────────────────────────────────────────────── */}
      <div className="mobile-game-layout">

        {/* Opponents strip — top on mobile, left/right on desktop */}
        <div className={`opponents-top-container ${opponents.length >= 2 ? 'compact-opponents' : ''}`}>
          {/* Left column / first-half */}
          <div className="opponents-column left">
            {opponents.slice(0, Math.ceil(opponents.length / 2)).map((opp) => {
              const isOpponentTurn = currentRound && !currentRound.roundEnded && players[currentRound.currentPlayerIndex]?.id === opp.id;
              return (
                <div key={opp.id} className="opponent-slot">
                  <div className={`opponent-avatar-card glass-panel ${isOpponentTurn ? 'active-turn' : ''} ${opp.declaredTick ? 'declared-tick' : ''}`}>
                    <div className="avatar-wrapper">
                      <div className="turn-ring" />
                      <div className="avatar-circle" style={{ borderColor: opp.isAi ? 'var(--color-gold)' : 'var(--color-cyan)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {(() => {
                          const avatarPic = getAvatarPic(opp);
                          return avatarPic ? (
                            <img src={`/avatars/${avatarPic}.png`} alt="Avatar" className="mm-avatar-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            getInitials(opp.name)
                          );
                        })()}
                      </div>
                      {isOpponentTurn && (
                        <div className={`avatar-timer-overlay ${timeLeft !== null && timeLeft <= 15 ? 'warning' : ''}`}>
                          {timeLeft !== null ? timeLeft : 60}
                        </div>
                      )}
                    </div>
                    <div className="avatar-info">
                      <span className="avatar-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{opp.name}</span>
                        {opp.isAi && <span style={{ fontSize: '0.65rem', color: 'var(--color-gold)' }}>[BOT]</span>}
                      </span>
                      <span className="avatar-score">{opp.totalScore} pts</span>
                    </div>
                    {activeReactions[opp.id] && (
                      <div className="reaction-bubble-opponent">
                        {activeReactions[opp.id].emoji}
                      </div>
                    )}
                  </div>
                  <div className="opponent-mini-hand">
                    {Array.from({ length: opp.cardCount || 5 }).map((_, cIdx) => (<div key={cIdx} className={`card-back card-back-${selectedBack}`} />))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right column / second-half */}
          <div className="opponents-column right">
            {opponents.slice(Math.ceil(opponents.length / 2)).map((opp) => {
              const isOpponentTurn = currentRound && !currentRound.roundEnded && players[currentRound.currentPlayerIndex]?.id === opp.id;
              return (
                <div key={opp.id} className="opponent-slot">
                  <div className={`opponent-avatar-card glass-panel ${isOpponentTurn ? 'active-turn' : ''} ${opp.declaredTick ? 'declared-tick' : ''}`}>
                    <div className="avatar-wrapper">
                      <div className="turn-ring" />
                      <div className="avatar-circle" style={{ borderColor: opp.isAi ? 'var(--color-gold)' : 'var(--color-cyan)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {(() => {
                          const avatarPic = getAvatarPic(opp);
                          return avatarPic ? (
                            <img src={`/avatars/${avatarPic}.png`} alt="Avatar" className="mm-avatar-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            getInitials(opp.name)
                          );
                        })()}
                      </div>
                      {isOpponentTurn && (
                        <div className={`avatar-timer-overlay ${timeLeft !== null && timeLeft <= 15 ? 'warning' : ''}`}>
                          {timeLeft !== null ? timeLeft : 60}
                        </div>
                      )}
                    </div>
                    <div className="avatar-info">
                      <span className="avatar-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{opp.name}</span>
                        {opp.isAi && <span style={{ fontSize: '0.65rem', color: 'var(--color-gold)' }}>[BOT]</span>}
                      </span>
                      <span className="avatar-score">{opp.totalScore} pts</span>
                    </div>
                    {activeReactions[opp.id] && (
                      <div className="reaction-bubble-opponent">
                        {activeReactions[opp.id].emoji}
                      </div>
                    )}
                  </div>
                  <div className="opponent-mini-hand">
                    {Array.from({ length: opp.cardCount || 5 }).map((_, cIdx) => (<div key={cIdx} className={`card-back card-back-${selectedBack}`} />))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center game field — fills remaining space, stacks are centred inside */}
        <div className="table-play-area">
          {currentRound && (
            <div className="center-play-wrapper">
              {/* Center Card Stacks */}
              <div className="center-stacks">
                <div
                  className={`joker-display ${tutorialActive && tutorialSteps[tutorialStep].targetClass === 'joker-display' ? 'tutorial-highlight' : ''}`}
                >
                  <span className="joker-label">Joker Rank</span>
                  <Card card={currentRound.jokerCard} className="mini-card" />
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-gold)', fontWeight: 800 }}>
                    ★ {currentRound.jokerRank}s are Jokers
                  </span>
                </div>

                {/* Draw Stack */}
                <div
                  className={`card-pile ${isMyTurn && hasDiscardedThisTurn && needsToDraw ? 'interactive glow-cyan' : ''} ${tutorialActive && tutorialSteps[tutorialStep].targetClass === 'tutorial-step-draw' ? 'tutorial-highlight' : ''}`}
                  style={{ cursor: isMyTurn && hasDiscardedThisTurn && needsToDraw ? 'pointer' : 'default' }}
                  onClick={() => { if (isMyTurn && hasDiscardedThisTurn && needsToDraw) handleDraw(false); }}
                >
                  <span className="pile-label">Deck</span>
                  <Card isBack={true} />
                  <div className="card-pile-count">{currentRound.drawPileSize}</div>
                </div>

                <div
                  className={`card-pile ${isMyTurn && hasDiscardedThisTurn && needsToDraw && drawableDiscardCard ? 'interactive glow-cyan' : ''} ${tutorialActive && tutorialSteps[tutorialStep].targetClass === 'tutorial-step-discard' ? 'tutorial-highlight' : ''}`}
                  style={{ cursor: isMyTurn && hasDiscardedThisTurn && needsToDraw && drawableDiscardCard ? 'pointer' : 'default' }}
                  onClick={() => { if (isMyTurn && hasDiscardedThisTurn && needsToDraw && drawableDiscardCard) handleDraw(true); }}
                >
                  <span className="pile-label">
                    {currentRound.firstTurnCompleted 
                      ? (isMyTurn && hasDiscardedThisTurn && needsToDraw && drawableDiscardCard ? 'Take Prev' : 'Dropped Card')
                      : 'Open Card'}
                  </span>
                  {currentRound.discardPile && currentRound.discardPile.length > 0 ? (
                    <div className={`discard-cards-stack ${drawableDiscardCard ? 'has-prev' : ''}`}>
                      {drawableDiscardCard && (
                        <div className="previous-discard-card"><Card card={drawableDiscardCard} /></div>
                      )}
                      <div 
                        className={`top-discard-card ${discardDirectionClass}`}
                        key={`${currentRound.discardPile.length}-${currentRound.discardPile[currentRound.discardPile.length - 1].rank ?? 'none'}-${currentRound.discardPile[currentRound.discardPile.length - 1].suit ?? 'none'}-${currentRound.discardPile[currentRound.discardPile.length - 1].joker ? 'joker' : 'normal'}`}
                      >
                        <Card 
                          card={currentRound.discardPile[currentRound.discardPile.length - 1]} 
                          className={[
                            `rot-${currentRound.discardPile.length % 6}`,
                            isDiscardMatch ? 'joker-glow' : ''
                          ].join(' ').trim()} 
                        />
                      </div>
                    </div>
                  ) : (
                    <div className={`game-card card-back card-back-${selectedBack}`} style={{ opacity: 0.2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'center', height: '100%', fontSize: '0.8rem', color: 'black' }}>Empty</div>
                    </div>
                  )}
                  {isMyTurn && hasDiscardedThisTurn && needsToDraw && drawableDiscardCard && (
                    <div className="drawable-preview-badge">Prev: {drawableDiscardCard.rank} of {drawableDiscardCard.suit}</div>
                  )}
                </div>
              </div>

              {/* Mobile Action Buttons for Drawing */}
              {status === 'IN_PROGRESS' && isMyTurn && hasDiscardedThisTurn && needsToDraw && (
                <div className="mobile-draw-actions">
                  <button
                    className="btn-draw btn-pick-discard"
                    disabled={!drawableDiscardCard}
                    onClick={() => handleDraw(true)}
                  >
                    {currentRound.firstTurnCompleted ? 'Pick dropped card' : 'Pick open card'}
                  </button>
                  <button
                    className="btn-draw btn-pick-pile"
                    onClick={() => handleDraw(false)}
                  >
                    Draw from pile
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Lobby Waiting Panel */}
          {status === 'WAITING_FOR_PLAYERS' && (
            <div className="center-stacks glass-panel" style={{ flexDirection: 'column', width: '380px', padding: '32px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Waiting for Players</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                Minimum 2 players. Share code <strong className="text-gold" style={{ fontSize: '1rem' }}>{gameId}</strong> to join.
              </p>
              <div style={{ width: '100%', textAlign: 'left' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 800 }}>Joined:</span>
                {players.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{p.name} {p.isAi && '[AI]'}</span>
                    </span>
                      <span className={p.ready ? 'text-green' : 'text-red'} style={{ fontWeight: 800 }}>
                        {p.ready ? 'Ready' : 'Not Ready'}
                      </span>
                    </div>
                ))}
              </div>
              <button 
                className={self?.ready ? "btn-secondary" : "btn-primary"} 
                style={{ 
                  marginTop: '20px', 
                  width: '100%', 
                  padding: '12px 24px', 
                  fontSize: '1rem', 
                  fontWeight: 800,
                  transition: 'var(--transition-smooth)',
                  ...(self?.ready ? {
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                  } : {})
                }} 
                onClick={onReady} 
              >
                {self?.ready ? 'Cancel Ready' : 'I am Ready'}
              </button>
            </div>
          )}

        </div>

      </div>{/* end mobile-game-layout */}


      {/* User Hand & Actions Area — always pinned at the bottom */}
      <div className="user-hand-area" style={{ position: 'relative' }}>
        {activeReactions[currentPlayerId] && (
          <div className="reaction-bubble-self">
            {activeReactions[currentPlayerId].emoji}
          </div>
        )}
        {/* Helper instructions & Turn Timer */}
        <div className="hand-instructions-wrapper">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className={`player-hud-avatar-ring avatar-frame-${showSelfAvatar ? selectedAvatar : 'none'}`}>
              {showSelfAvatar && selectedAvatar === 'royal' && <span className="shop-royal-crown" style={{ transform: 'scale(0.7)', top: '-11px', zIndex: 10 }}>👑</span>}
              <span className="player-hud-avatar-crest" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {getActiveDisplayAvatar()}
              </span>
            </div>
            <div className="hand-instructions-text">
              {status === 'WAITING_FOR_PLAYERS' && 'Waiting to start... Click ready.'}
              {isMyTurn && !hasDiscardedThisTurn && 'Your Turn: Select a card to Drop or Declare.'}
              {isMyTurn && hasDiscardedThisTurn && needsToDraw && 'Your Turn: Draw a card from the Draw Pile (bundle).'}
              {!isMyTurn && status === 'IN_PROGRESS' && `Waiting for ${activePlayer ? activePlayer.name : ''}'s turn...`}
            </div>
          </div>
          {isMyTurn && timeLeft !== null && status === 'IN_PROGRESS' && (
            <div className={`hand-instructions-timer ${timeLeft <= 15 ? 'warning' : ''}`}>
              ⏱️ {timeLeft}s
            </div>
          )}
        </div>

        <div className={`user-hand-cards ${isPickingFromPile ? 'no-pick-transition' : ''} ${!animateHand ? 'no-appear-animation' : ''} ${tutorialActive && tutorialSteps[tutorialStep].targetClass === 'user-hand-cards' ? 'tutorial-highlight' : ''}`} style={{ position: 'relative', overflow: 'visible' }}>
          {/* Hand Value Sum - Top Right Corner */}
          {self && (
            <div className="hand-value-badge">
              {self.hand?.reduce((sum, card) => sum + (card.value || 0), 0) || 0}
            </div>
          )}
          {orderedHand.map((c, idx) => {
            const topDiscard = currentRound?.discardPile && currentRound.discardPile.length > 0 
              ? currentRound.discardPile[currentRound.discardPile.length - 1] 
              : null;
            const isMatch = topDiscard && (
              (c.rank && topDiscard.rank && c.rank === topDiscard.rank) ||
              (c.joker && !c.rank && topDiscard.joker && !topDiscard.rank)
            );
            const selected = isCardSelected(c);
            // Dim cards of a different rank when some cards are already selected
            const firstSelectedCard = orderedHand.find(card => selectedClientIds.includes(card.clientId));
            const sameRankAsSelection = !firstSelectedCard || c.rank === firstSelectedCard.rank;
            return (
              <Card
                key={c.clientId}
                card={c}
                selected={selected}
                className={[
                  isMatch && !(c.joker && c.rank) ? 'joker-glow' : '',
                  isMyTurn && !hasDiscardedThisTurn && !sameRankAsSelection && selectedClientIds.length > 0 ? 'card-dimmed' : ''
                ].join(' ').trim()}
                onClick={() => handleCardClick(c)}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, idx)}
                onTouchMove={handleTouchMove}
                onTouchEnd={(e) => handleTouchEnd(e, c)}
                dataIndex={idx}
              />
            );
          })}
        </div>

        {/* Action Controls */}
        <div className={`hand-controls ${tutorialActive && tutorialSteps[tutorialStep].targetClass === 'hand-controls' ? 'tutorial-highlight' : ''}`}>
          {/* Normal Discard Button */}
          {selectedClientIds.length > 0 && !hasDiscardedThisTurn && (
            <button
              className={selectedClientIds.length > 1 ? 'btn-danger' : 'btn-danger'}
              onClick={handleDiscardClick}
            >
              {selectedClientIds.length > 1
                ? `Drop All ${selectedClientIds.length} (${orderedHand.find(c => selectedClientIds.includes(c.clientId))?.rank}s) 🃏`
                : 'Drop Card'}
            </button>
          )}

          {/* Tick Button (Shown automatically when it's player's turn to discard/tick) */}
          {isMyTurn && !hasDiscardedThisTurn && (
            <button
              className="btn-danger pulse-button-red"
              onClick={() => setShowDeclareConfirm(true)}
            >
              Declare 🔔
            </button>
          )}


        </div>
      </div>

      {/* Scoreboard panel — positioned relative to the whole table screen to avoid clipping */}
      <div className={`side-scoreboard-container ${showScoreboard ? 'open' : ''}`}>
        <Scoreboard
          gameState={displayedGameState}
          currentPlayerId={currentPlayerId}
          onClose={() => setShowScoreboard(false)}
        />
      </div>

      {/* Declare Confirmation Modal */}
      {showDeclareConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeclareConfirm(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '320px', textAlign: 'center', padding: '24px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.4rem' }}>Confirm Declare</h2>
            <p style={{ marginBottom: '24px', color: 'var(--color-text-muted)', fontSize: '1rem' }}>
              Are you sure you want to declare? If no one has lower points, you'll get 80 penalty!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowDeclareConfirm(false)}
                style={{ flex: 1, padding: '14px 20px', fontSize: '1rem' }}
              >
                No
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  setShowDeclareConfirm(false);
                  onTick();
                }}
                style={{ flex: 1, padding: '14px 20px', fontSize: '1rem' }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '320px', textAlign: 'center', padding: '24px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.4rem' }}>Leave Game?</h2>
            <p style={{ marginBottom: '24px', color: 'var(--color-text-muted)', fontSize: '1rem' }}>
              Are you sure you want to leave the game? Your current progress will be lost.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowLeaveConfirm(false)}
                style={{ flex: 1, padding: '14px 20px', fontSize: '1rem' }}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  onLeave();
                }}
                style={{ flex: 1, padding: '14px 20px', fontSize: '1rem' }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Visual Tutorial Overlay */}
      {tutorialActive && (
        <>
          <div 
            className="tutorial-backdrop" 
            onClick={() => {
              if (tutorialStep < tutorialSteps.length - 1) {
                setTutorialStep(s => s + 1);
              } else {
                handleCompleteTutorial();
              }
            }}
          />
          
          <div className={`tutorial-card-popover pos-${tutorialSteps[tutorialStep].position}`}>
            <div className="tutorial-card-header">
              <span className="tutorial-step-indicator">Step {tutorialStep + 1} of {tutorialSteps.length}</span>
              <button className="tutorial-skip-btn" onClick={handleCompleteTutorial}>Skip</button>
            </div>
            
            <h3 className="tutorial-card-title">{tutorialSteps[tutorialStep].title}</h3>
            <p className="tutorial-card-text">{tutorialSteps[tutorialStep].text}</p>
            
            <div className="tutorial-card-footer">
              <div className="tutorial-progress-dots">
                {tutorialSteps.map((_, idx) => (
                  <span 
                    key={idx} 
                    className={`tutorial-progress-dot ${idx === tutorialStep ? 'active' : ''} ${idx < tutorialStep ? 'passed' : ''}`}
                    onClick={() => setTutorialStep(idx)}
                  />
                ))}
              </div>
              
              <div className="tutorial-card-nav-btns">
                {tutorialStep > 0 && (
                  <button className="tutorial-nav-btn secondary" onClick={() => setTutorialStep(s => s - 1)}>
                    ← Back
                  </button>
                )}
                <button 
                  className="tutorial-nav-btn primary" 
                  onClick={() => {
                    if (tutorialStep < tutorialSteps.length - 1) {
                      setTutorialStep(s => s + 1);
                    } else {
                      handleCompleteTutorial();
                    }
                  }}
                >
                  {tutorialStep === tutorialSteps.length - 1 ? 'Finish ✓' : 'Next →'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
