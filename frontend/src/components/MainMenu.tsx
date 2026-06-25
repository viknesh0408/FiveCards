import React, { useState } from 'react';
import type { AiLevel } from '../utils/gameHelpers';
import { savePersistentItem } from '../utils/persistentStorage';
import { getLocalStats, resetLocalStats, saveLocalStats, getMatchHistory } from '../utils/statsSystem';
import type { PlayerStats } from '../utils/statsSystem';
import { DailyPanel } from './DailyPanel';
import { ShopPanel } from './ShopPanel';
import { hasUnclaimedDaily, getDailyState, equipShopItem } from '../utils/dailySystem';
import { soundEffects } from '../utils/soundEffects';

interface MainMenuProps {
  onStartOffline: (settings: OfflineSettings) => void;
  onJoinOnline: (roomId: string, name: string) => void;
  onCreateOnline: (name: string, maxRounds: number) => void;
  onShowTutorial?: () => void;
  onRegisterBackButton?: (handler: (() => boolean) | null) => void;
}

export interface OfflineSettings {
  playerName: string;
  aiCount: number;
  aiLevel: AiLevel | 'MIXED';
  maxRounds: number;
}

type View = 'main' | 'offline' | 'online-choice' | 'online-join' | 'online-create' | 'settings' | 'stats' | 'daily' | 'shop' | 'rules' | 'edit-profile' | 'history';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
}

const CARD_BACKS: ShopItem[] = [
  { id: 'classic', name: 'Classic Red', description: 'The timeless standard layout', price: 0 },
  { id: 'neon', name: 'Neon Cyber', description: 'Vibrant glowing grid from the future', price: 1000 },
  { id: 'holographic', name: 'Holographic Aura', description: 'Shimmering pastel rainbow shifting light', price: 1500 },
  { id: 'emerald', name: 'Emerald Forest', description: 'Rich green luxury marble with gold veins', price: 2000 },
  { id: 'amethyst', name: 'Amethyst Geode', description: 'Deep purple crystalline texture with shimmering light', price: 2500 },
  { id: 'ruby', name: 'Ruby Heart', description: 'Crimson red metallic plate with glowing heartbeat line', price: 3000 },
  { id: 'sapphire', name: 'Ocean Sapphire', description: 'Royal blue waves with silver accents', price: 3500 },
  { id: 'steampunk', name: 'Steampunk Brass', description: 'Ornate bronze gears and copper piping style', price: 4000 },
  { id: 'cyberpunk', name: 'Cyberpunk Glitch', description: 'Glitchy neon green and static lines', price: 5000 },
  { id: 'prism', name: 'Rainbow Prism', description: 'Shifting light spectrum and geometric shards', price: 6000 },
  { id: 'matrix', name: 'Matrix Code', description: 'Falling green digital rain code', price: 7000 },
  { id: 'lava', name: 'Volcanic Lava', description: 'Glowing orange molten magma flows', price: 8000 },
  { id: 'cosmic', name: 'Cosmic Nebula', description: 'Swirling starry galaxy background', price: 9000 },
  { id: 'gold', name: 'Golden Royal', description: 'Prestigious golden filigree and ornate details', price: 10000 },
  { id: 'obsidian', name: 'Dark Obsidian', description: 'Stealth charcoal texture with purple neon pulses', price: 12000 },
  { id: 'dragon_scale', name: 'Dragon Scale', description: 'Scaled fire-breathing red reptile armor plate', price: 15000 },
];

const AVATAR_FRAMES: ShopItem[] = [
  { id: 'none', name: 'Default Frame', description: 'Simple, clean border profile ring', price: 0 },
  { id: 'neon_frame', name: 'Neon Cyber', description: 'Electrifying cyan and hot pink glowing ring', price: 1000 },
  { id: 'frost', name: 'Ice Frost', description: 'Frosted blue crystals and cold sparkle glow', price: 1500 },
  { id: 'fire', name: 'Fire Flame', description: 'Energetic warm orange-red dancing fire ring', price: 2000 },
  { id: 'amethyst_frame', name: 'Amethyst Crystal', description: 'Purple crystalline glowing geode ring', price: 2500 },
  { id: 'ruby_frame', name: 'Ruby Heartbeat', description: 'Pulsing crimson crystal border', price: 3000 },
  { id: 'sapphire_frame', name: 'Sapphire Wave', description: 'Flowing blue ocean waters', price: 3500 },
  { id: 'steampunk_frame', name: 'Steampunk Gear', description: 'Rotating brass gears border', price: 4000 },
  { id: 'cyberpunk_frame', name: 'Glitch Matrix', description: 'Shifting cyan/lime noise glitch border', price: 5000 },
  { id: 'prism_frame', name: 'Rainbow Prism', description: 'Prismatic color cycle border', price: 6000 },
  { id: 'matrix_frame', name: 'Digital Code', description: 'Code waterfall flowing around avatar', price: 7000 },
  { id: 'lava_frame', name: 'Volcanic Lava', description: 'Hot glowing molten lava ring', price: 8000 },
  { id: 'cosmic_frame', name: 'Cosmic Nebula', description: 'Starry nebula galaxy swirl frame', price: 9000 },
  { id: 'gold_aura', name: 'Golden Aura', description: 'Continuous rotate of brilliant royal gold rays', price: 10000 },
  { id: 'dragon_frame', name: 'Dragon Emperor', description: 'Crimson scales crowned with dragon claws', price: 12000 },
  { id: 'royal', name: 'Royal Crown', description: 'Majestic golden crest crowned with a royal tiara', price: 15000 },
];

const CARTOON_AVATARS = [
  { id: 'none', name: 'None (Initials)' },
  { id: 'cat', name: 'Cat' },
  { id: 'fox', name: 'Fox (Week 1 · Day 5)' },
  { id: 'monkey', name: 'Monkey (Week 2 · Day 5)' },
  { id: 'panda', name: 'Panda (Week 3 · Day 5)' },
  { id: 'robot', name: 'Robot (Week 4 · Day 5)' },
  { id: 'unicorn', name: 'Unicorn (Week 5 · Day 5)' },
  { id: 'dragon', name: 'Dragon (Week 6 · Day 5)' },
  { id: 'alien', name: 'Alien (Week 7 · Day 5)' },
];

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
  onRegisterBackButton,
}) => {
  const [view, setView] = useState<View>('main');
  const [playerName, setPlayerName] = useState<string>(() => localStorage.getItem('tickPlayerName') || '');
  const [tempPlayerName, setTempPlayerName] = useState<string>('');
  const [tempAvatar, setTempAvatar] = useState<string>('none');
  const [tempCardBack, setTempCardBack] = useState<string>('classic');
  const [aiCount, setAiCount] = useState<number>(3);
  const [maxRounds, setMaxRounds] = useState<number>(10);
  const [roomId, setRoomId] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => localStorage.getItem('soundEnabled') !== 'false');
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() => localStorage.getItem('vibrationEnabled') !== 'false');
  const [batterySaverEnabled, setBatterySaverEnabled] = useState<boolean>(() => localStorage.getItem('batterySaverEnabled') === 'true');
  const [cardGlowEnabled, setCardGlowEnabled] = useState<boolean>(() => localStorage.getItem('cardGlowEnabled') !== 'false');
  const [animIn, setAnimIn] = useState(true);
  const [hasDailyNotif, setHasDailyNotif] = useState<boolean>(() => hasUnclaimedDaily());
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => localStorage.getItem('selected_avatar') || 'none');
  const [selectedAvatarPic, setSelectedAvatarPic] = useState<string>(() => localStorage.getItem('selected_avatar_pic') || 'none');
  const [tempAvatarPic, setTempAvatarPic] = useState<string>('none');
  const [coins, setCoins] = useState<number>(() => getDailyState().coins);

  const [stats, setStats] = useState<PlayerStats>(() => getLocalStats());
  const [activeTab, setActiveTab] = useState<'main' | 'me'>('main');

  const navigate = React.useCallback((v: View) => {
    setAnimIn(false);
    setTimeout(() => {
      setView(v);
      setAnimIn(true);
      if (v === 'edit-profile') {
        const ds = getDailyState();
        setTempPlayerName(localStorage.getItem('tickPlayerName') || 'Player');
        setTempAvatar(ds.selectedAvatar || 'none');
        setTempCardBack(ds.selectedCardBack || 'classic');
        setTempAvatarPic(localStorage.getItem('selected_avatar_pic') || 'none');
      }
      if (v === 'main') {
        setHasDailyNotif(hasUnclaimedDaily());
        setSelectedAvatar(localStorage.getItem('selected_avatar') || 'none');
        setSelectedAvatarPic(localStorage.getItem('selected_avatar_pic') || 'none');
      }
      if (v === 'online-create') {
        if (maxRounds !== 3 && maxRounds !== 10 && maxRounds !== 30) {
          setMaxRounds(10);
        }
      }
      if (v === 'offline') {
        if (maxRounds !== 3 && maxRounds !== 5 && maxRounds !== 10 && maxRounds !== 20) {
          setMaxRounds(10);
        }
      }
    }, 180);
  }, [maxRounds]);

  const refreshMainMenuState = () => {
    setHasDailyNotif(hasUnclaimedDaily());
    setSelectedAvatar(localStorage.getItem('selected_avatar') || 'none');
    setSelectedAvatarPic(localStorage.getItem('selected_avatar_pic') || 'none');
    setCoins(getDailyState().coins);
  };

  React.useEffect(() => {
    if (onRegisterBackButton) {
      onRegisterBackButton(() => {
        if (view === 'main') {
          if (activeTab === 'me') {
            setActiveTab('main');
            return true;
          }
          return false;
        } else if (
          view === 'offline' ||
          view === 'online-choice' ||
          view === 'settings' ||
          view === 'stats' ||
          view === 'history' ||
          view === 'daily' ||
          view === 'shop' ||
          view === 'rules' ||
          view === 'edit-profile'
        ) {
          navigate('main');
          return true;
        } else if (view === 'online-create' || view === 'online-join') {
          navigate('online-choice');
          return true;
        }
        return false;
      });
    }
    return () => {
      if (onRegisterBackButton) {
        onRegisterBackButton(null);
      }
    };
  }, [view, activeTab, navigate, onRegisterBackButton]);

  const handleSaveProfile = async () => {
    const trimmed = tempPlayerName.trim();
    if (!trimmed) return;

    setPlayerName(trimmed);
    await savePersistentItem('tickPlayerName', trimmed);
    localStorage.setItem('tickPlayerName', trimmed);

    const updatedStats = { ...stats, name: trimmed };
    saveLocalStats(updatedStats);
    setStats(updatedStats);

    equipShopItem('avatar', tempAvatar);
    equipShopItem('cardBack', tempCardBack);

    setSelectedAvatar(tempAvatar);
    localStorage.setItem('selected_avatar_pic', tempAvatarPic);
    setSelectedAvatarPic(tempAvatarPic);

    soundEffects.playWin();
    navigate('main');
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
    await savePersistentItem('cardGlowEnabled', cardGlowEnabled ? 'true' : 'false');
    localStorage.setItem('cardGlowEnabled', cardGlowEnabled ? 'true' : 'false');
    if (batterySaverEnabled) document.body.classList.add('battery-saver');
    else document.body.classList.remove('battery-saver');
    navigate('main');
  };

  return (
    <div className={`mm-root mm-view-${view} ${view !== 'stats' && view !== 'rules' ? 'mm-no-scroll' : ''}`}>
      {/* Animated background orbs */}
      <div className="mm-orb mm-orb-1" />
      <div className="mm-orb mm-orb-2" />
      <div className="mm-orb mm-orb-3" />

      {/* Global Top-Right Coins Display */}
      {view !== 'daily' && view !== 'shop' && view !== 'settings' && view !== 'stats' && view !== 'history' && view !== 'rules' && view !== 'edit-profile' && !(view === 'main' && activeTab === 'me') && (
        <div className="mm-global-coins">
          <div className="daily-coins-pill" style={{ background: 'rgba(251,191,36,0.08)' }}>
            <span>🪙</span>
            <span className="daily-coins-val">{coins.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Global Top-Left Settings Gear Button */}
      {view === 'main' && activeTab === 'main' && (
        <div className="mm-global-settings">
          <button 
            className="mm-settings-btn" 
            onClick={() => navigate('settings')}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      )}

      <div className={`mm-scene ${animIn ? 'mm-fade-in' : 'mm-fade-out'}`}>

        {/* ── MAIN VIEW ─────────────────────────────────────── */}
        {view === 'main' && (
          <>
            <div className="mm-main-layout">

              {/* Left panel: Profile card */}
              <aside className={`mm-profile-panel glass-panel ${activeTab === 'me' ? 'mobile-visible' : 'mobile-hidden'}`}>
                <h2 className="mm-mobile-tab-header">Me</h2>
                
                {/* Profile Initials/Avatar */}
                <div className={`mm-avatar-ring avatar-frame-${selectedAvatar}`}>
                  {selectedAvatar === 'royal' && <span className="shop-royal-crown" style={{ transform: 'scale(1.3)', top: '-14px', zIndex: 10 }}>👑</span>}
                  <span className="mm-avatar-crest" style={{ fontSize: '2rem', fontWeight: 900, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedAvatarPic && selectedAvatarPic !== 'none' ? (
                      <img src={`/avatars/${selectedAvatarPic}.png`} alt="Avatar" className="mm-avatar-img" />
                    ) : (
                      (playerName || stats.name || 'P')[0].toUpperCase()
                    )}
                  </span>
                  {stats.winStreakCurrent >= 2 && <span className="mm-avatar-streak">🔥</span>}
                </div>

                {/* Player info */}
                <div className="mm-profile-name-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', margin: '4px 0 12px 0' }}>
                  <div className="mm-profile-name" style={{ margin: 0 }}>{playerName || stats.name || 'Player'}</div>
                  <button 
                    className="mm-profile-edit-btn" 
                    onClick={() => navigate('edit-profile')} 
                    title="Edit Profile"
                    style={{ background: 'none', border: 'none', color: 'var(--color-cyan)', cursor: 'pointer', fontSize: '1rem', padding: '4px', display: 'flex', alignItems: 'center', transition: 'transform 0.15s ease' }}
                  >
                    ✏️
                  </button>
                </div>
                <div className="mm-profile-mmr" style={{ marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Local Competitor
                </div>

                {/* Recent form */}
                {stats.recentForm && stats.recentForm.length > 0 && (
                  <div className="mm-recent-form" style={{ flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Recent Form</div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {stats.recentForm.map((r, i) => (
                        <span key={i} className={`mm-form-dot ${r === 'W' ? 'win' : 'loss'}`} title={r === 'W' ? 'Victory' : 'Defeat'} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats row */}
                <div className="mm-stats-row">
                  <div className="mm-stat-chip">
                    <span className="mm-stat-val">{stats.gamesPlayedTotal}</span>
                    <span className="mm-stat-key">Games</span>
                  </div>
                  <div className="mm-stat-chip">
                    <span className="mm-stat-val" style={{ color: '#34d399' }}>
                      {stats.gamesPlayedTotal > 0 ? Math.round((stats.winsTotal / stats.gamesPlayedTotal) * 100) : 0}%
                    </span>
                    <span className="mm-stat-key">Win Rate</span>
                  </div>
                  {stats.winStreakCurrent >= 2 && (
                    <div className="mm-stat-chip">
                      <span className="mm-stat-val" style={{ color: '#f97316' }}>🔥{stats.winStreakCurrent}</span>
                      <span className="mm-stat-key">Streak</span>
                    </div>
                  )}
                </div>

                {/* Me Menu List */}
                <div className="mm-me-menu-list">
                  <button 
                    className="mm-me-menu-item" 
                    onClick={() => navigate('edit-profile')}
                  >
                    <span className="mm-me-menu-icon">✏️</span>
                    <span className="mm-me-menu-label">Edit Profile</span>
                    <span className="mm-me-menu-arrow">›</span>
                  </button>

                  <button 
                    className="mm-me-menu-item" 
                    onClick={() => navigate('stats')}
                  >
                    <span className="mm-me-menu-icon">📊</span>
                    <span className="mm-me-menu-label">Stats</span>
                    <span className="mm-me-menu-arrow">›</span>
                  </button>

                  <button 
                    className="mm-me-menu-item" 
                    onClick={() => navigate('history')}
                  >
                    <span className="mm-me-menu-icon">🕒</span>
                    <span className="mm-me-menu-label">Match History</span>
                    <span className="mm-me-menu-arrow">›</span>
                  </button>

                  <button 
                    className="mm-me-menu-item" 
                    onClick={() => navigate('rules')}
                  >
                    <span className="mm-me-menu-icon">📜</span>
                    <span className="mm-me-menu-label">Game Rules</span>
                    <span className="mm-me-menu-arrow">›</span>
                  </button>
                </div>
              </aside>

              {/* Right panel: Game actions */}
              <main className={`mm-actions-panel ${activeTab === 'main' ? 'mobile-visible' : 'mobile-hidden'}`}>

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

          </>
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
                  onChange={e => {
                    const newName = e.target.value;
                    setPlayerName(newName);
                    localStorage.setItem('tickPlayerName', newName);
                    setStats(prev => ({ ...prev, name: newName }));
                  }}
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
                  onChange={e => {
                    const newName = e.target.value;
                    setPlayerName(newName);
                    localStorage.setItem('tickPlayerName', newName);
                    setStats(prev => ({ ...prev, name: newName }));
                  }}
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
                {([3, 10, 30] as const).map(r => (
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

        {view === 'settings' && (
          <div className="mm-form-panel glass-panel" style={{ overflow: 'hidden' }}>
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
                  <span className="mm-setting-name">✨ Card Glow Effects</span>
                  <span className="mm-setting-hint">Glow for Jokers and matches</span>
                </div>
                <Toggle id="glw" checked={cardGlowEnabled} onChange={setCardGlowEnabled} />
              </div>
              <div className="mm-setting-row">
                <div className="mm-setting-info">
                  <span className="mm-setting-name">📖 Tutorial</span>
                </div>
                <button className="mm-mini-btn" onClick={onShowTutorial}>Show Guide</button>
              </div>
            </div>

            <button className="mm-cta-btn" style={{ marginTop: '24px' }} onClick={handleSaveSettings}>
              Save Settings ✓
            </button>
          </div>
        )}

        {/* ── GAME RULES ──────────────────────────────── */}
        {view === 'rules' && (
          <div className="mm-rules-panel glass-panel" style={{ width: 'min(600px, 96vw)', maxHeight: 'calc(100vh - 40px)', flex: 'none', margin: 'auto' }}>
            <button className="mm-back-btn" onClick={() => navigate('main')} style={{ marginBottom: '16px' }}>← Back</button>
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
        )}

        {/* ── STATS VIEW ─────────────────────────────────────── */}
        {view === 'stats' && (
          <div className="mm-stats-layout">
            {/* Left Column: Summary and Reset */}
            <div className="mm-form-panel glass-panel mm-stats-left">
              <button className="mm-back-btn" onClick={() => navigate('main')}>← Back</button>
              <div className="mm-form-header" style={{ marginBottom: '20px' }}>
                <span className="mm-form-icon">📊</span>
                <h2 className="mm-form-title">Overview</h2>
                <p className="mm-form-desc">Career statistics summary</p>
              </div>

              {/* Stats overview list */}
              <div className="mm-stats-overview-list">
                <div className="mm-stats-summary-card">
                  <span className="mm-stats-summary-val">{stats.gamesPlayedTotal}</span>
                  <span className="mm-stats-summary-key">Total Matches</span>
                </div>
                <div className="mm-stats-summary-card">
                  <span className="mm-stats-summary-val" style={{ color: '#22d3ee' }}>
                    {stats.gamesPlayedTotal > 0 ? Math.round((stats.winsTotal / stats.gamesPlayedTotal) * 100) : 0}%
                  </span>
                  <span className="mm-stats-summary-key">Win Rate</span>
                </div>
                <div className="mm-stats-summary-card">
                  <span className="mm-stats-summary-val" style={{ color: '#fbbf24' }}>
                    {stats.winStreakBest}
                  </span>
                  <span className="mm-stats-summary-key">Best Win Streak</span>
                </div>
                
                {/* Reset Section */}
                <div className="mm-stats-reset-wrap">
                  <button 
                    className="mm-reset-btn" 
                    onClick={() => {
                      if (confirm("Are you sure you want to reset all your statistics? This cannot be undone.")) {
                        resetLocalStats();
                        setStats(getLocalStats());
                      }
                    }}
                  >
                    🗑️ Reset Statistics
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Detailed Grid */}
            <div className="mm-stats-right glass-panel">
              <h3 className="mm-stats-title">📈 Detailed Performance</h3>
              <div className="mm-stats-scroll">
                
                {/* Grid 1: Split Modes */}
                <div className="mm-stats-section">
                  <h4 className="mm-stats-section-title">Mode Statistics</h4>
                  <div className="mm-stats-grid">
                    <div className="mm-stats-card">
                      <span className="mm-stats-card-title">🤖 Vs AI Matches</span>
                      <div className="mm-stats-card-content">
                        <div><span>Played</span><strong>{stats.gamesPlayedOffline}</strong></div>
                        <div><span>Wins</span><strong>{stats.winsOffline}</strong></div>
                        <div><span>Win Rate</span><strong style={{ color: '#34d399' }}>{stats.gamesPlayedOffline > 0 ? Math.round((stats.winsOffline / stats.gamesPlayedOffline) * 100) : 0}%</strong></div>
                      </div>
                    </div>
                    
                    <div className="mm-stats-card">
                      <span className="mm-stats-card-title">🌐 Multiplayer Matches</span>
                      <div className="mm-stats-card-content">
                        <div><span>Played</span><strong>{stats.gamesPlayedOnline}</strong></div>
                        <div><span>Wins</span><strong>{stats.winsOnline}</strong></div>
                        <div><span>Win Rate</span><strong style={{ color: '#34d399' }}>{stats.gamesPlayedOnline > 0 ? Math.round((stats.winsOnline / stats.gamesPlayedOnline) * 100) : 0}%</strong></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid 2: Declare Accuracy */}
                <div className="mm-stats-section">
                  <h4 className="mm-stats-section-title">Declare (Tick) Accuracy</h4>
                  <div className="mm-stats-accuracy-box">
                    <div className="mm-stats-accuracy-chart-wrap">
                      <div className="mm-stats-accuracy-val">
                        {(() => {
                          const total = stats.declaresCorrect + stats.declaresWrong;
                          return total > 0 ? `${Math.round((stats.declaresCorrect / total) * 100)}%` : '0%';
                        })()}
                      </div>
                      <span className="mm-stats-accuracy-label">Accuracy</span>
                    </div>
                    <div className="mm-stats-accuracy-details">
                      <div className="mm-stats-detail-row">
                        <span className="dot-correct">●</span>
                        <span>Correct Declares</span>
                        <strong>{stats.declaresCorrect}</strong>
                      </div>
                      <div className="mm-stats-detail-row">
                        <span className="dot-wrong">●</span>
                        <span>Wrong Declares</span>
                        <strong>{stats.declaresWrong}</strong>
                      </div>
                      <div className="mm-stats-detail-row">
                        <span>Total Declares</span>
                        <strong>{stats.declaresCorrect + stats.declaresWrong}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid 3: Scoring & Records */}
                <div className="mm-stats-section">
                  <h4 className="mm-stats-section-title">Scoring &amp; Records</h4>
                  <div className="mm-stats-grid mini-grid">
                    <div className="mm-stats-card mini">
                      <span className="mm-stats-card-key">Lowest Round Score</span>
                      <span className="mm-stats-card-val cyan">{stats.roundsPlayed > 0 ? stats.lowestRoundScore : '-'}</span>
                    </div>
                    <div className="mm-stats-card mini">
                      <span className="mm-stats-card-key">Highest Round Score</span>
                      <span className="mm-stats-card-val orange">{stats.roundsPlayed > 0 ? stats.highestRoundScore : '-'}</span>
                    </div>
                    <div className="mm-stats-card mini">
                      <span className="mm-stats-card-key">Average Round Score</span>
                      <span className="mm-stats-card-val gold">
                        {stats.roundsPlayed > 0 ? (stats.totalPointsScored / stats.roundsPlayed).toFixed(1) : '-'}
                      </span>
                    </div>
                    <div className="mm-stats-card mini">
                      <span className="mm-stats-card-key">Total Rounds Played</span>
                      <span className="mm-stats-card-val">{stats.roundsPlayed}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ── HISTORY VIEW ─────────────────────────────────────── */}
        {view === 'history' && (
          <div className="mm-stats-layout mm-history-layout">
            {/* Left Column: Summary */}
            <div className="mm-form-panel glass-panel mm-stats-left">
              <button className="mm-back-btn" onClick={() => navigate('main')}>← Back</button>
              <div className="mm-form-header" style={{ marginBottom: '20px' }}>
                <span className="mm-form-icon">🕒</span>
                <h2 className="mm-form-title">History</h2>
                <p className="mm-form-desc">Recent battle logs</p>
              </div>

              {/* Stats overview list */}
              <div className="mm-stats-overview-list">
                <div className="mm-stats-summary-card">
                  <span className="mm-stats-summary-val">{stats.gamesPlayedTotal}</span>
                  <span className="mm-stats-summary-key">Matches Saved</span>
                </div>
                <div className="mm-stats-summary-card">
                  <span className="mm-stats-summary-val" style={{ color: '#22d3ee' }}>
                    {stats.winsTotal}
                  </span>
                  <span className="mm-stats-summary-key">Total Victories</span>
                </div>
                <div className="mm-stats-summary-card">
                  <span className="mm-stats-summary-val" style={{ color: '#34d399' }}>
                    {stats.gamesPlayedTotal > 0 ? Math.round((stats.winsTotal / stats.gamesPlayedTotal) * 100) : 0}%
                  </span>
                  <span className="mm-stats-summary-key">Win Rate</span>
                </div>
              </div>
            </div>

            {/* Right Column: List of matches */}
            <div className="mm-stats-right glass-panel">
              <h3 className="mm-stats-title">📜 Match History Log</h3>
              <div className="mm-stats-scroll">
                {(() => {
                  const historyList = getMatchHistory();
                  if (historyList.length === 0) {
                    return (
                      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>🃏</span>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text)' }}>No Matches Logged</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: '280px', margin: '0 auto' }}>
                          Play a game against AI bots or online opponents to see your results tracked here!
                        </p>
                      </div>
                    );
                  }

                  return historyList.map((entry) => {
                    const matchDate = new Date(entry.date);
                    const formattedDate = matchDate.toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div 
                        key={entry.gameId} 
                        className="glass-panel mm-history-card" 
                        style={{ 
                          background: entry.isWin ? 'linear-gradient(135deg, rgba(52, 211, 153, 0.04) 0%, rgba(4, 12, 8, 0.4) 100%)' : 'rgba(255, 255, 255, 0.02)',
                          border: entry.isWin ? '1px solid rgba(52, 211, 153, 0.15)' : '1px solid rgba(255, 255, 255, 0.06)'
                        }}
                      >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span 
                              style={{ 
                                padding: '3px 8px', 
                                borderRadius: '6px', 
                                fontSize: '0.7rem', 
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                background: entry.isWin ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                                color: entry.isWin ? 'var(--color-green)' : 'var(--color-text-muted)',
                                border: entry.isWin ? '1px solid rgba(52, 211, 153, 0.2)' : '1px solid rgba(255,255,255,0.06)'
                              }}
                            >
                              {entry.isWin ? '🏆 Win (#1)' : `#${entry.placement} Place`}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                              {entry.isMultiplayer ? '🌐 Multiplayer' : '🤖 vs Bot'}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {formattedDate}
                          </span>
                        </div>

                        {/* Stats Summary */}
                        <div className="mm-history-card-stats">
                          <div>
                            <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Score</span>
                            <strong style={{ fontSize: '1.1rem', color: entry.isWin ? 'var(--color-gold)' : 'var(--color-text)' }}>
                              {entry.playerScore} pts
                            </strong>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Winner</span>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--color-cyan)' }}>
                              {entry.isWin ? 'You' : entry.winnerName}
                            </strong>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Winner Score</span>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--color-text)' }}>
                              {entry.winnerScore} pts
                            </strong>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rounds Played</span>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--color-text)' }}>
                              {entry.roundsCount || '-'}
                            </strong>
                          </div>
                        </div>

                        {/* Round-wise Scores */}
                        {entry.roundScores && entry.roundScores.length > 0 && (
                          <div style={{ marginBottom: '10px' }}>
                            <span style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Round-wise Scores</span>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {entry.roundScores.map((score, rIdx) => (
                                <span 
                                  key={rIdx} 
                                  style={{ 
                                    fontSize: '0.72rem', 
                                    padding: '3px 8px', 
                                    borderRadius: '6px', 
                                    background: score === 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255, 255, 255, 0.03)', 
                                    border: score === 0 ? '1px solid rgba(52, 211, 153, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                                    color: score === 0 ? 'var(--color-green)' : 'var(--color-text)'
                                  }}
                                >
                                  R{rIdx + 1}: <strong>{score}</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Opponents/Lobby summary */}
                        {entry.opponents && entry.opponents.length > 0 && (
                          <div>
                            <span style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Lobby Players</span>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {entry.opponents.map((opp, oIdx) => (
                                <span 
                                  key={oIdx} 
                                  style={{ 
                                    fontSize: '0.72rem', 
                                    padding: '3px 8px', 
                                    borderRadius: '6px', 
                                    background: 'rgba(255,255,255,0.03)', 
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    color: 'var(--color-text-muted)'
                                  }}
                                >
                                  {opp.name} {opp.isAi ? '[BOT]' : ''}: <strong>{opp.score} pts</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── DAILY VIEW ─────────────────────────────────────── */}
        {view === 'daily' && (
          <DailyPanel
            onBack={() => navigate('main')}
            onStateChange={refreshMainMenuState}
          />
        )}

        {/* ── SHOP VIEW ───────────────────────────────────────── */}
        {view === 'shop' && (
          <ShopPanel
            onBack={() => navigate('main')}
            onStateChange={refreshMainMenuState}
          />
        )}

        {/* ── EDIT PROFILE VIEW ──────────────────────────────── */}
        {view === 'edit-profile' && (
          <div className="mm-form-panel glass-panel" style={{ width: 'min(500px, 96vw)', maxHeight: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <button className="mm-back-btn" onClick={() => navigate('main')}>← Back</button>
            <div className="mm-form-header" style={{ marginBottom: '16px' }}>
              <span className="mm-form-icon">✏️</span>
              <h2 className="mm-form-title">Edit Profile</h2>
              <p className="mm-form-desc">Customize your profile card & card themes</p>
            </div>

            <div className="mm-edit-profile-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Initials & Frame Live Preview */}
              <div className="mm-edit-profile-preview" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', margin: '10px 0' }}>
                <div className={`mm-avatar-ring avatar-frame-${tempAvatar}`} style={{ width: '70px', height: '70px', borderWidth: '3px' }}>
                  {tempAvatar === 'royal' && <span className="shop-royal-crown" style={{ transform: 'scale(1.4)', top: '-15px', zIndex: 10 }}>👑</span>}
                  <span className="mm-avatar-crest" style={{ fontSize: '1.6rem', fontWeight: 900, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {tempAvatarPic && tempAvatarPic !== 'none' ? (
                      <img src={`/avatars/${tempAvatarPic}.png`} alt="Avatar" className="mm-avatar-img" />
                    ) : (
                      (tempPlayerName || 'P')[0].toUpperCase()
                    )}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Crest Preview</div>
              </div>

              {/* Player Name Input */}
              <div className="mm-field">
                <label className="mm-field-label">Player Name</label>
                <input
                  className="mm-input"
                  type="text"
                  value={tempPlayerName}
                  onChange={e => setTempPlayerName(e.target.value)}
                  placeholder="Enter player name"
                  maxLength={18}
                />
              </div>

              {/* Profile Picture Grid */}
              <div className="mm-field">
                <label className="mm-field-label">Profile Picture</label>
                <div className="profile-edit-grid">
                  {CARTOON_AVATARS.map((item) => {
                    const unlockedPics = getDailyState().unlockedAvatarPics || ['none', 'cat'];
                    const isUnlocked = unlockedPics.includes(item.id);
                    const isSelected = tempAvatarPic === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`profile-edit-item ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`}
                        onClick={() => {
                          if (isUnlocked) {
                            setTempAvatarPic(item.id);
                            soundEffects.playClick();
                          }
                        }}
                      >
                        <div className="preview-circle-pic" style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: isSelected ? '2px solid var(--color-cyan)' : '2px solid transparent', position: 'relative' }}>
                          {item.id !== 'none' ? (
                            <img src={`/avatars/${item.id}.png`} alt={item.name} className="mm-avatar-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>{(tempPlayerName || 'P')[0].toUpperCase()}</span>
                          )}
                          {!isUnlocked && (
                            <span className="lock-icon" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1.2rem', textShadow: '0 0 4px rgba(0,0,0,0.8)', zIndex: 5 }}>🔒</span>
                          )}
                        </div>
                        <span className="item-label">{item.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Avatar Frames Grid */}
              <div className="mm-field">
                <label className="mm-field-label">Avatar Frames</label>
                <div className="profile-edit-grid">
                  {AVATAR_FRAMES.map((item) => {
                    const isUnlocked = getDailyState().unlockedAvatars.includes(item.id);
                    const isSelected = tempAvatar === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`profile-edit-item ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`}
                        onClick={() => {
                          if (isUnlocked) {
                            setTempAvatar(item.id);
                            soundEffects.playClick();
                          }
                        }}
                      >
                        <div className={`preview-circle avatar-frame-${item.id}`}>
                          {item.id === 'royal' && <span className="shop-royal-crown" style={{ fontSize: '0.65rem', top: '-7px' }}>👑</span>}
                          <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>{(tempPlayerName || 'P')[0].toUpperCase()}</span>
                        </div>
                        <span className="item-label">{item.name}</span>
                        {!isUnlocked && <span className="lock-icon">🔒</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card Backs Grid */}
              <div className="mm-field">
                <label className="mm-field-label">Card Backs</label>
                <div className="profile-edit-grid">
                  {CARD_BACKS.map((item) => {
                    const isUnlocked = getDailyState().unlockedCardBacks.includes(item.id);
                    const isSelected = tempCardBack === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`profile-edit-item ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`}
                        onClick={() => {
                          if (isUnlocked) {
                            setTempCardBack(item.id);
                            soundEffects.playClick();
                          }
                        }}
                      >
                        <div className={`preview-card-back card-back-${item.id}`}>
                          <div className="card-back-pattern">
                            <span style={{ fontSize: '0.55rem', fontWeight: 900 }}>5T</span>
                          </div>
                        </div>
                        <span className="item-label">{item.name}</span>
                        {!isUnlocked && <span className="lock-icon">🔒</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, margin: 0, padding: '12px 0' }} 
                onClick={() => navigate('main')}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1, margin: 0, padding: '12px 0' }} 
                onClick={handleSaveProfile}
                disabled={!tempPlayerName.trim()}
              >
                Save Profile
              </button>
            </div>
          </div>
        )}

      </div>

      {(view === 'main' || view === 'daily' || view === 'shop') && (
        <div className="mm-footer-tabs">
          <button 
            className={`mm-tab-btn ${activeTab === 'main' && view === 'main' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('main');
              navigate('main');
            }}
          >
            <span className="mm-tab-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
            <span className="mm-tab-label">Main</span>
          </button>

          <button 
            className={`mm-tab-btn ${view === 'daily' ? 'active' : ''}`}
            onClick={() => navigate('daily')}
            style={{ position: 'relative' }}
          >
            <span className="mm-tab-icon" style={{ position: 'relative', display: 'inline-flex' }}>
              {hasDailyNotif && <span className="mm-tab-badge" />}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="8" y1="14" x2="8" y2="14" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="12" y1="14" x2="12" y2="14" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="16" y1="14" x2="16" y2="14" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>
            <span className="mm-tab-label">Daily</span>
          </button>

          <button 
            className={`mm-tab-btn ${view === 'shop' ? 'active' : ''}`}
            onClick={() => navigate('shop')}
          >
            <span className="mm-tab-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </span>
            <span className="mm-tab-label">Shop</span>
          </button>

          <button 
            className={`mm-tab-btn ${activeTab === 'me' && view === 'main' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('me');
              navigate('main');
            }}
          >
            <span className="mm-tab-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <span className="mm-tab-label">Me</span>
          </button>
        </div>
      )}
    </div>
  );
};
