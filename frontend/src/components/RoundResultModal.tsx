import React, { useState } from 'react';
import type { SanitizedGame } from '../hooks/useWebSocket';
import type { Card as CardType } from '../utils/gameHelpers';
import { Card } from './Card';

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
  const [showStreakCelebration, setShowStreakCelebration] = useState<boolean>(false);

  React.useEffect(() => {
    if (!currentRound) return;
    
    // Only process once per round when the modal is shown
    const roundKey = `processed_streak_round_${currentRoundNumber}`;
    const alreadyProcessed = localStorage.getItem(roundKey) === 'true';
    if (alreadyProcessed) return;
    localStorage.setItem(roundKey, 'true');

    if (maxRounds > 3) {
      const selfPlayer = players.find(p => p.id === currentPlayerId);
      const isTickDeclaringPlayer = currentRound.tickPlayerId === currentPlayerId;
      
      if (isTickDeclaringPlayer) {
        const isCorrect = selfPlayer && selfPlayer.roundScore === 0;
        if (isCorrect) {
          const currentStreak = parseInt(localStorage.getItem('consecutive_correct_ticks') || '0') + 1;
          localStorage.setItem('consecutive_correct_ticks', currentStreak.toString());
          if (currentStreak >= 3) {
            setShowStreakCelebration(true);
          }
        } else {
          localStorage.setItem('consecutive_correct_ticks', '0');
        }
      }
    }
  }, [currentRound, players, currentPlayerId, maxRounds, currentRoundNumber]);

  if (!currentRound) return null;

  // Find who called tick
  const tickPlayer = players.find(p => p.id === currentRound.tickPlayerId);
  const tickPlayerName = tickPlayer ? tickPlayer.name : '';
  const endCondition = currentRound.endCondition; // "TICK" or "DECK_EXHAUSTED"

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

            return (
              <div 
                key={p.id} 
                className={`player-result-row ${rowClass}`}
              >
                <div className="result-player-info">
                  <span className="result-name" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>{p.name}</span>
                    {p.id === currentPlayerId && <span style={{ color: 'var(--color-cyan)', fontSize: '0.75rem' }}>(You)</span>}
                    {p.isAi && <span style={{ fontSize: '0.65rem', color: 'var(--color-gold)' }}>[BOT]</span>}
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
          ) : (gameState.isMultiplayer || (gameState as any).multiplayer) ? (
            (() => {
              const isHost = gameState.hostId === currentPlayerId;
              if (isHost) {
                return (
                  <button className="btn-primary" style={{ margin: '0' }} onClick={onNextRound}>
                    Next Round ({currentRoundNumber} / {maxRounds})
                  </button>
                );
              } else {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <p className="text-cyan" style={{ fontSize: '1rem', margin: '0', fontWeight: 600 }}>
                      Waiting for host to start next round... ⌛
                    </p>
                  </div>
                );
              }
            })()
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

      {/* Fiery Streak Celebration Overlay */}
      {showStreakCelebration && (
        <div className="streak-celebration-overlay" onClick={() => setShowStreakCelebration(false)}>
          <div className="streak-celebration-content" onClick={e => e.stopPropagation()}>
            <div className="fire-streak-badge">🔥 🔥 🔥</div>
            <h1 className="streak-title animate-bounce">TICK STREAK!</h1>
            <p className="streak-desc">3 Correct Declares in a Row!</p>
            <div className="streak-sub">Unstoppable performance in {maxRounds} rounds!</div>
            <button className="btn-primary" style={{ marginTop: '24px', padding: '10px 24px' }} onClick={() => setShowStreakCelebration(false)}>
              Awesomeness! 🚀
            </button>
          </div>
          {Array.from({ length: 22 }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 2.5;
            const duration = 2 + Math.random() * 2;
            const size = 1.2 + Math.random() * 1.5;
            return (
              <span 
                key={i} 
                className="floating-flame-particle"
                style={{
                  left: `${left}%`,
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`,
                  fontSize: `${size}rem`,
                }}
              >
                🔥
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
