import React from 'react';
import type { SanitizedGame } from '../hooks/useWebSocket';

interface GameOverModalProps {
  gameState: SanitizedGame;
  currentPlayerId: string;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  gameState,
  currentPlayerId,
  onPlayAgain,
  onMainMenu,
}) => {
  const { players, winnerId } = gameState;

  // Sort players by total score ascending (lowest score is 1st place)
  const sortedPlayers = [...players].sort((a, b) => a.totalScore - b.totalScore);
  const winner = players.find(p => p.id === winnerId) || sortedPlayers[0];

  // Map podium slots (1st, 2nd, 3rd)
  const podium1st = sortedPlayers[0];
  const podium2nd = sortedPlayers[1];
  const podium3rd = sortedPlayers[2];

  // Generate random confetti pieces for winner celebration
  const renderConfetti = () => {
    const confettiCount = 60;
    const colors = ['#22d3ee', '#fbbf24', '#f87171', '#34d399', '#c084fc'];
    return (
      <div className="confetti-wrapper">
        {Array.from({ length: confettiCount }).map((_, i) => {
          const left = `${Math.random() * 100}%`;
          const delay = `${Math.random() * 4}s`;
          const duration = `${3 + Math.random() * 3}s`;
          const size = `${6 + Math.random() * 6}px`;
          const aspect = Math.random() > 0.5 ? '10px' : '18px';
          const bg = colors[i % colors.length];
          return (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left,
                animationDelay: delay,
                animationDuration: duration,
                width: size,
                height: aspect,
                background: bg,
                borderRadius: '3px',
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="modal-overlay">
      {renderConfetti()}
      
      <div className="modal-content glass-panel" style={{ width: '600px', zIndex: 20 }}>
        <h1 className="menu-title text-gold" style={{ fontSize: '2.8rem' }}>🏆 GAME OVER 🏆</h1>
        
        <p className="modal-subtitle" style={{ fontSize: '1.25rem', marginTop: '8px', color: 'rgba(255,255,255,0.9)' }}>
          Final Winner is <strong className="text-gold" style={{ fontSize: '1.45rem' }}>{winner?.name}</strong> 
          with <strong className="text-gold" style={{ fontSize: '1.45rem' }}>{winner?.totalScore}</strong> total points!
        </p>

        {/* 3D Podium View */}
        <div className="podium-container">
          {/* 2nd Place */}
          {podium2nd && (
            <div className="podium-stand second">
              <span className="podium-name">{podium2nd.name}</span>
              <span className="podium-crown">🥈</span>
              <span className="podium-number">2</span>
              <span className="podium-score">{podium2nd.totalScore} pts</span>
            </div>
          )}

          {/* 1st Place */}
          {podium1st && (
            <div className="podium-stand first">
              <span className="podium-name" style={{ fontSize: '0.95rem' }}>
                {podium1st.name}
              </span>
              <span className="podium-crown" style={{ fontSize: '2.2rem', top: '-42px' }}>👑</span>
              <span className="podium-number" style={{ color: 'var(--color-gold)' }}>1</span>
              <span className="podium-score">{podium1st.totalScore} pts</span>
            </div>
          )}

          {/* 3rd Place */}
          {podium3rd && (
            <div className="podium-stand third">
              <span className="podium-name">{podium3rd.name}</span>
              <span className="podium-crown">🥉</span>
              <span className="podium-number">3</span>
              <span className="podium-score">{podium3rd.totalScore} pts</span>
            </div>
          )}
        </div>

        {/* Full Ranking List */}
        <div className="results-grid" style={{ marginTop: '40px' }}>
          <h3 className="scoreboard-title" style={{ border: 'none', marginBottom: '8px' }}>Lobby Leaderboard</h3>
          {sortedPlayers.map((p, idx) => (
            <div 
              key={p.id} 
              className={`player-result-row ${p.id === winnerId ? 'winner-row' : ''}`}
              style={{ padding: '14px 20px', margin: '6px 0' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: '24px', 
                    height: '24px',
                    borderRadius: '50%',
                    background: idx === 0 ? 'var(--color-gold)' : 'rgba(255,255,255,0.08)',
                    color: idx === 0 ? '#040814' : 'var(--color-text-muted)',
                    fontWeight: 800,
                    fontSize: '0.8rem'
                  }}
                >
                  {idx + 1}
                </span>
                <span>
                  {p.name} {p.id === currentPlayerId && <span style={{ color: 'var(--color-cyan)', fontSize: '0.75rem' }}>(You)</span>} {p.isAi && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>[BOT]</span>}
                </span>
              </div>
              <strong className="text-gold" style={{ fontSize: '1.15rem' }}>{p.totalScore} pts</strong>
            </div>
          ))}
        </div>

        {/* Round by Round Score Table */}
        {gameState.rounds && gameState.rounds.length > 0 && (
          <div style={{ marginTop: '32px', overflowX: 'auto', width: '100%', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-cyan)', textShadow: '0 0 10px var(--color-cyan-glow)', marginBottom: '16px', textAlign: 'left', fontWeight: 700 }}>
              Round Breakdown
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '450px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--color-gold)', fontSize: '0.9rem', fontWeight: 800 }}>Player</th>
                  {gameState.rounds.map((r, i) => (
                    <th key={i} style={{ padding: '10px', color: 'var(--color-gold)', fontSize: '0.9rem', fontWeight: 800 }}>R{r.roundNumber}</th>
                  ))}
                  <th style={{ padding: '10px 14px', color: 'var(--color-cyan)', textAlign: 'right', fontSize: '0.9rem', fontWeight: 800 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: p.id === winner?.id ? 'rgba(251, 191, 36, 0.02)' : 'transparent' }}>
                    <td style={{ textAlign: 'left', padding: '12px 14px', fontSize: '0.9rem', fontWeight: p.id === winner?.id ? 800 : 500 }}>
                      {p.name} {p.id === currentPlayerId && <span style={{ color: 'var(--color-cyan)', fontSize: '0.75rem' }}>(You)</span>} {p.isAi && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>[BOT]</span>}
                    </td>
                    {gameState.rounds.map((r, i) => {
                      const score = r.playerScores ? r.playerScores[p.id] : undefined;
                      const scoreStr = score !== undefined ? `${score}` : '-';
                      return (
                        <td key={i} style={{ padding: '12px', fontSize: '0.9rem', color: score === 0 ? 'var(--color-green)' : 'var(--color-text)' }}>
                          {scoreStr}
                        </td>
                      );
                    })}
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: p.id === winner?.id ? 'var(--color-gold)' : 'var(--color-text)' }}>
                      {p.totalScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="menu-options" style={{ marginTop: '32px', display: 'flex', flexDirection: 'row', gap: '16px', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={onPlayAgain} style={{ flex: 1 }}>
            Play Again 🔄
          </button>
          <button className="btn-secondary" onClick={onMainMenu} style={{ flex: 1 }}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
