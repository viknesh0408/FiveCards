import React, { useState, useEffect } from 'react';
import type { SanitizedGame } from '../hooks/useWebSocket';
import { parsePlayerName, getRankTier } from '../utils/rankSystem';
import type { ProcessedResults } from '../utils/rankSystem';

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
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false);
  const [results, setResults] = useState<ProcessedResults | null>(null);

  const { players, winnerId } = gameState;

  // Sort players by total score ascending (lowest score is 1st place)
  const sortedPlayers = [...players].sort((a, b) => a.totalScore - b.totalScore);
  const isDraw = winnerId === "DRAW";
  const winner = !isDraw ? (players.find(p => p.id === winnerId) || sortedPlayers[0]) : null;

  // Get all players with the lowest score (for draw display)
  const minScore = sortedPlayers[0]?.totalScore || 0;
  const drawPlayers = sortedPlayers.filter(p => p.totalScore === minScore);

  // Map podium slots (1st, 2nd, 3rd)
  const podium1st = sortedPlayers[0];
  const podium2nd = sortedPlayers[1];
  const podium3rd = sortedPlayers[2];

  useEffect(() => {
    if (!gameState || !currentPlayerId) return;

    const myPlayer = players.find(p => p.id === currentPlayerId) as any;
    if (!myPlayer) return;

    const serverResults: ProcessedResults = {
      xpGained: myPlayer.xpGained ?? 0,
      mmrGained: myPlayer.mmrGained ?? 0,
      oldLevel: myPlayer.oldLevel ?? 1,
      newLevel: myPlayer.newLevel ?? 1,
      oldXp: myPlayer.oldXp ?? 0,
      newXp: myPlayer.newXp ?? 0,
      oldMmr: myPlayer.oldMmr ?? 0,
      newMmr: myPlayer.newMmr ?? 0,
      oldRank: getRankTier(myPlayer.oldMmr ?? 0),
      newRank: getRankTier(myPlayer.newMmr ?? 0),
      levelUp: myPlayer.levelUp ?? false,
      rankUp: myPlayer.rankUp ?? false
    };

    setResults(serverResults);

    // Sync client local storage with database-calculated profile results
    localStorage.setItem('playerLevel', serverResults.newLevel.toString());
    localStorage.setItem('playerXp', serverResults.newXp.toString());
    localStorage.setItem('playerMmr', serverResults.newMmr.toString());
  }, [gameState?.gameId, currentPlayerId, players]);

  // Decode names
  const drawPlayersNames = drawPlayers.map(p => parsePlayerName(p.name).name).join(' & ');
  const winnerName = winner ? parsePlayerName(winner.name).name : '';

  const podium1stName = podium1st ? parsePlayerName(podium1st.name).name : '';
  const podium2ndName = podium2nd ? parsePlayerName(podium2nd.name).name : '';
  const podium3rdName = podium3rd ? parsePlayerName(podium3rd.name).name : '';

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
          {isDraw ? (
            <>It's a <strong className="text-gold" style={{ fontSize: '1.45rem' }}>DRAW</strong>! {drawPlayersNames} tied with <strong className="text-gold" style={{ fontSize: '1.45rem' }}>{minScore}</strong> points!</>
          ) : (
            <>Final Winner is <strong className="text-gold" style={{ fontSize: '1.45rem' }}>{winnerName}</strong> with <strong className="text-gold" style={{ fontSize: '1.45rem' }}>{winner?.totalScore}</strong> total points!</>
          )}
        </p>

        {/* 3D Podium View */}
        <div className="podium-container">
          {/* 2nd Place */}
          {podium2nd && (
            <div className="podium-stand second">
              <span className="podium-name">{podium2ndName}</span>
              <span className="podium-crown">🥈</span>
              <span className="podium-number">2</span>
              <span className="podium-score">{podium2nd.totalScore} pts</span>
            </div>
          )}

          {/* 1st Place */}
          {podium1st && (
            <div className="podium-stand first">
              <span className="podium-name" style={{ fontSize: '0.95rem' }}>
                {podium1stName}
              </span>
              <span className="podium-crown" style={{ fontSize: '2.2rem', top: '-42px' }}>👑</span>
              <span className="podium-number" style={{ color: 'var(--color-gold)' }}>1</span>
              <span className="podium-score">{podium1st.totalScore} pts</span>
            </div>
          )}

          {/* 3rd Place */}
          {podium3rd && (
            <div className="podium-stand third">
              <span className="podium-name">{podium3rdName}</span>
              <span className="podium-crown">🥉</span>
              <span className="podium-number">3</span>
              <span className="podium-score">{podium3rd.totalScore} pts</span>
            </div>
          )}
        </div>

        {/* Progression Recap Panel */}
        {results && (
          <div className="progression-recap-panel glass-panel" style={{ marginTop: '24px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-cyan)', textShadow: '0 0 10px var(--color-cyan-glow)', marginBottom: '16px', fontWeight: 700 }}>
              Rank & XP Progression
            </h3>
            
            <div className="recap-stats-row" style={{ display: 'flex', gap: '16px', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap' }}>
              {/* MMR Gained/Lost */}
              <div className="recap-stat-card" style={{ flex: '1 1 120px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rank MMR</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, margin: '6px 0', color: results.mmrGained >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                  {results.mmrGained >= 0 ? `+${results.mmrGained}` : results.mmrGained} MMR
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {results.oldMmr} → {results.newMmr}
                </span>
              </div>

              {/* Rank Badge Indicator */}
              <div className="recap-stat-card" style={{ flex: '1 1 120px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rank Tier</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, margin: '6px 0', color: results.newRank.color, textShadow: `0 0 10px ${results.newRank.color}`, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {results.newRank.badge} {results.newRank.name}
                </span>
                {results.rankUp ? (
                  <span className="badge-alert rank-up-pulse" style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(234, 179, 8, 0.15)', color: 'var(--color-gold)', borderRadius: '4px', border: '1px solid var(--color-gold)', fontWeight: 800 }}>RANK UP! ✨</span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Current Standing</span>
                )}
              </div>

              {/* Level / XP Gained */}
              <div className="recap-stat-card" style={{ flex: '1 1 120px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Level {results.newLevel}</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, margin: '6px 0', color: 'var(--color-gold)' }}>
                  +{results.xpGained} XP
                </span>
                {results.levelUp ? (
                  <span className="badge-alert level-up-pulse" style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-green)', borderRadius: '4px', border: '1px solid var(--color-green)', fontWeight: 800 }}>LEVEL UP! 🎉</span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>To Lvl {results.newLevel + 1}</span>
                )}
              </div>
            </div>

            {/* XP Progression Bar */}
            <div className="recap-xp-container" style={{ textAlign: 'left' }}>
              <div className="recap-xp-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px', fontWeight: 600 }}>
                <span>XP Progress</span>
                <span style={{ color: 'var(--color-cyan)' }}>{results.newXp} / {results.newLevel * 100} XP</span>
              </div>
              <div className="recap-xp-bar-wrapper" style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div 
                  className="recap-xp-bar-fill animated-bar"
                  style={{ 
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--color-cyan), var(--color-cyan-glow))',
                    width: `${Math.min((results.newXp / (results.newLevel * 100)) * 100, 100)}%`,
                    transition: 'width 1.5s ease-out',
                    boxShadow: '0 0 10px var(--color-cyan-glow)'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Full Ranking List */}
        <div className="results-grid" style={{ marginTop: '40px' }}>
          <h3 className="scoreboard-title" style={{ border: 'none', marginBottom: '8px' }}>Lobby Leaderboard</h3>
          {sortedPlayers.map((p, idx) => {
            const { name: parsedName, level, mmr } = parsePlayerName(p.name);
            const rank = getRankTier(mmr);
            return (
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.85rem' }} title={rank.name}>{rank.badge}</span>
                    <span>{parsedName}</span>
                    {p.id === currentPlayerId && <span style={{ color: 'var(--color-cyan)', fontSize: '0.75rem' }}>(You)</span>}
                    {p.isAi && <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)' }}>[BOT]</span>}
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '4px' }}>LVL {level}</span>
                  </span>
                </div>
                <strong className="text-gold" style={{ fontSize: '1.15rem' }}>{p.totalScore} pts</strong>
              </div>
            );
          })}
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
                {sortedPlayers.map(p => {
                  const { name: parsedName } = parsePlayerName(p.name);
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: p.id === winner?.id ? 'rgba(251, 191, 36, 0.02)' : 'transparent' }}>
                      <td style={{ textAlign: 'left', padding: '12px 14px', fontSize: '0.9rem', fontWeight: p.id === winner?.id ? 800 : 500 }}>
                        {parsedName} {p.id === currentPlayerId && <span style={{ color: 'var(--color-cyan)', fontSize: '0.75rem' }}>(You)</span>} {p.isAi && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>[BOT]</span>}
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
                )})}
              </tbody>
            </table>
          </div>
        )}

        <div className="menu-options" style={{ marginTop: '32px', display: 'flex', flexDirection: 'row', gap: '16px', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={onPlayAgain} style={{ flex: 1 }}>
            Play Again 🔄
          </button>
          <button className="btn-secondary" onClick={() => setShowLeaveConfirm(true)} style={{ flex: 1 }}>
            Main Menu
          </button>
        </div>
      </div>

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '320px', textAlign: 'center', padding: '24px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.4rem' }}>Leave Game?</h2>
            <p style={{ marginBottom: '24px', color: 'var(--color-text-muted)', fontSize: '1rem' }}>
              Are you sure you want to leave the game?
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
                  onMainMenu();
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
