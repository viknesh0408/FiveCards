import React, { useState, useEffect } from 'react';
import {
  initDailyState,
  claimDailyReward,
  claimMission,
  getDailyRewardForDay,
  DAILY_REWARDS,
} from '../utils/dailySystem';
import type { DailyState, DailyReward } from '../utils/dailySystem';

interface DailyPanelProps {
  onBack: () => void;
  onStateChange?: () => void; // notify parent (e.g. to refresh notification badge)
}

export const DailyPanel: React.FC<DailyPanelProps> = ({ onBack, onStateChange }) => {
  const [state, setState] = useState<DailyState>(() => initDailyState());
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    setState(initDailyState());
  }, []);

  // Cycle display day (1-7) and cycle number
  const displayDay = ((state.streakDay - 1) % 7) + 1;
  const cycleNum = Math.floor((state.streakDay - 1) / 7) + 1;
  const todayReward = getDailyRewardForDay(state.streakDay);

  const handleClaimReward = () => {
    if (state.todayRewardClaimed) return;
    setClaimingId('reward');
    const newState = claimDailyReward();
    setState(newState);
    onStateChange?.();
    setTimeout(() => setClaimingId(null), 700);
  };

  const handleClaimMission = (id: string) => {
    setClaimingId(id);
    const newState = claimMission(id);
    setState(newState);
    onStateChange?.();
    setTimeout(() => setClaimingId(null), 700);
  };

  const rewardGradient = (type: DailyReward['type']): string => {
    switch (type) {
      case 'premium': return 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)';
      case 'cardBack': return 'linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%)';
      case 'avatar': return 'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)';
      case 'bonus': return 'linear-gradient(135deg, #34d399 0%, #059669 100%)';
      default: return 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)';
    }
  };

  const completedMissions = state.missions.filter(m => m.claimed).length;

  return (
    <div className="daily-root">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="daily-header">
        <button className="mm-back-btn" onClick={onBack}>← Back</button>
        <div className="daily-coins-pill">
          <span>🪙</span>
          <span className="daily-coins-val">{state.coins.toLocaleString()}</span>
        </div>
      </div>

      <div className="daily-scroll-body">

        {/* ── SECTION 1: Login Reward ──────────────────────── */}
        <div className="daily-card glass-panel">
          <div className="daily-card-head">
            <span className="daily-card-head-icon">📅</span>
            <div className="daily-card-head-text">
              <div className="daily-card-title">Daily Login Reward</div>
              <div className="daily-card-subtitle">
                🔥 Day <strong>{state.streakDay}</strong> Streak
                {cycleNum > 1 && <span className="daily-cycle-badge"> Cycle {cycleNum}</span>}
              </div>
            </div>
          </div>

          {/* 7-day calendar strip */}
          <div className="daily-strip">
            {DAILY_REWARDS.map((reward, i) => {
              const dayNum = i + 1;
              const isToday = dayNum === displayDay;
              const isPast = dayNum < displayDay;
              const isFuture = dayNum > displayDay;
              const isClaimed = isPast || (isToday && state.todayRewardClaimed);

              return (
                <div
                  key={dayNum}
                  className={[
                    'daily-strip-day',
                    isToday ? 'today' : '',
                    isPast ? 'past' : '',
                    isFuture ? 'future' : '',
                    isClaimed ? 'claimed' : '',
                  ].filter(Boolean).join(' ')}
                  title={`Day ${dayNum}: ${reward.label}`}
                >
                  <span className="dsd-num">Day {dayNum}</span>
                  <span className="dsd-icon">
                    {isClaimed ? '✓' : reward.icon}
                  </span>
                  <span className="dsd-label">{reward.label.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>

          {/* Today's reward banner */}
          <div
            className="daily-today-reward"
            style={{ background: rewardGradient(todayReward.type) }}
          >
            <span className="dtr-icon">{todayReward.icon}</span>
            <div className="dtr-info">
              <span className="dtr-label">{todayReward.label}</span>
              <span className="dtr-desc">{todayReward.description}</span>
            </div>
            {todayReward.coinValue > 0 && (
              <span className="dtr-coins">+{todayReward.coinValue} 🪙</span>
            )}
          </div>

          {/* Claim button */}
          <button
            id="daily-reward-claim-btn"
            className={[
              'daily-claim-btn',
              state.todayRewardClaimed ? 'claimed' : 'claimable',
              claimingId === 'reward' ? 'burst' : '',
            ].filter(Boolean).join(' ')}
            onClick={handleClaimReward}
            disabled={state.todayRewardClaimed}
          >
            {state.todayRewardClaimed
              ? '✓ Claimed — Come back tomorrow!'
              : `🎁 Claim Reward: ${todayReward.label}`}
          </button>
        </div>

        {/* ── SECTION 2: Daily Missions ────────────────────── */}
        <div className="daily-card glass-panel">
          <div className="daily-card-head">
            <span className="daily-card-head-icon">🎯</span>
            <div className="daily-card-head-text">
              <div className="daily-card-title">Daily Missions</div>
              <div className="daily-card-subtitle">Complete missions to earn bonus coins</div>
            </div>
            <span className="daily-reset-pill">Resets midnight</span>
          </div>

          <div className="daily-mission-list">
            {state.missions.map((mission) => {
              const pct = Math.min(100, (mission.progress / mission.goal) * 100);
              const isComplete = mission.progress >= mission.goal;
              const isClaimed = mission.claimed;

              return (
                <div
                  key={mission.id}
                  className={[
                    'daily-mission',
                    isComplete && !isClaimed ? 'complete' : '',
                    isClaimed ? 'done' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <span className="dm-icon">{mission.icon}</span>

                  <div className="dm-body">
                    <div className="dm-label">{mission.label}</div>
                    <div className="dm-desc">{mission.description}</div>
                    <div className="dm-track">
                      <div className="dm-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="dm-progress-text">
                      {isClaimed ? 'Completed!' : `${mission.progress} / ${mission.goal}`}
                    </div>
                  </div>

                  <div className="dm-right">
                    <span className="dm-coin-label">+75 🪙</span>
                    {isClaimed ? (
                      <span className="dm-done-badge">✓</span>
                    ) : isComplete ? (
                      <button
                        className={`dm-claim-btn ${claimingId === mission.id ? 'burst' : ''}`}
                        onClick={() => handleClaimMission(mission.id)}
                      >
                        Claim!
                      </button>
                    ) : (
                      <span className="dm-locked">🔒</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary footer */}
          <div className="daily-missions-summary">
            <span>{completedMissions} / {state.missions.length} missions claimed</span>
            <span className="dms-bonus">
              {completedMissions === state.missions.length
                ? '🎉 All done today!'
                : `Max +${state.missions.length * 75} 🪙 today`}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
