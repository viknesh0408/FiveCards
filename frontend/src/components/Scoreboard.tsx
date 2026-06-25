import React from 'react';
import type { SanitizedGame } from '../hooks/useWebSocket';
import { AvatarImage } from './AvatarImage';

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

  const getAvatarPic = (player: any): string | null => {
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
      const botAvatars = ['panda', 'fox', 'cat', 'robot', 'monkey', 'unicorn'];
      return botAvatars[(index - 1 + botAvatars.length) % botAvatars.length];
    }
    return null;
  };

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '80%' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', width: '16px', flexShrink: 0 }}>
                  #{index + 1}
                </span>
                <div className="scoreboard-avatar-wrap" style={{ width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: p.isAi ? '1px solid var(--color-gold)' : '1px solid var(--color-cyan)' }}>
                  <AvatarImage picId={getAvatarPic(p)} name={p.name} />
                </div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: isSelf ? '#ffffff' : 'rgba(255,255,255,0.8)', display: 'inline-flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                  {isLeader && <span style={{ marginRight: '2px', filter: 'drop-shadow(0 0 4px var(--color-gold-glow))' }}>👑</span>}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                  {isSelf && <span style={{ fontSize: '0.75rem', color: 'var(--color-cyan)', flexShrink: 0 }}>(You)</span>}
                  {p.isAi && <span style={{ fontSize: '0.65rem', color: 'var(--color-gold)', flexShrink: 0 }}>[BOT]</span>}
                </span>
                {isCurrentTurn && <span className="text-cyan animate-pulse" style={{ fontSize: '0.75rem', flexShrink: 0 }}>●</span>}
                {p.declaredTick && <span className="text-red" style={{ fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>[TICK]</span>}
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
