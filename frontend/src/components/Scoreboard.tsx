import React from 'react';
import type { SanitizedGame } from '../hooks/useWebSocket';

interface ScoreboardProps {
  gameState: SanitizedGame;
  currentPlayerId: string;
  onClose?: () => void;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ gameState, currentPlayerId, onClose }) => {
  const { players, currentRound } = gameState;
  if (!players) return null;

  // Sort players by total score ascending (best score first)
  const sortedPlayers = [...players].sort((a, b) => a.totalScore - b.totalScore);

  return (
    <div className="side-scoreboard glass-panel">
      <h3 className="scoreboard-title" style={{ gap: '10px' }}>
        {onClose && (
          <button className="btn-secondary scoreboard-close-btn" onClick={onClose}>
            ← Back
          </button>
        )}
        <span>Standings</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Round {gameState.currentRoundNumber}</span>
      </h3>
      {sortedPlayers.map((p, index) => {
        const isCurrentTurn = currentRound && !currentRound.roundEnded && players[currentRound.currentPlayerIndex]?.id === p.id;
        const isSelf = p.id === currentPlayerId;
        const isLeader = index === 0;

        // Progress bar percentage (e.g. out of 100 points penalty limit)
        const progressPercent = Math.min((p.totalScore / 100) * 100, 100);

        return (
          <div 
            key={p.id} 
            className={`scoreboard-row ${isCurrentTurn ? 'active' : ''}`}
            style={{ fontWeight: isSelf ? 700 : 400 }}
          >
            <div className="scoreboard-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', width: '16px' }}>
                  #{index + 1}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: isSelf ? '#ffffff' : 'rgba(255,255,255,0.8)' }}>
                  {isLeader && <span style={{ marginRight: '4px', filter: 'drop-shadow(0 0 4px var(--color-gold-glow))' }}>👑</span>}
                  {p.name} {isSelf && <span style={{ fontSize: '0.75rem', color: 'var(--color-cyan)' }}>(You)</span>}
                </span>
                {isCurrentTurn && <span className="text-cyan animate-pulse" style={{ fontSize: '0.75rem' }}>●</span>}
                {p.declaredTick && <span className="text-red" style={{ fontSize: '0.7rem', fontWeight: 800 }}>[TICK]</span>}
              </div>
              
              <div style={{ fontWeight: 800, color: p.totalScore > 60 ? 'var(--color-red)' : p.totalScore > 30 ? 'var(--color-gold)' : 'var(--color-green)' }}>
                {p.totalScore} pts
              </div>
            </div>

            {/* Score progress visualizer bar */}
            <div className="score-progress-container">
              <div 
                className="score-progress-bar" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
