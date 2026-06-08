import React, { useState } from 'react';
import type { AiLevel } from '../utils/gameHelpers';

interface MainMenuProps {
  onStartOffline: (settings: OfflineSettings) => void;
  onJoinOnline: (roomId: string, name: string) => void;
  onCreateOnline: (name: string, maxRounds: number) => void;
}

export interface OfflineSettings {
  playerName: string;
  aiCount: number;
  aiLevel: AiLevel | 'MIXED';
  maxRounds: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartOffline,
  onJoinOnline,
  onCreateOnline,
}) => {
  const [view, setView] = useState<'main' | 'offline' | 'online-choice' | 'online-join' | 'online-create' | 'settings'>('main');
  const [playerName, setPlayerName] = useState<string>(() => localStorage.getItem('tickPlayerName') || 'Player');
  const [aiCount, setAiCount] = useState<number>(3);
  const [maxRounds, setMaxRounds] = useState<number>(20);
  const [roomId, setRoomId] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const handleStartOffline = () => {
    localStorage.setItem('tickPlayerName', playerName);
    onStartOffline({
      playerName,
      aiCount,
      aiLevel: 'MEDIUM',
      maxRounds,
    });
  };

  const handleJoinOnline = () => {
    if (!roomId.trim() || !playerName.trim()) return;
    localStorage.setItem('tickPlayerName', playerName);
    onJoinOnline(roomId.trim().toUpperCase(), playerName);
  };

  const handleCreateOnline = () => {
    if (!playerName.trim()) return;
    localStorage.setItem('tickPlayerName', playerName);
    onCreateOnline(playerName, maxRounds);
  };

  return (
    <div className="menu-container">
      {view === 'main' && (
        <div className="menu-card glass-panel">
          <div className="menu-logo-area">
            <h1 className="menu-title">5 Cards</h1>
            <p className="menu-subtitle">Traditional Indian Card Game</p>
          </div>

          <div className="floating-cards-preview">
            <div className="floating-preview-card card-1" />
            <div className="floating-preview-card card-2">5</div>
            <div className="floating-preview-card card-3" />
          </div>
          
          <div className="menu-options">
            <button className="btn-primary" onClick={() => setView('offline')}>
              Play Offline (vs AI)
            </button>
            <button className="btn-secondary" onClick={() => setView('online-choice')}>
              Play Online (Multiplayer)
            </button>
            <button className="btn-secondary" onClick={() => setView('settings')}>
              Rules & Settings
            </button>
            <button className="btn-secondary" onClick={() => alert('Thanks for playing! Close the browser tab to exit.')}>
              Exit
            </button>
          </div>
        </div>
      )}

      {view === 'offline' && (
        <div className="menu-card glass-panel">
          <h2 className="menu-title" style={{ fontSize: '2rem', marginBottom: '24px' }}>Offline Setup</h2>
          
          <div className="settings-group">
            <label className="settings-label">Your Name</label>
            <input 
              type="text" 
              className="settings-input" 
              value={playerName} 
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter name"
            />
          </div>

          <div className="settings-group">
            <label className="settings-label">AI Opponents</label>
            <div className="tab-selector">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`tab-option ${aiCount === n ? 'active' : ''}`}
                  onClick={() => setAiCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>



          <div className="settings-group">
            <label className="settings-label">Number of Rounds</label>
            <div className="tab-selector">
              {([3, 5, 10, 20] as const).map(rounds => (
                <button
                  key={rounds}
                  type="button"
                  className={`tab-option ${maxRounds === rounds ? 'active' : ''}`}
                  onClick={() => setMaxRounds(rounds)}
                >
                  {rounds} {rounds === 3 ? '(Quick)' : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="menu-options" style={{ marginTop: '32px' }}>
            <button className="btn-primary" onClick={handleStartOffline}>
              Start Game 🚀
            </button>
            <button className="btn-secondary" onClick={() => setView('main')}>
              Back
            </button>
          </div>
        </div>
      )}

      {view === 'online-choice' && (
        <div className="menu-card glass-panel">
          <h2 className="menu-title" style={{ fontSize: '2rem', marginBottom: '24px' }}>Online Multiplayer</h2>
          
          <div className="settings-group">
            <label className="settings-label">Your Screen Name</label>
            <input 
              type="text" 
              className="settings-input" 
              value={playerName} 
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter name"
            />
          </div>

          <div className="menu-options" style={{ marginTop: '24px' }}>
            <button className="btn-primary" onClick={() => setView('online-create')} disabled={!playerName.trim()}>
              Create Custom Room
            </button>
            <button className="btn-secondary" onClick={() => setView('online-join')} disabled={!playerName.trim()}>
              Join Room via Code
            </button>
            <button className="btn-secondary" onClick={() => setView('main')}>
              Back
            </button>
          </div>
        </div>
      )}

      {view === 'online-create' && (
        <div className="menu-card glass-panel">
          <h2 className="menu-title" style={{ fontSize: '2rem', marginBottom: '24px' }}>Create Room</h2>
          
          <div className="settings-group">
            <label className="settings-label">Number of Rounds</label>
            <div className="tab-selector">
              {([3, 5, 10, 20] as const).map(rounds => (
                <button
                  key={rounds}
                  type="button"
                  className={`tab-option ${maxRounds === rounds ? 'active' : ''}`}
                  onClick={() => setMaxRounds(rounds)}
                >
                  {rounds}
                </button>
              ))}
            </div>
          </div>

          <div className="menu-options" style={{ marginTop: '32px' }}>
            <button className="btn-primary" onClick={handleCreateOnline}>
              Create & Join Lobby
            </button>
            <button className="btn-secondary" onClick={() => setView('online-choice')}>
              Back
            </button>
          </div>
        </div>
      )}

      {view === 'online-join' && (
        <div className="menu-card glass-panel">
          <h2 className="menu-title" style={{ fontSize: '2rem', marginBottom: '24px' }}>Join Room</h2>
          
          <div className="settings-group">
            <label className="settings-label">Room Code (6 characters)</label>
            <input 
              type="text" 
              className="settings-input" 
              value={roomId} 
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="e.g. ABCDEF"
              maxLength={6}
              style={{ textTransform: 'uppercase', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px', fontWeight: 800 }}
            />
          </div>

          <div className="menu-options" style={{ marginTop: '32px' }}>
            <button className="btn-primary" onClick={handleJoinOnline} disabled={roomId.length < 4}>
              Join Room
            </button>
            <button className="btn-secondary" onClick={() => setView('online-choice')}>
              Back
            </button>
          </div>
        </div>
      )}

      {view === 'settings' && (
        <div className="menu-card glass-panel">
          <h2 className="menu-title" style={{ fontSize: '2rem', marginBottom: '24px' }}>Game Settings</h2>
          
          <div className="settings-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="settings-label" style={{ marginBottom: 0 }}>Sound Effects</span>
            <input 
              type="checkbox" 
              checked={soundEnabled} 
              onChange={(e) => setSoundEnabled(e.target.checked)}
              style={{ width: '22px', height: '22px', cursor: 'pointer' }}
            />
          </div>

          <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left', lineHeight: '1.5', fontSize: '0.8rem' }}>
            <strong style={{ color: 'var(--color-gold)', display: 'block', marginBottom: '8px', fontSize: '0.85rem' }}>RULES SUMMARY:</strong>
            - 5 cards dealt to each player.<br />
            - Selected Joker rank is **Revealed Rank + 1** (e.g. revealed 6 means all 7s are Jokers).<br />
            - Joker cards are worth **0 points**.<br />
            - Draw 1 card from Draw Pile (face down) or Dropped Card Pile (face up). Drop 1 card.<br />
            - Declare signifies that you have the **lowest hand value**.<br />
            - Declared (correct) = **0 points** for round.<br />
            - Wrong declare (someone has equal or lower) = **80 points** penalty.
          </div>

          <div className="menu-options" style={{ marginTop: '32px' }}>
            <button className="btn-primary" onClick={() => setView('main')}>
              Save & Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

