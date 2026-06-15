import React, { useState } from 'react';
import type { SanitizedGame } from '../hooks/useWebSocket';
import type { Card as CardType } from '../utils/gameHelpers';
import { Card } from './Card';
import { parsePlayerName, getRankTier } from '../utils/rankSystem';

const calculateHandValue = (hand?: CardType[] | null): number => {
  if (!hand) return 0;
  return hand.reduce((sum, c) => {
    if (c.joker || !c.rank) return sum;
    switch (c.rank) {
      case 'ACE': return sum + 1;
      case 'TWO': return sum + 2;
      case 'THREE': return sum + 3;
      case 'FOUR': return sum + 4;
      case 'FIVE': return sum + 5;
      case 'SIX': return sum + 6;
      case 'SEVEN': return sum + 7;
      case 'EIGHT': return sum + 8;
      case 'NINE': return sum + 9;
      case 'TEN': return sum + 10;
      case 'JACK': return sum + 11;
      case 'QUEEN': return sum + 12;
      case 'KING': return sum + 13;
      default: return sum;
    }
  }, 0);
};

interface RoundResultModalProps {
  gameState: SanitizedGame;
  currentPlayerId: string;
  onNextRound: () => void;
  onLeave?: () => void;
  onShowLeaderboard?: () => void;
}

export const RoundResultModal: React.FC<RoundResultModalProps> = ({
  gameState,
  currentPlayerId,
  onNextRound,
  onLeave,
  onShowLeaderboard,
}) => {
  const { currentRound, players, currentRoundNumber, maxRounds } = gameState;
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false);
  if (!currentRound) return null;

  // Find who called tick
  const tickPlayer = players.find(p => p.id === currentRound.tickPlayerId);
  const tickPlayerName = tickPlayer ? parsePlayerName(tickPlayer.name).name : '';
  const endCondition = currentRound.endCondition; // "TICK" or "DECK_EXHAUSTED"

  // Check if current player is ready
  const self = players.find(p => p.id === currentPlayerId);
  const isSelfReady = self?.ready;

  // Determine round winner(s) (whoever scored 0 points in this round)
  const roundWinners = players.filter(p => p.roundScore === 0);

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <h2 className="modal-title text-gold">Round {currentRoundNumber} Completed</h2>
        
        <p className="modal-subtitle">
          {endCondition === 'TICK' && tickPlayer ? (
            <>
              <strong>{tickPlayerName}</strong> declared. 
              {tickPlayer.roundScore === 80 ? (
                <span className="text-red"> Wrong declare! (80 points penalty)</span>
              ) : (
                <span className="text-cyan"> Declared! (0 points)</span>
              )}
            </>
          ) : (
            <>Round ended! Player with the lowest hand value gets 0 points.</>
          )}
        </p>

        <div className="results-grid">
          {players.map(p => {
            const isWinner = roundWinners.some(w => w.id === p.id);
            const isTickDeclaringPlayer = currentRound.tickPlayerId === p.id;
            const isWrongTick = isTickDeclaringPlayer && p.roundScore === 80;
            
            // Calculate cards remaining
            const cardsLeft = p.hand ? p.hand.length : 0;
            const handValue = calculateHandValue(p.hand);

            let rowClass = '';
            if (isWinner) rowClass = 'winner-row';
            else if (isWrongTick) rowClass = 'tick-declarer-wrong';

            const { name: parsedName, level, mmr } = parsePlayerName(p.name);
            const rank = getRankTier(mmr);

            return (
              <div 
                key={p.id} 
                className={`player-result-row ${rowClass}`}
              >
                <div className="result-player-info">
                  <span className="result-name" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {!p.isAi && <span style={{ fontSize: '0.85rem' }} title={rank.name}>{rank.badge}</span>}
                    <span>{parsedName}</span>
                    {p.id === currentPlayerId && <span style={{ color: 'var(--color-cyan)', fontSize: '0.75rem' }}>(You)</span>}
                    {p.isAi && <span style={{ fontSize: '0.65rem', color: 'var(--color-gold)' }}>[BOT]</span>}
                    {!p.isAi && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '4px' }}>LVL {level}</span>}
                    {gameState.isMultiplayer && (
                      <span 
                        className={`result-badge ${p.ready ? 'ready' : 'waiting'}`}
                        style={{
                          background: p.ready ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.12)',
                          color: p.ready ? 'var(--color-green)' : 'var(--color-text-muted)',
                          border: p.ready ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        {p.ready ? 'Ready ✓' : 'Waiting... ⌛'}
                      </span>
                    )}
                  </span>
                  
                  {isTickDeclaringPlayer && (
                    <span className="result-badge tick" style={{ background: isWrongTick ? 'var(--color-red)' : 'var(--color-green)', color: isWrongTick ? '#ffffff' : '#040814' }}>
                      {isWrongTick ? 'Wrong declare 🔔' : 'Declared 🔔'}
                    </span>
                  )}
                  {isWinner && !isTickDeclaringPlayer && (
                    <span className="result-badge win">Round Win</span>
                  )}
                  {!isWinner && !isTickDeclaringPlayer && (
                    <span className="result-badge normal">Passed</span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Cards Left: <strong>{cardsLeft}</strong>
                  </span>
                </div>

                <div className="result-cards">
                  {p.hand && p.hand.map((c, idx) => (
                    <Card key={idx} card={c} className="mini-card" />
                  ))}
                </div>

                <div className="result-score">
                  <div 
                    className="result-round-score"
                    style={{
                      color: p.roundScore === 80 
                        ? 'var(--color-red)' 
                        : p.roundScore === 0 
                          ? 'var(--color-green)' 
                          : 'var(--color-cyan)'
                    }}
                  >
                    +{p.roundScore} pts
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    This Round
                  </div>
                  {p.roundScore !== handValue && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-gold)', fontWeight: 600, marginTop: '2px' }}>
                      (Hand: {handValue} pts)
                    </div>
                  )}
                  <div className="result-total-score" style={{ marginTop: '6px' }}>
                    Grand Total: <strong>{p.totalScore}</strong> pts
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
          {onLeave && (
            <button className="btn-secondary" style={{ margin: '0' }} onClick={() => setShowLeaveConfirm(true)}>
              ← Leave Game
            </button>
          )}
          {currentRoundNumber >= maxRounds ? (
            <button className="btn-primary" style={{ margin: '0' }} onClick={onShowLeaderboard}>
              View Game Results
            </button>
          ) : gameState.isMultiplayer ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button
                className={isSelfReady ? "btn-secondary" : "btn-primary"}
                style={{
                  margin: '0',
                  transition: 'var(--transition-smooth)',
                  ...(isSelfReady ? {
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                  } : {})
                }}
                onClick={onNextRound}
              >
                {isSelfReady ? 'Cancel Ready' : 'Ready for Next Round'}
              </button>
              {isSelfReady && (
                <p className="text-cyan" style={{ fontSize: '0.8rem', margin: '0' }}>
                  Waiting for other players...
                </p>
              )}
            </div>
          ) : (
            <button className="btn-primary" style={{ margin: '0' }} onClick={onNextRound}>
              Next Round ({currentRoundNumber} / {maxRounds})
            </button>
          )}
        </div>
      </div>

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
                  if (onLeave) onLeave();
                }}
                style={{ flex: 1, padding: '14px 20px', fontSize: '1rem' }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
