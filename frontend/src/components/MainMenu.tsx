import React, { useState } from 'react';
import type { AiLevel } from '../utils/gameHelpers';

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

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartOffline,
  onJoinOnline,
  onCreateOnline,
  onShowTutorial,
}) => {
  const [view, setView] = useState<'main' | 'offline' | 'online-choice' | 'online-join' | 'online-create' | 'settings'>('main');
  const [playerName, setPlayerName] = useState<string>(() => localStorage.getItem('tickPlayerName') || 'Player');
  const [aiCount, setAiCount] = useState<number>(3);
  const [maxRounds, setMaxRounds] = useState<number>(20);
  const [roomId, setRoomId] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => localStorage.getItem('soundEnabled') !== 'false');
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() => localStorage.getItem('vibrationEnabled') !== 'false');

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
        <div className="menu-card glass-panel" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '24px' }}>
          <h2 className="menu-title" style={{ fontSize: '1.8rem', marginBottom: '12px' }}>Game Settings</h2>
          
          <div className="settings-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px' }}>
            <span className="settings-label" style={{ marginBottom: 0, fontSize: '0.95rem' }}>Sound Effects</span>
            <input 
              type="checkbox" 
              checked={soundEnabled} 
              onChange={(e) => setSoundEnabled(e.target.checked)}
              style={{ width: '22px', height: '22px', cursor: 'pointer' }}
            />
          </div>

          <div className="settings-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px' }}>
            <span className="settings-label" style={{ marginBottom: 0, fontSize: '0.95rem' }}>Vibration</span>
            <input 
              type="checkbox" 
              checked={vibrationEnabled} 
              onChange={(e) => setVibrationEnabled(e.target.checked)}
              style={{ width: '22px', height: '22px', cursor: 'pointer' }}
            />
          </div>

          <div className="settings-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px' }}>
            <span className="settings-label" style={{ marginBottom: 0, fontSize: '0.95rem' }}>Game Tutorial</span>
            <button 
              className="btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.8rem', margin: 0 }}
              onClick={onShowTutorial}
            >
              Show Guide 📖
            </button>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '16px 20px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'left',
            lineHeight: '1.6',
            fontSize: '0.85rem',
            flex: '1 1 auto',
            maxHeight: 'min(240px, 45vh)',
            overflowY: 'auto',
            marginBottom: '16px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.2) transparent'
          }}>
            <strong style={{ color: 'var(--color-gold)', display: 'block', marginBottom: '12px', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              📜 Game Rules
            </strong>
            
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: 'var(--color-cyan)', display: 'block', marginBottom: '2px' }}>🎯 Objective</strong>
              Minimize the points in your hand. The player with the lowest total score at the end of all rounds wins the game.
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: 'var(--color-cyan)', display: 'block', marginBottom: '2px' }}>🃏 Joker System</strong>
              - A card is revealed at the start of each round: its rank is the **Joker Rank** (e.g., if a 6 is revealed, all 6s in play are Jokers).<br />
              - All cards of the Joker Rank, plus the 2 printed Jokers, are worth **0 points**.
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: 'var(--color-cyan)', display: 'block', marginBottom: '2px' }}>🔢 Card Values</strong>
              - **Jokers:** 0 points<br />
              - **Aces:** 1 point<br />
              - **Numbered Cards (2-10):** Face value (2 to 10 points)<br />
              - **Jack / Queen / King:** 11 / 12 / 13 points
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: 'var(--color-cyan)', display: 'block', marginBottom: '2px' }}>🔄 Turn Actions</strong>
              On your turn, you must perform one of the following:<br />
              1. **Declare "5 Cards" (Tick):** Can only be done at the start of your turn (before drawing or discarding) if you believe you have the lowest hand value.<br />
              2. **Discard & Draw:**
                 - Discard **one card** or **multiple cards of the same rank** (e.g., two 5s).
                 - Draw **one card** from the face-down Draw Pile or the previously discarded card pile.
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: 'var(--color-cyan)', display: 'block', marginBottom: '2px' }}>⚡ The Matching Rule</strong>
              If the rank of a card you discard matches the rank of the top card of the discard pile *before* your discard, you **do not need to draw**. This reduces your hand size!
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: 'var(--color-cyan)', display: 'block', marginBottom: '2px' }}>📢 Declaring "5 Cards" (Tick)</strong>
              - **Correct Declare:** If your hand value is indeed the lowest (or tied for lowest), you get **0 points** for the round.<br />
              - **Wrong Declare:** If any player has a strictly lower hand value than you, you get an **80-point penalty**, and the player with the lowest hand value gets **0 points**.<br />
              - **Others:** Players get points equal to their remaining hand values.
            </div>

            <div>
              <strong style={{ color: 'var(--color-cyan)', display: 'block', marginBottom: '2px' }}>🏁 Round Ending</strong>
              A round ends when a player declares, runs out of cards (0 cards in hand), or the Draw Pile is exhausted.
            </div>
          </div>

          <div className="menu-options" style={{ marginTop: 'auto' }}>
            <button className="btn-primary" onClick={() => {
              localStorage.setItem('soundEnabled', soundEnabled ? 'true' : 'false');
              localStorage.setItem('vibrationEnabled', vibrationEnabled ? 'true' : 'false');
              setView('main');
            }}>
              Save & Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

