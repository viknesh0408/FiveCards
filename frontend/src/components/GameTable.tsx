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
}) => {
  const { gameId, players, currentRound, status } = gameState;
  const [selectedCards, setSelectedCards] = useState<CardType[]>([]);
  const [showScoreboard, setShowScoreboard] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

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

  // Find who is the active player whose turn it is
  const activePlayer = currentRound && !currentRound.roundEnded
    ? players[currentRound.currentPlayerIndex]
    : null;
  const isMyTurn = activePlayer?.id === currentPlayerId;

  // Check state of my hand
  const [orderedHand, setOrderedHand] = useState<CardType[]>(() => self?.hand || []);
  const draggedIndexRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchHasMovedRef = useRef<boolean>(false);

  // Sync hand cards while preserving custom order
  useEffect(() => {
    const serverHand = self?.hand || [];
    const cardKey = (c: CardType) => `${c.rank}-${c.suit}`;
    const serverCardKeys = new Set(serverHand.map(cardKey));
    
    setOrderedHand(prev => {
      let newOrderedHand = prev.filter(c => serverCardKeys.has(cardKey(c)));
      const orderedCardKeys = new Set(newOrderedHand.map(cardKey));
      const newCards = serverHand.filter(c => !orderedCardKeys.has(cardKey(c)));
      return [...newOrderedHand, ...newCards];
    });
  }, [self?.hand]);

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
      setSelectedCards([]);
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
      const elapsed = Math.floor((Date.now() - turnStartedAt) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [status, currentRound?.turnStartedAt, currentRound?.roundEnded, currentRound?.currentPlayerIndex, currentRound?.hasDiscardedThisTurn, currentRound?.needsToDraw]);

  const isCardSelected = (card: CardType) =>
    selectedCards.some(sc => sc.rank === card.rank && sc.suit === card.suit);

  const handleCardClick = (card: CardType) => {
    if (!isMyTurn || hasDiscardedThisTurn) return;

    if (isCardSelected(card)) {
      // Deselect this card
      setSelectedCards(prev => prev.filter(sc => !(sc.rank === card.rank && sc.suit === card.suit)));
    } else {
      // Only allow selecting cards of the same rank as the first selected
      if (selectedCards.length === 0 || card.rank === selectedCards[0].rank) {
        setSelectedCards(prev => [...prev, card]);
      } else {
        // Clicking a different rank resets selection to just this card
        setSelectedCards([card]);
      }
    }
  };

  const handleDiscardClick = () => {
    if (selectedCards.length === 0) return;
    if (selectedCards.length === 1) {
      onDiscard(selectedCards[0]);
    } else {
      onDiscardMulti(selectedCards);
    }
    setSelectedCards([]);
  };



  const copyRoomCode = () => {
    navigator.clipboard.writeText(gameId);
    alert('Room code copied to clipboard!');
  };

  return (
    <div className="game-table-container">
      {/* HUD Header */}
      <div className="game-hud-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-secondary" style={{ padding: '6px 12px' }} onClick={onLeave}>
            ← Leave
          </button>
          <div className="hud-stat" style={{ cursor: 'pointer' }} onClick={copyRoomCode}>
            Room: <span style={{ textDecoration: 'underline' }}>{gameId}</span>
          </div>
        </div>
        
        <div className="hud-info">
          {currentRound && (
            <div className="hud-stat">
              Round: <span>{currentRound.roundNumber} of {gameState.maxRounds}</span>
            </div>
          )}
          {activePlayer && (
            <div className="hud-stat">
              Turn: <span className="text-cyan">{isMyTurn ? 'Your Turn' : activePlayer.name}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          <button 
            className="btn-secondary" 
            style={{ 
              padding: '6px 12px', 
              background: showScoreboard ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              borderColor: showScoreboard ? 'var(--color-cyan)' : 'transparent',
              boxShadow: showScoreboard ? '0 0 10px var(--color-cyan-glow)' : 'none'
            }} 
            onClick={() => setShowScoreboard(!showScoreboard)}
          >
            🏆 {showScoreboard ? 'Hide Scores' : 'Show Scores'}
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
                      <div className="avatar-circle" style={{ borderColor: opp.isAi ? 'var(--color-cyan)' : 'rgba(255,255,255,0.2)' }}>
                        {getInitials(opp.name)}
                      </div>
                      {isOpponentTurn && (
                        <div className={`avatar-timer-overlay ${timeLeft !== null && timeLeft <= 15 ? 'warning' : ''}`}>
                          {timeLeft !== null ? timeLeft : 60}
                        </div>
                      )}
                    </div>
                    <div className="avatar-info">
                      <span className="avatar-name">{opp.name} {opp.isAi && <span style={{ fontSize: '0.65rem', color: 'var(--color-gold)' }}>[BOT]</span>}</span>
                      <span className="avatar-score">Total: {opp.totalScore} pts</span>
                    </div>
                  </div>
                  <div className="opponent-mini-hand">
                    {Array.from({ length: opp.cardCount || 5 }).map((_, cIdx) => (<div key={cIdx} className="card-back" />))}
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
                      <div className="avatar-circle" style={{ borderColor: opp.isAi ? 'var(--color-cyan)' : 'rgba(255,255,255,0.2)' }}>
                        {getInitials(opp.name)}
                      </div>
                      {isOpponentTurn && (
                        <div className={`avatar-timer-overlay ${timeLeft !== null && timeLeft <= 15 ? 'warning' : ''}`}>
                          {timeLeft !== null ? timeLeft : 60}
                        </div>
                      )}
                    </div>
                    <div className="avatar-info">
                      <span className="avatar-name">{opp.name} {opp.isAi && <span style={{ fontSize: '0.65rem', color: 'var(--color-gold)' }}>[BOT]</span>}</span>
                      <span className="avatar-score">Total: {opp.totalScore} pts</span>
                    </div>
                  </div>
                  <div className="opponent-mini-hand">
                    {Array.from({ length: opp.cardCount || 5 }).map((_, cIdx) => (<div key={cIdx} className="card-back" />))}
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
                <div className="joker-display">
                  <span className="joker-label">Joker Rank</span>
                  <Card card={currentRound.jokerCard} className="mini-card" />
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-gold)', fontWeight: 800 }}>
                    ★ {currentRound.jokerRank}s are Jokers
                  </span>
                </div>

                {/* Draw Stack */}
                <div
                  className={`card-pile ${isMyTurn && hasDiscardedThisTurn && needsToDraw ? 'interactive glow-cyan' : ''}`}
                  style={{ cursor: isMyTurn && hasDiscardedThisTurn && needsToDraw ? 'pointer' : 'default' }}
                  onClick={() => { if (isMyTurn && hasDiscardedThisTurn && needsToDraw) onDraw(false); }}
                >
                  <span className="pile-label">Deck</span>
                  <Card isBack={true} />
                  <div className="card-pile-count">{currentRound.drawPileSize}</div>
                </div>

                {/* Discard Stack */}
                <div
                  className={`card-pile ${isMyTurn && hasDiscardedThisTurn && needsToDraw && drawableDiscardCard ? 'interactive glow-cyan' : ''}`}
                  style={{ cursor: isMyTurn && hasDiscardedThisTurn && needsToDraw && drawableDiscardCard ? 'pointer' : 'default' }}
                  onClick={() => { if (isMyTurn && hasDiscardedThisTurn && needsToDraw && drawableDiscardCard) onDraw(true); }}
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
                      <div className="top-discard-card">
                        <Card card={currentRound.discardPile[currentRound.discardPile.length - 1]} className={`rot-${currentRound.discardPile.length % 6}`} />
                      </div>
                    </div>
                  ) : (
                    <div className="game-card card-back" style={{ opacity: 0.2 }}>
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
                    onClick={() => onDraw(true)}
                  >
                    {currentRound.firstTurnCompleted ? 'Pick dropped card' : 'Pick open card'}
                  </button>
                  <button
                    className="btn-draw btn-pick-pile"
                    onClick={() => onDraw(false)}
                  >
                    Pick from pile
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
                    <span>{p.name} {p.isAi && '[AI]'}</span>
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
      <div className="user-hand-area">
        {/* Helper instructions & Turn Timer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minHeight: '36px', justifyContent: 'center' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gold)' }}>
            {status === 'WAITING_FOR_PLAYERS' && 'Waiting to start... Click ready.'}
            {isMyTurn && !hasDiscardedThisTurn && 'Your Turn: Select a card to Drop or Declare.'}
            {isMyTurn && hasDiscardedThisTurn && needsToDraw && 'Your Turn: Draw a card from the Draw Pile (bundle).'}
            {!isMyTurn && status === 'IN_PROGRESS' && `Waiting for ${activePlayer?.name}'s turn...`}
          </div>
          {isMyTurn && timeLeft !== null && status === 'IN_PROGRESS' && (
            <div 
              style={{ 
                fontSize: '1rem', 
                fontWeight: 800, 
                color: timeLeft <= 15 ? 'var(--color-red)' : 'var(--color-cyan)',
                textShadow: timeLeft <= 15 ? '0 0 8px var(--color-red-glow)' : '0 0 8px var(--color-cyan-glow)',
                background: 'rgba(0,0,0,0.4)',
                padding: '4px 12px',
                borderRadius: '8px',
                border: `1px solid ${timeLeft <= 15 ? 'var(--color-red)' : 'var(--color-cyan)'}`
              }}
            >
              ⏱️ {timeLeft}s
            </div>
          )}
        </div>

        {/* Hand Cards */}
        <div className="user-hand-cards">
          {orderedHand.map((c, idx) => {
            const topDiscard = currentRound?.discardPile && currentRound.discardPile.length > 0 
              ? currentRound.discardPile[currentRound.discardPile.length - 1] 
              : null;
            const isMatch = topDiscard && c.rank === topDiscard.rank;
            const selected = isCardSelected(c);
            // Dim cards of a different rank when some cards are already selected
            const sameRankAsSelection = selectedCards.length === 0 || c.rank === selectedCards[0].rank;
            return (
              <Card
                key={idx}
                card={c}
                selected={selected}
                className={[
                  isMyTurn && !hasDiscardedThisTurn && isMatch ? 'joker-glow' : '',
                  isMyTurn && !hasDiscardedThisTurn && !sameRankAsSelection && selectedCards.length > 0 ? 'card-dimmed' : ''
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
        <div className="hand-controls">
          {/* Normal Discard Button */}
          {selectedCards.length > 0 && !hasDiscardedThisTurn && (
            <button
              className={selectedCards.length > 1 ? 'btn-danger' : 'btn-danger'}
              onClick={handleDiscardClick}
            >
              {selectedCards.length > 1
                ? `Drop All ${selectedCards.length} (${selectedCards[0].rank}s) 🃏`
                : 'Drop Card'}
            </button>
          )}

          {/* Tick Button (Shown automatically when it's player's turn to discard/tick) */}
          {isMyTurn && !hasDiscardedThisTurn && (
            <button
              className="btn-danger pulse-button-red"
              onClick={onTick}
            >
              Declare 🔔
            </button>
          )}


        </div>
      </div>

      {/* Scoreboard panel — positioned relative to the whole table screen to avoid clipping */}
      <div className={`side-scoreboard-container ${showScoreboard ? 'open' : ''}`}>
        <Scoreboard 
          gameState={gameState} 
          currentPlayerId={currentPlayerId} 
          onClose={() => setShowScoreboard(false)}
        />
      </div>
    </div>
  );
};
