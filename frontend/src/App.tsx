import React, { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { MainMenu } from './components/MainMenu';
import type { OfflineSettings } from './components/MainMenu';
import { GameTable } from './components/GameTable';
import { RoundResultModal } from './components/RoundResultModal';
import { GameOverModal } from './components/GameOverModal';
import { InactivityKickModal } from './components/InactivityKickModal';
import type { AiLevel } from './utils/gameHelpers';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<'menu' | 'table'>('menu');
  const [playerId, setPlayerId] = useState<string>('');
  const [isKicked, setIsKicked] = useState<boolean>(false);
  
  const {
    gameState,
    error,
    connect,
    disconnect,
    drawCard,
    discardCard,
    discardMultipleCards,
    declareTick,
    endTurn,
    markReady,
    startNewGame,
    apiBase,
  } = useWebSocket();


  // Initialize unique playerId
  useEffect(() => {
    let id = localStorage.getItem('tickPlayerId');
    if (!id) {
      id = 'USR_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem('tickPlayerId', id);
    }
    setPlayerId(id);
  }, []);

  // Auto-leave if player is kicked/removed from the game due to inactivity
  useEffect(() => {
    if (screen === 'table' && gameState && gameState.players && playerId) {
      const isPlayerStillInGame = gameState.players.some(p => p.id === playerId);
      if (!isPlayerStillInGame) {
        disconnect();
        setScreen('menu');
        setIsKicked(true);
      }
    }
  }, [screen, gameState, playerId, disconnect]);

  const handleStartOffline = async (settings: OfflineSettings) => {
    try {
      // 1. Create a game session
      const createRes = await fetch(`${apiBase}/api/game/create?maxRounds=${settings.maxRounds}&isMultiplayer=false`, {
        method: 'POST',
      });
      const createData = await createRes.json();
      const gameId = createData.gameId;

      // 2. Join the human player
      await fetch(`${apiBase}/api/game/${gameId}/join?playerId=${playerId}&name=${encodeURIComponent(settings.playerName)}`, {
        method: 'POST',
      });

      // 3. Add AI players
      for (let i = 0; i < settings.aiCount; i++) {
        const level: AiLevel = 'MEDIUM';
        const aiName = `Bot ${i + 1}`;
        await fetch(`${apiBase}/api/game/${gameId}/add-ai?name=${encodeURIComponent(aiName)}&aiLevel=${level}`, {
          method: 'POST',
        });
      }

      // 4. Start the game session
      await fetch(`${apiBase}/api/game/${gameId}/start`, {
        method: 'POST',
      });

      // 5. Connect WebSocket
      connect(gameId, playerId);
      setScreen('table');
    } catch (e) {
      console.error('Failed to start offline game', e);
      alert('Error initializing offline game. Is the backend running?');
    }
  };

  const handleCreateOnline = async (name: string, maxRounds: number) => {
    try {
      // 1. Create a game session
      const createRes = await fetch(`${apiBase}/api/game/create?maxRounds=${maxRounds}&isMultiplayer=true`, {
        method: 'POST',
      });
      const createData = await createRes.json();
      const gameId = createData.gameId;

      // 2. Join player
      await fetch(`${apiBase}/api/game/${gameId}/join?playerId=${playerId}&name=${encodeURIComponent(name)}`, {
        method: 'POST',
      });

      // 3. Connect WebSocket
      connect(gameId, playerId);
      setScreen('table');
    } catch (e) {
      console.error('Failed to create online game', e);
      alert('Error creating room. Is the backend running?');
    }
  };

  const handleJoinOnline = async (gameId: string, name: string) => {
    try {
      // 1. Join player
      const joinRes = await fetch(`${apiBase}/api/game/${gameId}/join?playerId=${playerId}&name=${encodeURIComponent(name)}`, {
        method: 'POST',
      });

      if (!joinRes.ok) {
        const errorData = await joinRes.json();
        alert(errorData.error || 'Failed to join room');
        return;
      }

      // 2. Connect WebSocket
      connect(gameId, playerId);
      setScreen('table');
    } catch (e) {
      console.error('Failed to join online game', e);
      alert('Error joining room. Check the code and try again.');
    }
  };

  const handleLeave = () => {
    disconnect();
    setScreen('menu');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Toast Error Banner */}
      {error && (
        <div 
          className="glass-panel" 
          style={{ 
            position: 'fixed', 
            top: '80px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            padding: '12px 24px', 
            borderColor: 'var(--color-red)', 
            color: 'var(--color-red)',
            fontWeight: 800,
            fontSize: '0.9rem',
            zIndex: 999,
            boxShadow: '0 0 15px var(--color-red-glow)'
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {screen === 'menu' && (
        <MainMenu
          onStartOffline={handleStartOffline}
          onJoinOnline={handleJoinOnline}
          onCreateOnline={handleCreateOnline}
        />
      )}

      {screen === 'table' && !gameState && (
        <div className="menu-container">
          <div className="menu-card glass-panel" style={{ width: '400px' }}>
            <h2 className="menu-title" style={{ fontSize: '2rem', marginBottom: '8px' }}>Connecting</h2>
            <p className="menu-subtitle" style={{ color: 'var(--color-cyan)', textShadow: '0 0 10px var(--color-cyan-glow)', fontSize: '0.85rem' }}>
              Syncing Game Session...
            </p>
            <div style={{ marginTop: '24px', color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
              Establishing connection. If this takes too long, verify that the Spring Boot backend is active.
            </div>
            <button className="btn-secondary" style={{ marginTop: '30px', marginInline: 'auto', padding: '10px 20px', fontSize: '0.9rem' }} onClick={handleLeave}>
              Cancel Connection
            </button>
          </div>
        </div>
      )}

      {screen === 'table' && gameState && (
        <>
          <GameTable
            gameState={gameState}
            currentPlayerId={playerId}
            onDraw={drawCard}
            onDiscard={discardCard}
            onDiscardMulti={discardMultipleCards}
            onTick={declareTick}
            onEndTurn={endTurn}
            onLeave={handleLeave}
            onReady={markReady}
          />

          {/* Round Results Screen Overlay */}
          {gameState.status === 'ROUND_OVER' && (
            <RoundResultModal
              gameState={gameState}
              currentPlayerId={playerId}
              onNextRound={markReady}
              onLeave={handleLeave}
            />
          )}

          {/* Game Over Leaderboard Overlay */}
          {gameState.status === 'GAME_OVER' && (
            <GameOverModal
              gameState={gameState}
              currentPlayerId={playerId}
              onPlayAgain={startNewGame}
              onMainMenu={handleLeave}
            />
          )}
        </>
      )}

      {/* Inactivity Warning Modal */}
      <InactivityKickModal isOpen={isKicked} onClose={() => setIsKicked(false)} />
    </div>
  );
};
export default App;
