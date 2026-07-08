import React, { useState, useEffect } from 'react';
import type { SanitizedGame } from '../hooks/useWebSocket';
import { processGameEndStats, saveMatchToHistory } from '../utils/statsSystem';
import type { PlayerStats } from '../utils/statsSystem';
import { recordGameResult } from '../utils/dailySystem';
import { AvatarImage } from './AvatarImage';

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
  const isBatterySaver = localStorage.getItem('batterySaverEnabled') === 'true';

  const { players, winnerId } = gameState;
  const hasPlayerLeft = !!(gameState.isMultiplayer || (gameState as any).multiplayer) && players.length <= 1;

  const getAvatarPic = (player: any): string | null => {
    if (player.id === currentPlayerId) {
      const pic = localStorage.getItem('selected_avatar_pic');
      return pic && pic !== 'none' ? pic : null;
    }
    if (player.isAi) {
      const name = player.name || '';
      const numMatch = name.match(/\d+/);
      const index = numMatch ? parseInt(numMatch[0], 10) : (player.id ? player.id.charCodeAt(0) : 0);
      const botAvatars = ['panda', 'fox', 'cat', 'alien', 'monkey', 'unicorn', 'dragon'];
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

    // Guard against empty rounds payload if web socket state has not fully synced yet
    if (!gameState.rounds || gameState.rounds.length === 0) {
      return;
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

    const opponentsList = players
      .filter(p => p.id !== currentPlayerId)
      .map(p => ({
        name: p.name || 'Bot',
        score: p.totalScore,
        isAi: !!p.isAi
      }));

    const finalWinner = players.find(p => p.id === winnerId) || sortedPlayers[0];

    saveMatchToHistory({
      gameId: gameState.gameId,
      placement: myPlacement,
      playerScore: myPlayer.totalScore,
      totalPlayers: totalPlayersCount,
      isMultiplayer: !!(gameState.isMultiplayer || (gameState as any).multiplayer),
      winnerName: finalWinner ? finalWinner.name || 'Bot' : 'Unknown',
      winnerScore: finalWinner ? finalWinner.totalScore : 0,
      isWin: myPlacement === 1,
      opponents: opponentsList,
      roundsCount: gameState.rounds ? gameState.rounds.length : 0,
      roundScores: roundScores,
    });

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
  }, [gameState?.gameId, gameState?.rounds, currentPlayerId, players]);

  const drawPlayersNames = drawPlayers.map(p => p.name).join(' & ');
  const winnerName = winner ? winner.name : '';
  const podium1stName = podium1st ? podium1st.name : '';
  const podium2ndName = podium2nd ? podium2nd.name : '';
  const podium3rdName = podium3rd ? podium3rd.name : '';

  const renderConfetti = () => {
    if (isBatterySaver) return null;
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

      <div className="modal-content glass-panel game-over-modal-content" style={{ zIndex: 20 }}>
        <h1 className="menu-title text-gold game-over-modal-title">🏆 GAME OVER 🏆</h1>

        <p className="modal-subtitle game-over-modal-subtitle" style={{ color: 'rgba(255,255,255,0.9)' }}>
          {isDraw ? (
            <>It's a <strong className="text-gold" style={{ fontSize: '1.45rem' }}>DRAW</strong>! {drawPlayersNames} tied with <strong className="text-gold" style={{ fontSize: '1.45rem' }}>{minScore}</strong> points!</>
          ) : (
            <>Final Winner is <strong className="text-gold" style={{ fontSize: '1.45rem' }}>{winnerName}</strong> with <strong className="text-gold" style={{ fontSize: '1.45rem' }}>{winner?.totalScore}</strong> total points!</>
          )}
        </p>

        {hasPlayerLeft && (
          <div className="glass-panel" style={{ margin: '16px auto', padding: '12px 24px', borderColor: 'var(--color-red)', color: 'var(--color-red)', fontWeight: 800, textShadow: '0 0 5px var(--color-red-glow)', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)' }}>
            <span>⚠️</span> Opponent left the match. Match ended.
          </div>
        )}

        {/* 3D Podium */}
        <div className="podium-container">
          {podium2nd && (
            <div className="podium-stand second">
                  <div className="podium-avatar-wrap" style={{ width: '38px', height: '38px', aspectRatio: '1/1', flexShrink: 0, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px auto', background: 'rgba(255,255,255,0.05)', border: '2px solid var(--color-cyan)' }}>
                    <AvatarImage picId={getAvatarPic(podium2nd)} name={podium2nd.name} />
                  </div>
              <span className="podium-name">{podium2ndName}</span>
              <span className="podium-crown">🥈</span>
              <span className="podium-number">2</span>
              <span className="podium-score">{podium2nd.totalScore} pts</span>
            </div>
          )}
          {podium1st && (
            <div className="podium-stand first">
                  <div className="podium-avatar-wrap" style={{ width: '48px', height: '48px', aspectRatio: '1/1', flexShrink: 0, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px auto', background: 'rgba(255,255,255,0.05)', border: '2px solid var(--color-cyan)' }}>
                    <AvatarImage picId={getAvatarPic(podium1st)} name={podium1st.name} />
                  </div>
              <span className="podium-name" style={{ fontSize: '0.95rem' }}>{podium1stName}</span>
              <span className="podium-crown" style={{ fontSize: '2.2rem', top: '-42px' }}>👑</span>
              <span className="podium-number" style={{ color: 'var(--color-gold)' }}>1</span>
              <span className="podium-score">{podium1st.totalScore} pts</span>
            </div>
          )}
          {podium3rd && (
            <div className="podium-stand third">
                  <div className="podium-avatar-wrap" style={{ width: '34px', height: '34px', aspectRatio: '1/1', flexShrink: 0, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px auto', background: 'rgba(255,255,255,0.05)', border: '2px solid var(--color-cyan)' }}>
                    <AvatarImage picId={getAvatarPic(podium3rd)} name={podium3rd.name} />
                  </div>
              <span className="podium-name">{podium3rdName}</span>
              <span className="podium-crown">🥉</span>
              <span className="podium-number">3</span>
              <span className="podium-score">{podium3rd.totalScore} pts</span>
            </div>
          )}
        </div>

        {/* ── Progression Recap Panel ── */}
        {statsResults && (
          <div className="progression-recap-panel glass-panel">
            <h3 className="recap-section-title" style={{ color: 'var(--color-cyan)' }}>
              Achievements &amp; Stats Update
            </h3>

            <div className="recap-stats-row">
              {/* Placement Card */}
              <div className="recap-stat-card">
                <span className="recap-stat-label">Placement</span>
                <span className="recap-stat-big" style={{ color: 'var(--color-gold)' }}>
                  #{sortedPlayers.findIndex(p => p.id === currentPlayerId) + 1} / {players.length}
                </span>
                <span className="recap-stat-sub">
                  {players.find(p => p.id === currentPlayerId)?.totalScore} total pts
                </span>
              </div>

              {/* Declares Accuracy */}
              <div className="recap-stat-card">
                <span className="recap-stat-label">Declares (Tick)</span>
                <span className="recap-stat-big" style={{ color: 'var(--color-cyan)' }}>
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
                <span className="recap-stat-sub">
                  Correct vs Wrong
                </span>
              </div>

              {/* Win Streak Card */}
              <div className="recap-stat-card">
                <span className="recap-stat-label">Streak</span>
                <span className="recap-stat-big" style={{ color: '#f97316' }}>
                  🔥 {statsResults.winStreakCurrent}
                </span>
                <span className="recap-stat-sub">
                  Best Streak: {statsResults.winStreakBest}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Full Lobby Leaderboard */}
        <div className="results-grid">
          <h3 className="scoreboard-title" style={{ border: 'none', marginBottom: '8px' }}>Lobby Leaderboard</h3>
          {sortedPlayers.map((p, idx) => (
            <div
              key={p.id}
              className={`player-result-row ${p.id === winnerId ? 'winner-row' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span className="result-placement-badge" style={{
                  background: idx === 0 ? 'var(--color-gold)' : 'rgba(255,255,255,0.08)',
                  color: idx === 0 ? '#040814' : 'var(--color-text-muted)',
                }}>
                  {idx + 1}
                </span>
                <div className="scoreboard-avatar-wrap" style={{ width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-cyan)' }}>
                  <AvatarImage picId={getAvatarPic(p)} name={p.name} />
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>{p.name}</span>
                  {p.id === currentPlayerId && <span style={{ color: 'var(--color-cyan)', fontSize: '0.75rem' }}>(You)</span>}
                </span>
              </div>
              <strong className="text-gold" style={{ fontSize: '1.15rem' }}>{p.totalScore} pts</strong>
            </div>
          ))}
        </div>

        {/* Round Breakdown table */}
        {gameState.rounds && gameState.rounds.length > 0 && (
          <div className="round-breakdown-container">
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-cyan)', textShadow: '0 0 10px var(--color-cyan-glow)', marginBottom: '16px', textAlign: 'left', fontWeight: 700 }}>
              Round Breakdown
            </h3>
            <table className="breakdown-table">
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ textAlign: 'left', color: 'var(--color-gold)', fontWeight: 800 }}>Player</th>
                  {gameState.rounds.map((r, i) => (
                    <th key={i} style={{ color: 'var(--color-gold)', fontWeight: 800 }}>R{r.roundNumber}</th>
                  ))}
                  <th style={{ color: 'var(--color-cyan)', textAlign: 'right', fontWeight: 800 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: p.id === winner?.id ? 'rgba(251,191,36,0.02)' : 'transparent' }}>
                    <td style={{ textAlign: 'left', fontWeight: p.id === winner?.id ? 800 : 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="scoreboard-avatar-wrap" style={{ width: '18px', height: '18px', borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-cyan)' }}>
                        <AvatarImage picId={getAvatarPic(p)} name={p.name} />
                      </div>
                      <span>{p.name}</span>
                      {p.id === currentPlayerId && <span style={{ color: 'var(--color-cyan)', fontSize: '0.75rem' }}>(You)</span>}
                    </td>
                      {gameState.rounds.map((r, i) => {
                        const score = r.playerScores ? r.playerScores[p.id] : undefined;
                        return (
                          <td key={i} style={{ color: score === 0 ? 'var(--color-green)' : 'var(--color-text)' }}>
                            {score !== undefined ? score : '-'}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'right', fontWeight: 800, color: p.id === winner?.id ? 'var(--color-gold)' : 'var(--color-text)' }}>
                        {p.totalScore}
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="game-over-buttons">
          <button 
            className="btn-primary" 
            onClick={onPlayAgain} 
            disabled={hasPlayerLeft}
          >
            Play Again 🔄
          </button>
          {hasPlayerLeft ? (
            <button className="btn-secondary" onClick={onMainMenu}>
              Exit Match
            </button>
          ) : (
            <button className="btn-secondary" onClick={() => setShowLeaveConfirm(true)}>
              Main Menu
            </button>
          )}
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

