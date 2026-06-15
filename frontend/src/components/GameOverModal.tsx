import React, { useState, useEffect, useRef } from 'react';
import type { SanitizedGame } from '../hooks/useWebSocket';
import { parsePlayerName, getRankTier, getNextRankTier, processGameEnd } from '../utils/rankSystem';

import type { ProcessedResults } from '../utils/rankSystem';

interface GameOverModalProps {
  gameState: SanitizedGame;
  currentPlayerId: string;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

/** Animated integer counter hook */
function useCountUp(target: number, duration = 1400): number {
  const [val, setVal] = useState(0);
  const startRef = useRef<number | null>(null);
  const startValRef = useRef(0);
  useEffect(() => {
    startRef.current = null;
    startValRef.current = 0;
    let raf: number;
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  gameState,
  currentPlayerId,
  onPlayAgain,
  onMainMenu,
}) => {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false);
  const [results, setResults] = useState<ProcessedResults | null>(null);
  const [showRankBurst, setShowRankBurst] = useState(false);
  const [animXp, setAnimXp] = useState(0);

  const { players, winnerId } = gameState;

  const sortedPlayers = [...players].sort((a, b) => a.totalScore - b.totalScore);
  const isDraw = winnerId === 'DRAW';
  const winner = !isDraw ? (players.find(p => p.id === winnerId) || sortedPlayers[0]) : null;

  const minScore = sortedPlayers[0]?.totalScore || 0;
  const drawPlayers = sortedPlayers.filter(p => p.totalScore === minScore);

  const podium1st = sortedPlayers[0];
  const podium2nd = sortedPlayers[1];
  const podium3rd = sortedPlayers[2];

  // Animated MMR counter
  const mmrTarget = results ? Math.abs(results.mmrGained) : 0;
  const mmrAnimated = useCountUp(mmrTarget, 1600);

  useEffect(() => {
    if (!gameState || !currentPlayerId) return;
    if (!gameState.isMultiplayer) {
      setResults(null);
      return;
    }

    const myPlayer = players.find(p => p.id === currentPlayerId);
    if (!myPlayer) return;

    const processedGameId = localStorage.getItem('processedGameId');
    let gameResults: ProcessedResults;

    if (processedGameId === gameState.gameId) {
      try {
        const saved = localStorage.getItem('lastGameResults');
        if (saved) {
          gameResults = JSON.parse(saved);
          gameResults.oldRank = getRankTier(gameResults.oldMmr);
          gameResults.newRank = getRankTier(gameResults.newMmr);
          setResults(gameResults);
          return;
        }
      } catch (e) {
        console.error('Failed to parse lastGameResults', e);
      }
    }

    const myIndex = sortedPlayers.findIndex(p => p.id === currentPlayerId);
    const myPlacement = myIndex !== -1 ? myIndex + 1 : 1;
    const totalPlayersCount = players.length;

    gameResults = processGameEnd(myPlacement, totalPlayersCount);
    setResults(gameResults);

    localStorage.setItem('processedGameId', gameState.gameId);
    localStorage.setItem('lastGameResults', JSON.stringify(gameResults));
  }, [gameState?.gameId, currentPlayerId, players]);

  // Trigger rank-up burst animation after a delay
  useEffect(() => {
    if (results?.rankUp) {
      const t = setTimeout(() => setShowRankBurst(true), 800);
      return () => clearTimeout(t);
    }
  }, [results]);

  // Animate XP bar
  useEffect(() => {
    if (!results) return;
    const xpNeeded = results.newLevel * 100;
    const pct = Math.min((results.newXp / xpNeeded) * 100, 100);
    const t = setTimeout(() => setAnimXp(pct), 600);
    return () => clearTimeout(t);
  }, [results]);

  const drawPlayersNames = drawPlayers.map(p => parsePlayerName(p.name).name).join(' & ');
  const winnerName = winner ? parsePlayerName(winner.name).name : '';
  const podium1stName = podium1st ? parsePlayerName(podium1st.name).name : '';
  const podium2ndName = podium2nd ? parsePlayerName(podium2nd.name).name : '';
  const podium3rdName = podium3rd ? parsePlayerName(podium3rd.name).name : '';

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
      {showRankBurst && <div className="rank-up-burst" onAnimationEnd={() => setShowRankBurst(false)} />}

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
              <span className="podium-name">{podium2ndName}</span>
              <span className="podium-crown">🥈</span>
              <span className="podium-number">2</span>
              <span className="podium-score">{podium2nd.totalScore} pts</span>
            </div>
          )}
          {podium1st && (
            <div className="podium-stand first">
              <span className="podium-name" style={{ fontSize: '0.95rem' }}>{podium1stName}</span>
              <span className="podium-crown" style={{ fontSize: '2.2rem', top: '-42px' }}>👑</span>
              <span className="podium-number" style={{ color: 'var(--color-gold)' }}>1</span>
              <span className="podium-score">{podium1st.totalScore} pts</span>
            </div>
          )}
          {podium3rd && (
            <div className="podium-stand third">
              <span className="podium-name">{podium3rdName}</span>
              <span className="podium-crown">🥉</span>
              <span className="podium-number">3</span>
              <span className="podium-score">{podium3rd.totalScore} pts</span>
            </div>
          )}
        </div>

        {/* ── Progression Recap Panel ── */}
        {results && (
          <div className="progression-recap-panel glass-panel">

            {/* Rank-up / Rank-down banner */}
            {results.rankUp && (
              <div className="rank-change-banner rank-up-banner">
                <span>🎉 RANK UP!</span>
                <span style={{ color: results.newRank.color, fontWeight: 900 }}>
                  {results.oldRank.name} → {results.newRank.name}
                </span>
              </div>
            )}
            {results.rankDown && (
              <div className="rank-change-banner rank-down-banner">
                <span>📉 Rank down</span>
                <span>{results.oldRank.name} → {results.newRank.name}</span>
              </div>
            )}
            {results.mmrProtected && (
              <div className="rank-change-banner protection-banner">
                🛡️ Rank protection activated — loss halved!
              </div>
            )}

            <h3 className="recap-section-title">Your Progression</h3>

            <div className="recap-stats-row">
              {/* MMR animated card */}
              <div className="recap-stat-card">
                <span className="recap-stat-label">Rank MMR</span>
                <span
                  className="recap-stat-big"
                  style={{ color: results.mmrGained >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}
                >
                  {results.mmrGained >= 0 ? '+' : '-'}{mmrAnimated}
                </span>
                <span className="recap-stat-sub">{results.oldMmr} → {results.newMmr}</span>
              </div>

              {/* Rank tier card */}
              <div className="recap-stat-card" style={{ borderColor: results.newRank.color + '44' }}>
                <span className="recap-stat-label">Rank Tier</span>
                <span
                  className="recap-stat-big"
                  style={{ color: results.newRank.color, textShadow: `0 0 14px ${results.newRank.color}` }}
                >
                  {results.newRank.crest} {results.newRank.name}
                </span>
                {results.rankUp
                  ? <span className="badge-alert rank-up-pulse">RANK UP! ✨</span>
                  : <span className="recap-stat-sub">Current Standing</span>
                }
              </div>

              {/* XP / Level card */}
              <div className="recap-stat-card">
                <span className="recap-stat-label">Level {results.newLevel}</span>
                <span className="recap-stat-big" style={{ color: 'var(--color-gold)' }}>+{results.xpGained} XP</span>
                {results.levelUp
                  ? <span className="badge-alert level-up-pulse">LEVEL UP! 🎉</span>
                  : <span className="recap-stat-sub">To Lvl {results.newLevel + 1}</span>
                }
              </div>
            </div>

            {/* Win streak row */}
            {results.newWinStreak >= 2 && (
              <div className="recap-streak-row">
                {'🔥'.repeat(Math.min(results.newWinStreak, 5))}
                <span>{results.newWinStreak} win streak!</span>
              </div>
            )}

            {/* XP Progress bar */}
            <div className="recap-bar-section">
              <div className="recap-bar-header">
                <span>XP Progress</span>
                <span style={{ color: 'var(--color-cyan)' }}>{results.newXp} / {results.newLevel * 100} XP</span>
              </div>
              <div className="recap-bar-track">
                <div className="recap-xp-fill" style={{ width: `${animXp}%` }} />
              </div>
            </div>

            {/* MMR within tier bar */}
            <div className="recap-bar-section" style={{ marginTop: '10px' }}>
              <div className="recap-bar-header">
                <span>Rank Progress</span>
                <span style={{ color: results.newRank.color }}>
                  {results.newMmr - results.newRank.minMmr} pts in tier
                </span>
              </div>
              <div className="recap-bar-track">
                <div
                  className="recap-mmr-fill"
                  style={{
                    width: (() => {
                      const next = getNextRankTier(results.newMmr);
                      if (!next) return '100%';
                      const pct = Math.min(
                        ((results.newMmr - results.newRank.minMmr) / (next.minMmr - results.newRank.minMmr)) * 100,
                        100
                      );
                      return `${pct}%`;
                    })(),
                    background: `linear-gradient(90deg, ${results.newRank.color}77, ${results.newRank.color})`,
                    boxShadow: `0 0 10px ${results.newRank.color}88`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Full Lobby Leaderboard */}
        <div className="results-grid" style={{ marginTop: '32px' }}>
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
                  <span className="result-placement-badge" style={{
                    background: idx === 0 ? 'var(--color-gold)' : 'rgba(255,255,255,0.08)',
                    color: idx === 0 ? '#040814' : 'var(--color-text-muted)',
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {!p.isAi && <span style={{ fontSize: '0.85rem' }} title={rank.name}>{rank.badge}</span>}
                    <span>{parsedName}</span>
                    {p.id === currentPlayerId && <span style={{ color: 'var(--color-cyan)', fontSize: '0.75rem' }}>(You)</span>}
                    {p.isAi && <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)' }}>[BOT]</span>}
                    {!p.isAi && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '4px' }}>LVL {level}</span>}
                  </span>
                </div>
                <strong className="text-gold" style={{ fontSize: '1.15rem' }}>{p.totalScore} pts</strong>
              </div>
            );
          })}
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
                {sortedPlayers.map(p => {
                  const { name: parsedName } = parsePlayerName(p.name);
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: p.id === winner?.id ? 'rgba(251,191,36,0.02)' : 'transparent' }}>
                      <td style={{ textAlign: 'left', padding: '12px 14px', fontSize: '0.9rem', fontWeight: p.id === winner?.id ? 800 : 500 }}>
                        {parsedName}{' '}
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
                  );
                })}
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

