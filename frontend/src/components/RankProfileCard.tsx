import React, { useEffect, useState } from 'react';
import { getLocalProfile, getRankTier, getNextRankTier, getXpForNextLevel, RANK_TIERS } from '../utils/rankSystem';

export const RankProfileCard: React.FC = () => {
  const [profile, setProfile] = useState(getLocalProfile);
  const [animXp, setAnimXp] = useState(0);

  useEffect(() => {
    setProfile(getLocalProfile());
  }, []);

  const rank = getRankTier(profile.mmr);
  const nextRank = getNextRankTier(profile.mmr);
  const xpNeeded = getXpForNextLevel(profile.level);
  const xpPercent = Math.min((profile.xp / xpNeeded) * 100, 100);
  const rankIndex = RANK_TIERS.findIndex(r => r.name === rank.name);

  // Animate XP bar on mount
  useEffect(() => {
    const t = setTimeout(() => setAnimXp(xpPercent), 80);
    return () => clearTimeout(t);
  }, [xpPercent]);

  // MMR progress within current tier
  const tierMin = rank.minMmr;
  const tierMax = nextRank ? nextRank.minMmr : rank.minMmr + 500;
  const mmrInTier = profile.mmr - tierMin;
  const mmrRange = tierMax - tierMin;
  const mmrPercent = Math.min((mmrInTier / mmrRange) * 100, 100);

  const winRate = profile.gamesPlayed > 0
    ? Math.round((profile.wins / profile.gamesPlayed) * 100)
    : 0;

  return (
    <div className="rank-profile-card" style={{ background: rank.bgGradient }}>
      {/* Rank glow ring */}
      <div className="rank-card-glow" style={{ boxShadow: `0 0 60px ${rank.color}33, inset 0 0 30px ${rank.color}11` }} />

      {/* Top row: crest + info */}
      <div className="rank-card-top">
        <div className="rank-crest-wrapper">
          <div className="rank-crest-ring" style={{ borderColor: rank.color, boxShadow: `0 0 18px ${rank.color}88` }} />
          <span className="rank-crest-icon">{rank.crest}</span>
          {profile.winStreak >= 3 && (
            <span className="rank-streak-flame" title={`${profile.winStreak} win streak!`}>
              🔥
            </span>
          )}
        </div>

        <div className="rank-card-identity">
          <div className="rank-card-name">{profile.name}</div>
          <div className="rank-card-tier" style={{ color: rank.color }}>
            {rank.name}
            <span className="rank-card-mmr">{profile.mmr} MMR</span>
          </div>
          <div className="rank-card-level">
            LVL {profile.level}
            {profile.winStreak >= 2 && (
              <span className="rank-hot-streak" style={{ color: '#f97316' }}>
                🔥 {profile.winStreak} streak
              </span>
            )}
          </div>
        </div>

        {/* Stats mini-grid */}
        <div className="rank-card-stats">
          <div className="rank-stat">
            <span className="rank-stat-val">{profile.gamesPlayed}</span>
            <span className="rank-stat-label">Games</span>
          </div>
          <div className="rank-stat">
            <span className="rank-stat-val" style={{ color: '#34d399' }}>{winRate}%</span>
            <span className="rank-stat-label">Win Rate</span>
          </div>
        </div>
      </div>

      {/* Recent form dots */}
      {profile.recentForm.length > 0 && (
        <div className="rank-recent-form">
          <span className="rank-form-label">Recent</span>
          <div className="rank-form-dots">
            {profile.recentForm.map((result, i) => (
              <span
                key={i}
                className={`form-dot ${result === 'W' ? 'win' : 'loss'}`}
                title={result === 'W' ? 'Win' : 'Loss'}
              />
            ))}
          </div>
        </div>
      )}

      {/* MMR progress bar (within current tier) */}
      <div className="rank-progress-section">
        <div className="rank-bar-header">
          <span className="rank-bar-label">Rank Progress</span>
          <span className="rank-bar-value" style={{ color: rank.color }}>
            {nextRank ? `${mmrInTier} / ${mmrRange}` : 'MAX RANK'}
          </span>
        </div>
        <div className="rank-bar-track">
          <div
            className="rank-bar-fill"
            style={{
              width: `${mmrPercent}%`,
              background: `linear-gradient(90deg, ${rank.color}99, ${rank.color})`,
              boxShadow: `0 0 8px ${rank.color}88`,
            }}
          />
          {/* Tier markers */}
          {[25, 50, 75].map(pct => (
            <div key={pct} className="rank-bar-tick" style={{ left: `${pct}%` }} />
          ))}
        </div>
        <div className="rank-tier-endpoints">
          <span>{rank.name}</span>
          <span>{nextRank ? nextRank.name : '👑 MAX'}</span>
        </div>
      </div>

      {/* XP bar */}
      <div className="rank-xp-section">
        <div className="rank-bar-header">
          <span className="rank-bar-label">Level {profile.level} → {profile.level + 1}</span>
          <span className="rank-bar-value" style={{ color: '#a5f3fc' }}>{profile.xp} / {xpNeeded} XP</span>
        </div>
        <div className="rank-bar-track xp-track">
          <div
            className="rank-bar-fill xp-fill"
            style={{ width: `${animXp}%` }}
          />
        </div>
      </div>

      {/* Rank ladder mini strip */}
      <div className="rank-ladder-strip">
        {RANK_TIERS.map((tier, i) => (
          <div
            key={tier.name}
            className={`rank-ladder-pip ${i === rankIndex ? 'active' : ''} ${i < rankIndex ? 'passed' : ''}`}
            style={{
              background: i <= rankIndex ? tier.color : 'rgba(255,255,255,0.05)',
              boxShadow: i === rankIndex ? `0 0 8px ${tier.color}` : 'none',
            }}
            title={tier.name}
          />
        ))}
      </div>
    </div>
  );
};
