import React, { useState } from 'react';
import type { AiLevel } from '../utils/gameHelpers';
import { savePersistentItem } from '../utils/persistentStorage';
import { getLocalProfile, getRankTier, getXpForNextLevel, RANK_TIERS } from '../utils/rankSystem';

interface MainMenuProps {
  onStartOffline: (settings: OfflineSettings) => void;
  onJoinOnline: (roomId: string, name: string) => void;
  onCreateOnline: (name: string, maxRounds: number) => void;
  onShowTutorial?: () => void;
}

export interface OfflineSettings {
  playerName: string;
  aiCount: number;
  aiLevel: AiLevel | 'MIXED';
  maxRounds: number;
}

type View = 'main' | 'offline' | 'online-choice' | 'online-join' | 'online-create' | 'settings';

// Toggle Switch Component
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; id: string }> = ({ checked, onChange, id }) => (
  <label htmlFor={id} className="mm-toggle">
    <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    <span className="mm-toggle-track">
      <span className="mm-toggle-thumb" />
    </span>
  </label>
);

// Card-style select option
const PickerRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mm-picker-row">
    <span className="mm-picker-label">{label}</span>
    <div className="mm-picker-options">{children}</div>
  </div>
);

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartOffline,
  onJoinOnline,
  onCreateOnline,
  onShowTutorial,
}) => {
  const [view, setView] = useState<View>('main');
  const [playerName, setPlayerName] = useState<string>(() => localStorage.getItem('tickPlayerName') || '');
  const [aiCount, setAiCount] = useState<number>(3);
  const [maxRounds, setMaxRounds] = useState<number>(10);
  const [roomId, setRoomId] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => localStorage.getItem('soundEnabled') !== 'false');
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() => localStorage.getItem('vibrationEnabled') !== 'false');
  const [batterySaverEnabled, setBatterySaverEnabled] = useState<boolean>(() => localStorage.getItem('batterySaverEnabled') === 'true');
  const [animIn, setAnimIn] = useState(true);

  const profile = getLocalProfile();
  const rank = getRankTier(profile.mmr);
  const xpNeeded = getXpForNextLevel(profile.level);
  const xpPct = Math.min((profile.xp / xpNeeded) * 100, 100);

  const navigate = (v: View) => {
    setAnimIn(false);
    setTimeout(() => { setView(v); setAnimIn(true); }, 180);
  };

  const handleStartOffline = () => {
    savePersistentItem('tickPlayerName', playerName);
    onStartOffline({ playerName: playerName || 'Player', aiCount, aiLevel: 'MEDIUM', maxRounds });
  };

  const handleJoinOnline = () => {
    if (!roomId.trim() || !playerName.trim()) return;
    savePersistentItem('tickPlayerName', playerName);
    onJoinOnline(roomId.trim().toUpperCase(), playerName);
  };

  const handleCreateOnline = () => {
    if (!playerName.trim()) return;
    savePersistentItem('tickPlayerName', playerName);
    onCreateOnline(playerName, maxRounds);
  };

  const handleSaveSettings = async () => {
    await savePersistentItem('soundEnabled', soundEnabled ? 'true' : 'false');
    await savePersistentItem('vibrationEnabled', vibrationEnabled ? 'true' : 'false');
    await savePersistentItem('batterySaverEnabled', batterySaverEnabled ? 'true' : 'false');
    if (batterySaverEnabled) document.body.classList.add('battery-saver');
    else document.body.classList.remove('battery-saver');
    navigate('main');
  };

  return (
    <div className="mm-root">
      {/* Animated background orbs */}
      <div className="mm-orb mm-orb-1" />
      <div className="mm-orb mm-orb-2" />
      <div className="mm-orb mm-orb-3" />

      <div className={`mm-scene ${animIn ? 'mm-fade-in' : 'mm-fade-out'}`}>

        {/* ── MAIN VIEW ─────────────────────────────────────── */}
        {view === 'main' && (
          <div className="mm-main-layout">

            {/* Left panel: Profile card */}
            <aside className="mm-profile-panel glass-panel">
              {/* Avatar / crest */}
              <div className="mm-avatar-ring" style={{ borderColor: rank.color, boxShadow: `0 0 24px ${rank.color}55` }}>
                <span className="mm-avatar-crest">{rank.crest}</span>
                {profile.winStreak >= 2 && <span className="mm-avatar-streak">🔥</span>}
              </div>

              {/* Player info */}
              <div className="mm-profile-name">{profile.name || 'Player'}</div>
              <div className="mm-profile-tier" style={{ color: rank.color }}>
                {rank.name}
              </div>
              <div className="mm-profile-mmr">{profile.mmr} MMR • LVL {profile.level}</div>

              {/* XP bar */}
              <div className="mm-xp-wrap">
                <div className="mm-xp-track">
                  <div className="mm-xp-fill" style={{ width: `${xpPct}%` }} />
                </div>
                <span className="mm-xp-label">{profile.xp} / {xpNeeded} XP</span>
              </div>

              {/* Recent form */}
              {profile.recentForm.length > 0 && (
                <div className="mm-recent-form">
                  {profile.recentForm.map((r, i) => (
                    <span key={i} className={`mm-form-dot ${r === 'W' ? 'win' : 'loss'}`} />
                  ))}
                </div>
              )}

              {/* Stats row */}
              <div className="mm-stats-row">
                <div className="mm-stat-chip">
                  <span className="mm-stat-val">{profile.gamesPlayed}</span>
                  <span className="mm-stat-key">Games</span>
                </div>
                <div className="mm-stat-chip">
                  <span className="mm-stat-val" style={{ color: '#34d399' }}>
                    {profile.gamesPlayed > 0 ? Math.round((profile.wins / profile.gamesPlayed) * 100) : 0}%
                  </span>
                  <span className="mm-stat-key">Win Rate</span>
                </div>
                {profile.winStreak >= 2 && (
                  <div className="mm-stat-chip">
                    <span className="mm-stat-val" style={{ color: '#f97316' }}>🔥{profile.winStreak}</span>
                    <span className="mm-stat-key">Streak</span>
                  </div>
                )}
              </div>

              {/* Rank ladder — 6 representative pips */}
              {(() => {
                const pivots = [0, 3, 6, 9, 12, 15];
                const currentTierIdx = RANK_TIERS.findIndex(r => r.name === rank.name);
                return (
                  <div className="mm-rank-ladder">
                    {pivots.map((tierIdx) => {
                      const t = RANK_TIERS[tierIdx];
                      const passed = currentTierIdx >= tierIdx;
                      return (
                        <div
                          key={tierIdx}
                          className={`mm-rank-pip ${passed ? 'active' : ''}`}
                          style={{ background: passed ? t.color : undefined }}
                          title={t.name}
                        />
                      );
                    })}
                  </div>
                );
              })()}

              {/* Settings link */}
              <button className="mm-settings-link" onClick={() => navigate('settings')}>
                ⚙️ Settings &amp; Rules
              </button>
            </aside>

            {/* Right panel: Game actions */}
            <main className="mm-actions-panel">
              {/* Logo */}
              <div className="mm-logo-block">
                <div className="mm-logo-cards">
                  <div className="mm-logo-card c1">🂠</div>
                  <div className="mm-logo-card c2">5</div>
                  <div className="mm-logo-card c3">🂠</div>
                </div>
                <h1 className="mm-title">5 Cards</h1>
                <p className="mm-tagline">Traditional Indian Card Game</p>
              </div>

              {/* Action buttons */}
              <div className="mm-action-grid">
                <button className="mm-action-btn primary" onClick={() => navigate('offline')}>
                  <span className="mm-action-icon">🤖</span>
                  <div className="mm-action-text">
                    <span className="mm-action-title">Play vs AI</span>
                    <span className="mm-action-desc">Single player vs bots</span>
                  </div>
                  <span className="mm-action-arrow">›</span>
                </button>

                <button className="mm-action-btn secondary" onClick={() => navigate('online-choice')}>
                  <span className="mm-action-icon">🌐</span>
                  <div className="mm-action-text">
                    <span className="mm-action-title">Multiplayer</span>
                    <span className="mm-action-desc">Play with friends online</span>
                  </div>
                  <span className="mm-action-arrow">›</span>
                </button>

                <button className="mm-action-btn ghost" onClick={onShowTutorial}>
                  <span className="mm-action-icon">📖</span>
                  <div className="mm-action-text">
                    <span className="mm-action-title">How to Play</span>
                    <span className="mm-action-desc">Learn the rules</span>
                  </div>
                  <span className="mm-action-arrow">›</span>
                </button>
              </div>
            </main>
          </div>
        )}

        {/* ── OFFLINE SETUP ─────────────────────────────────── */}
        {view === 'offline' && (
          <div className="mm-form-panel glass-panel">
            <button className="mm-back-btn" onClick={() => navigate('main')}>← Back</button>
            <div className="mm-form-header">
              <span className="mm-form-icon">🤖</span>
              <h2 className="mm-form-title">Play vs AI</h2>
              <p className="mm-form-desc">Set up your offline game</p>
            </div>

            <div className="mm-form-body">
              <div className="mm-field">
                <label className="mm-field-label">Your Name</label>
                <input
                  className="mm-input"
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                />
              </div>

              <PickerRow label="AI Opponents">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    className={`mm-chip ${aiCount === n ? 'active' : ''}`}
                    onClick={() => setAiCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </PickerRow>

              <PickerRow label="Rounds">
                {([3, 5, 10, 20] as const).map(r => (
                  <button
                    key={r}
                    className={`mm-chip ${maxRounds === r ? 'active' : ''}`}
                    onClick={() => setMaxRounds(r)}
                  >
                    {r}{r === 3 ? ' ⚡' : ''}
                  </button>
                ))}
              </PickerRow>
            </div>

            <button className="mm-cta-btn" onClick={handleStartOffline} disabled={!playerName.trim()}>
              Start Game 🚀
            </button>
          </div>
        )}

        {/* ── ONLINE CHOICE ─────────────────────────────────── */}
        {view === 'online-choice' && (
          <div className="mm-form-panel glass-panel">
            <button className="mm-back-btn" onClick={() => navigate('main')}>← Back</button>
            <div className="mm-form-header">
              <span className="mm-form-icon">🌐</span>
              <h2 className="mm-form-title">Multiplayer</h2>
              <p className="mm-form-desc">Play with friends online</p>
            </div>

            <div className="mm-form-body">
              <div className="mm-field">
                <label className="mm-field-label">Your Name</label>
                <input
                  className="mm-input"
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                />
              </div>
            </div>

            <div className="mm-online-cards">
              <button
                className="mm-online-card"
                onClick={() => navigate('online-create')}
                disabled={!playerName.trim()}
              >
                <span className="mm-oc-icon">🏠</span>
                <span className="mm-oc-title">Create Room</span>
                <span className="mm-oc-desc">Host a private game</span>
              </button>
              <button
                className="mm-online-card"
                onClick={() => navigate('online-join')}
                disabled={!playerName.trim()}
              >
                <span className="mm-oc-icon">🔑</span>
                <span className="mm-oc-title">Join Room</span>
                <span className="mm-oc-desc">Enter a room code</span>
              </button>
            </div>
          </div>
        )}

        {/* ── CREATE ROOM ───────────────────────────────────── */}
        {view === 'online-create' && (
          <div className="mm-form-panel glass-panel">
            <button className="mm-back-btn" onClick={() => navigate('online-choice')}>← Back</button>
            <div className="mm-form-header">
              <span className="mm-form-icon">🏠</span>
              <h2 className="mm-form-title">Create Room</h2>
              <p className="mm-form-desc">Choose your game settings</p>
            </div>

            <div className="mm-form-body">
              <PickerRow label="Rounds">
                {([3, 5, 10, 20] as const).map(r => (
                  <button
                    key={r}
                    className={`mm-chip ${maxRounds === r ? 'active' : ''}`}
                    onClick={() => setMaxRounds(r)}
                  >
                    {r}{r === 3 ? ' ⚡' : ''}
                  </button>
                ))}
              </PickerRow>
            </div>

            <button className="mm-cta-btn" onClick={handleCreateOnline}>
              Create &amp; Join Lobby 🎮
            </button>
          </div>
        )}

        {/* ── JOIN ROOM ─────────────────────────────────────── */}
        {view === 'online-join' && (
          <div className="mm-form-panel glass-panel">
            <button className="mm-back-btn" onClick={() => navigate('online-choice')}>← Back</button>
            <div className="mm-form-header">
              <span className="mm-form-icon">🔑</span>
              <h2 className="mm-form-title">Join Room</h2>
              <p className="mm-form-desc">Enter the 6-character room code</p>
            </div>

            <div className="mm-form-body">
              <div className="mm-field">
                <label className="mm-field-label">Room Code</label>
                <input
                  className="mm-input mm-room-code-input"
                  type="text"
                  value={roomId}
                  onChange={e => setRoomId(e.target.value.toUpperCase())}
                  placeholder="ABCDEF"
                  maxLength={6}
                />
              </div>
            </div>

            <button className="mm-cta-btn" onClick={handleJoinOnline} disabled={roomId.length < 4}>
              Join Room 🚀
            </button>
          </div>
        )}

        {/* ── SETTINGS & RULES ──────────────────────────────── */}
        {view === 'settings' && (
          <div className="mm-settings-layout">
            <div className="mm-form-panel glass-panel mm-settings-left">
              <button className="mm-back-btn" onClick={() => navigate('main')}>← Back</button>
              <div className="mm-form-header" style={{ marginBottom: '20px' }}>
                <span className="mm-form-icon">⚙️</span>
                <h2 className="mm-form-title">Settings</h2>
              </div>

              <div className="mm-settings-list">
                <div className="mm-setting-row">
                  <div className="mm-setting-info">
                    <span className="mm-setting-name">🔊 Sound Effects</span>
                  </div>
                  <Toggle id="snd" checked={soundEnabled} onChange={setSoundEnabled} />
                </div>
                <div className="mm-setting-row">
                  <div className="mm-setting-info">
                    <span className="mm-setting-name">📳 Vibration</span>
                  </div>
                  <Toggle id="vib" checked={vibrationEnabled} onChange={setVibrationEnabled} />
                </div>
                <div className="mm-setting-row">
                  <div className="mm-setting-info">
                    <span className="mm-setting-name">🔋 Battery Saver</span>
                    <span className="mm-setting-hint">Reduces animations</span>
                  </div>
                  <Toggle id="bat" checked={batterySaverEnabled} onChange={setBatterySaverEnabled} />
                </div>
                <div className="mm-setting-row">
                  <div className="mm-setting-info">
                    <span className="mm-setting-name">📖 Tutorial</span>
                  </div>
                  <button className="mm-mini-btn" onClick={onShowTutorial}>Show Guide</button>
                </div>
              </div>

              <button className="mm-cta-btn" style={{ marginTop: 'auto' }} onClick={handleSaveSettings}>
                Save Settings ✓
              </button>
            </div>

            <div className="mm-rules-panel glass-panel">
              <h3 className="mm-rules-title">📜 Game Rules</h3>
              <div className="mm-rules-scroll">
                <div className="mm-rule-block">
                  <div className="mm-rule-heading">🎯 Objective</div>
                  <p>Minimize the points in your hand. The player with the lowest total score at the end of all rounds wins.</p>
                </div>
                <div className="mm-rule-block">
                  <div className="mm-rule-heading">🃏 Joker System</div>
                  <p>A card is revealed at the start of each round — its rank becomes the <strong>Joker Rank</strong>. All cards of that rank + 2 printed Jokers are worth <strong>0 points</strong>.</p>
                </div>
                <div className="mm-rule-block">
                  <div className="mm-rule-heading">🔢 Card Values</div>
                  <p>Jokers = 0 pts · Aces = 1 pt · Numbers 2-10 = face value · J/Q/K = 11/12/13 pts</p>
                </div>
                <div className="mm-rule-block">
                  <div className="mm-rule-heading">🔄 Turn Actions</div>
                  <p>On your turn: either declare "5 Cards" (Tick) at the start, or discard one or more cards of the same rank and draw one from the pile.</p>
                </div>
                <div className="mm-rule-block">
                  <div className="mm-rule-heading">⚡ Matching Rule</div>
                  <p>If your discarded card's rank matches the top of the discard pile, you skip drawing — your hand shrinks!</p>
                </div>
                <div className="mm-rule-block">
                  <div className="mm-rule-heading">📢 Declaring Tick</div>
                  <p><strong>Correct:</strong> Lowest hand = 0 pts. <strong>Wrong:</strong> 80-point penalty for you, 0 pts for the actual lowest player.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
