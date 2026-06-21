import React, { useState, useEffect } from 'react';
import type { SanitizedGame } from '../hooks/useWebSocket';
import { processGameEndStats } from '../utils/statsSystem';
import type { PlayerStats } from '../utils/statsSystem';
import { recordGameResult } from '../utils/dailySystem';

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
  const [statsResults, setStatsResults] = useState<PlayerStats | null>(null);

  const { players, winnerId } = gameState;

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

  const sortedPlayers = [...players].sort((a, b) => a.totalScore - b.totalScore);
  const isDraw = winnerId === 'DRAW';
  const winner = !isDraw ? (players.find(p => p.id === winnerId) || sortedPlayers[0]) : null;

  const minScore = sortedPlayers[0]?.totalScore || 0;
  const drawPlayers = sortedPlayers.filter(p => p.totalScore === minScore);

  const podium1st = sortedPlayers[0];
  const podium2nd = sortedPlayers[1];
  const podium3rd = sortedPlayers[2];

  // Process match statistics at the end of the game
  useEffect(() => {
    if (!gameState || !currentPlayerId) return;
    const myPlayer = players.find(p => p.id === currentPlayerId);
    if (!myPlayer) return;

    const processedGameId = localStorage.getItem('processedGameId');
    let gameStats: PlayerStats;

    if (processedGameId === gameState.gameId) {
      try {
        const saved = localStorage.getItem('lastGameStats');
        if (saved) {
          gameStats = JSON.parse(saved);
          setStatsResults(gameStats);
          return;
        }
      } catch (e) {
        console.error('Failed to parse lastGameStats', e);
      }
    }

    const myIndex = sortedPlayers.findIndex(p => p.id === currentPlayerId);
    const myPlacement = myIndex !== -1 ? myIndex + 1 : 1;
    const totalPlayersCount = players.length;

    // Analyze completed rounds to extract scores and declare counts for the player
    let declaresCorrect = 0;
    let declaresWrong = 0;
    let roundScores: number[] = [];

    if (gameState.rounds) {
      gameState.rounds.forEach(r => {
        const score = r.playerScores ? r.playerScores[currentPlayerId] : undefined;
        if (score !== undefined) {
          roundScores.push(score);
        }
        if (r.tickPlayerId === currentPlayerId) {
          const scoreForDeclare = r.playerScores ? r.playerScores[currentPlayerId] : 0;
          if (scoreForDeclare === 80) {
            declaresWrong++;
          } else if (scoreForDeclare === 0) {
            declaresCorrect++;
          }
        }
      });
    }

    gameStats = processGameEndStats(
      myPlacement,
      totalPlayersCount,
      gameState.isMultiplayer || (gameState as any).multiplayer,
      roundScores,
      declaresCorrect,
      declaresWrong
    );
    setStatsResults(gameStats);

    // Update daily mission progress for this game
    recordGameResult(
      {
        isWin: myPlacement === 1,
        isTop2: myIndex <= 1,
        correctTicks: declaresCorrect,
        winScore: myPlayer.totalScore,
      },
      gameState.gameId
    );

    localStorage.setItem('processedGameId', gameState.gameId);
    localStorage.setItem('lastGameStats', JSON.stringify(gameStats));
  }, [gameState?.gameId, currentPlayerId, players]);

  const drawPlayersNames = drawPlayers.map(p => p.name).join(' & ');
  const winnerName = winner ? winner.name : '';
  const podium1stName = podium1st ? podium1st.name : '';
  const podium2ndName = podium2nd ? podium2nd.name : '';
  const podium3rdName = podium3rd ? podium3rd.name : '';

  const renderConfetti = () => {
    const colors = ['#22d3ee', '#fbbf24', '#f87171', '#34d399', '#c084fc'];
    return (
      <div className="confetti-wrapper">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${3 + Math.random() * 3}s`,
              width: `${6 + Math.random() * 6}px`,
              height: Math.random() > 0.5 ? '10px' : '18px',
              background: colors[i % colors.length],
              borderRadius: '3px',
            }}
          />
        ))}
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

        {/* 3D Podium */}
        <div className="podium-container">
          {podium2nd && (
            <div className="podium-stand second">
              {(() => {
                const pic = getAvatarPic(podium2nd);
                return (
                  <div className="podium-avatar-wrap" style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px auto', background: 'rgba(255,255,255,0.05)', border: podium2nd.isAi ? '2px solid var(--color-gold)' : '2px solid var(--color-cyan)', fontSize: '0.85rem', fontWeight: 800 }}>
                    {pic ? (
                      <img src={`/avatars/${pic}.png`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (podium2nd.name || 'P')[0].toUpperCase()
                    )}
                  </div>
                );
              })()}
              <span className="podium-name">{podium2ndName}</span>
              <span className="podium-crown">🥈</span>
              <span className="podium-number">2</span>
              <span className="podium-score">{podium2nd.totalScore} pts</span>
            </div>
          )}
          {podium1st && (
            <div className="podium-stand first">
              {(() => {
                const pic = getAvatarPic(podium1st);
                return (
                  <div className="podium-avatar-wrap" style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px auto', background: 'rgba(255,255,255,0.05)', border: podium1st.isAi ? '2px solid var(--color-gold)' : '2px solid var(--color-cyan)', fontSize: '1rem', fontWeight: 800 }}>
                    {pic ? (
                      <img src={`/avatars/${pic}.png`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (podium1st.name || 'P')[0].toUpperCase()
                    )}
                  </div>
                );
              })()}
              <span className="podium-name" style={{ fontSize: '0.95rem' }}>{podium1stName}</span>
              <span className="podium-crown" style={{ fontSize: '2.2rem', top: '-42px' }}>👑</span>
              <span className="podium-number" style={{ color: 'var(--color-gold)' }}>1</span>
              <span className="podium-score">{podium1st.totalScore} pts</span>
            </div>
          )}
          {podium3rd && (
            <div className="podium-stand third">
              {(() => {
                const pic = getAvatarPic(podium3rd);
                return (
                  <div className="podium-avatar-wrap" style={{ width: '34px', height: '34px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px auto', background: 'rgba(255,255,255,0.05)', border: podium3rd.isAi ? '2px solid var(--color-gold)' : '2px solid var(--color-cyan)', fontSize: '0.8rem', fontWeight: 800 }}>
                    {pic ? (
                      <img src={`/avatars/${pic}.png`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (podium3rd.name || 'P')[0].toUpperCase()
                    )}
                  </div>
                );
              })()}
              <span className="podium-name">{podium3rdName}</span>
              <span className="podium-crown">🥉</span>
              <span className="podium-number">3</span>
              <span className="podium-score">{podium3rd.totalScore} pts</span>
            </div>
          )}
        </div>

        {/* ── Progression Recap Panel ── */}
        {statsResults && (
          <div className="progression-recap-panel glass-panel" style={{ padding: '24px' }}>
            <h3 className="recap-section-title" style={{ color: 'var(--color-cyan)', fontSize: '1.2rem', marginBottom: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Achievements &amp; Stats Update
            </h3>

            <div className="recap-stats-row" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              {/* Placement Card */}
              <div className="recap-stat-card" style={{ flex: 1, minWidth: '130px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                <span className="recap-stat-label" style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Placement</span>
                <span className="recap-stat-big" style={{ display: 'block', fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-gold)' }}>
                  #{sortedPlayers.findIndex(p => p.id === currentPlayerId) + 1} / {players.length}
                </span>
                <span className="recap-stat-sub" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {players.find(p => p.id === currentPlayerId)?.totalScore} total pts
                </span>
              </div>

              {/* Declares Accuracy */}
              <div className="recap-stat-card" style={{ flex: 1, minWidth: '130px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                <span className="recap-stat-label" style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Declares (Tick)</span>
                <span className="recap-stat-big" style={{ display: 'block', fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-cyan)' }}>
                  {(() => {
                    let decCorrect = 0;
                    let decWrong = 0;
                    if (gameState.rounds) {
                      gameState.rounds.forEach(r => {
                        if (r.tickPlayerId === currentPlayerId) {
                          const score = r.playerScores ? r.playerScores[currentPlayerId] : 0;
                          if (score === 80) decWrong++;
                          else if (score === 0) decCorrect++;
                        }
                      });
                    }
                    return `${decCorrect}W - ${decWrong}L`;
                  })()}
                </span>
                <span className="recap-stat-sub" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Correct vs Wrong
                </span>
              </div>

              {/* Win Streak Card */}
              <div className="recap-stat-card" style={{ flex: 1, minWidth: '130px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                <span className="recap-stat-label" style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Streak</span>
                <span className="recap-stat-big" style={{ display: 'block', fontSize: '1.8rem', fontWeight: 900, color: '#f97316' }}>
                  🔥 {statsResults.winStreakCurrent}
                </span>
                <span className="recap-stat-sub" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Best Streak: {statsResults.winStreakBest}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Full Lobby Leaderboard */}
        <div className="results-grid" style={{ marginTop: '32px' }}>
          <h3 className="scoreboard-title" style={{ border: 'none', marginBottom: '8px' }}>Lobby Leaderboard</h3>
          {sortedPlayers.map((p, idx) => (
            <div
              key={p.id}
              className={`player-result-row ${p.id === winnerId ? 'winner-row' : ''}`}
              style={{ padding: '14px 20px', margin: '6px 0' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span className="result-placement-badge" style={{
                  background: idx === 0 ? 'var(--color-gold)' : 'rgba(255,255,255,0.08)',
                  color: idx === 0 ? '#040814' : 'var(--color-text-muted)',
                }}>
                  {idx + 1}
                </span>
                {(() => {
                  const pic = getAvatarPic(p);
                  if (pic) {
                    return (
                      <div className="scoreboard-avatar-wrap" style={{ width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: p.isAi ? '1px solid var(--color-gold)' : '1px solid var(--color-cyan)' }}>
                        <img src={`/avatars/${pic}.png`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    );
                  }
                  return (
                    <div className="scoreboard-avatar-wrap" style={{ width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: p.isAi ? '1px solid var(--color-gold)' : '1px solid var(--color-cyan)', fontSize: '0.65rem', fontWeight: 800 }}>
                      {p.name ? p.name.substring(0, 1).toUpperCase() : 'P'}
                    </div>
                  );
                })()}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>{p.name}</span>
                  {p.id === currentPlayerId && <span style={{ color: 'var(--color-cyan)', fontSize: '0.75rem' }}>(You)</span>}
                  {p.isAi && <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)' }}>[BOT]</span>}
                </span>
              </div>
              <strong className="text-gold" style={{ fontSize: '1.15rem' }}>{p.totalScore} pts</strong>
            </div>
          ))}
        </div>

        {/* Round Breakdown table */}
        {gameState.rounds && gameState.rounds.length > 0 && (
          <div style={{ marginTop: '32px', overflowX: 'auto', width: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-cyan)', textShadow: '0 0 10px var(--color-cyan-glow)', marginBottom: '16px', textAlign: 'left', fontWeight: 700 }}>
              Round Breakdown
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '450px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--color-gold)', fontSize: '0.9rem', fontWeight: 800 }}>Player</th>
                  {gameState.rounds.map((r, i) => (
                    <th key={i} style={{ padding: '10px', color: 'var(--color-gold)', fontSize: '0.9rem', fontWeight: 800 }}>R{r.roundNumber}</th>
                  ))}
                  <th style={{ padding: '10px 14px', color: 'var(--color-cyan)', textAlign: 'right', fontSize: '0.9rem', fontWeight: 800 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: p.id === winner?.id ? 'rgba(251,191,36,0.02)' : 'transparent' }}>
                    <td style={{ textAlign: 'left', padding: '12px 14px', fontSize: '0.9rem', fontWeight: p.id === winner?.id ? 800 : 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {(() => {
                        const pic = getAvatarPic(p);
                        if (pic) {
                          return (
                            <div className="scoreboard-avatar-wrap" style={{ width: '18px', height: '18px', borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: p.isAi ? '1px solid var(--color-gold)' : '1px solid var(--color-cyan)' }}>
                              <img src={`/avatars/${pic}.png`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          );
                        }
                        return (
                          <div className="scoreboard-avatar-wrap" style={{ width: '18px', height: '18px', borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: p.isAi ? '1px solid var(--color-gold)' : '1px solid var(--color-cyan)', fontSize: '0.55rem', fontWeight: 800 }}>
                            {p.name ? p.name.substring(0, 1).toUpperCase() : 'P'}
                          </div>
                        );
                      })()}
                      <span>{p.name}</span>
                      {p.id === currentPlayerId && <span style={{ color: 'var(--color-cyan)', fontSize: '0.75rem' }}>(You)</span>}
                      {p.isAi && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}> [BOT]</span>}
                    </td>
                      {gameState.rounds.map((r, i) => {
                        const score = r.playerScores ? r.playerScores[p.id] : undefined;
                        return (
                          <td key={i} style={{ padding: '12px', fontSize: '0.9rem', color: score === 0 ? 'var(--color-green)' : 'var(--color-text)' }}>
                            {score !== undefined ? score : '-'}
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
          <button className="btn-primary" onClick={onPlayAgain} style={{ flex: 1 }}>Play Again 🔄</button>
          <button className="btn-secondary" onClick={() => setShowLeaveConfirm(true)} style={{ flex: 1 }}>Main Menu</button>
        </div>
      </div>

      {showLeaveConfirm && (
        <div className="modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '320px', textAlign: 'center', padding: '24px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.4rem' }}>Leave Game?</h2>
            <p style={{ marginBottom: '24px', color: 'var(--color-text-muted)', fontSize: '1rem' }}>
              Are you sure you want to leave the game?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1, padding: '14px 20px', fontSize: '1rem' }}>Cancel</button>
              <button className="btn-danger" onClick={() => { setShowLeaveConfirm(false); onMainMenu(); }} style={{ flex: 1, padding: '14px 20px', fontSize: '1rem' }}>Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

