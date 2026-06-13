import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useAgoraVoice } from './hooks/useAgoraVoice';
import { MainMenu } from './components/MainMenu';
import type { OfflineSettings } from './components/MainMenu';
import { GameTable } from './components/GameTable';
import { RoundResultModal } from './components/RoundResultModal';
import { GameOverModal } from './components/GameOverModal';
import { InactivityKickModal } from './components/InactivityKickModal';
import type { AiLevel } from './utils/gameHelpers';
import { soundEffects } from './utils/soundEffects';

import { checkForUpdates } from "./services/updateChecker";
import UpdateModal from "./components/UpdateModal";
import { TutorialModal } from "./components/TutorialModal";
import { initPersistentStorage, savePersistentItem } from "./utils/persistentStorage";
import { setupLocalNotifications } from "./utils/localNotifications";

export const App: React.FC = () => {
  const [screen, setScreen] = useState<'menu' | 'table'>('menu');
  const [playerId, setPlayerId] = useState<string>('');
  const [isKicked, setIsKicked] = useState<boolean>(false);
  const [storageInitialized, setStorageInitialized] = useState<boolean>(false);
  const [update, setUpdate] = useState<any>(null);
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    return localStorage.getItem('hasSeenTutorial') === null;
  });
  
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
    endGame,
    latestReaction,
    sendReaction,
    apiBase,
  } = useWebSocket();

  const {
    muted: voiceMuted,
    activeSpeakers,
    joinVoice,
    leaveVoice,
    toggleMute: toggleVoiceMute,
  } = useAgoraVoice();

  // Auto-connect to Agora Voice Chat when entering game table
  useEffect(() => {
    if (screen === 'table' && gameState?.gameId && playerId) {
      joinVoice(gameState.gameId, playerId);
    } else {
      leaveVoice();
    }
  }, [screen, gameState?.gameId, playerId, joinVoice, leaveVoice]);

  // Initialize Battery Saver class on launch
  useEffect(() => {
    const isBatterySaver = localStorage.getItem('batterySaverEnabled') === 'true';
    if (isBatterySaver) {
      document.body.classList.add('battery-saver');
    } else {
      document.body.classList.remove('battery-saver');
    }
  }, []);

  const prevGameRef = useRef<any>(null);

  // Sound effects listener based on Game State transitions
  useEffect(() => {
    if (!gameState) {
      prevGameRef.current = null;
      return;
    }
    const prev = prevGameRef.current;
    prevGameRef.current = gameState;

    if (!prev) return;

    // 1. Shuffle / Next Round start
    if (gameState.status === 'IN_PROGRESS' && (prev.status === 'WAITING_FOR_PLAYERS' || prev.status === 'ROUND_OVER' || gameState.currentRoundNumber > prev.currentRoundNumber)) {
      soundEffects.playShuffle();
      setTimeout(() => {
        soundEffects.playJoker();
      }, 1200);
      return;
    }

    // 2. Round Over / Declare / Normal completion
    if (gameState.status === 'ROUND_OVER' && prev.status === 'IN_PROGRESS') {
      const round = gameState.currentRound;
      if (round) {
        if (round.endCondition === 'TICK') {
          soundEffects.playDeclare();
        }
        
        // After a small delay play win/penalty sound
        setTimeout(() => {
          const self = gameState.players.find(p => p.id === playerId);
          if (self) {
            if (self.roundScore === 80) {
              soundEffects.playPenalty();
            } else if (self.roundScore === 0) {
              soundEffects.playWin();
            } else {
              const roundWinners = gameState.players.filter(p => p.roundScore === 0);
              const isWinner = roundWinners.some(w => w.id === playerId);
              if (isWinner) {
                soundEffects.playWin();
              } else {
                soundEffects.playClick();
              }
            }
          }
        }, 900);
      }
      return;
    }

    // 3. Gameplay actions (during IN_PROGRESS)
    if (gameState.status === 'IN_PROGRESS' && prev.status === 'IN_PROGRESS') {
      // Check if discard pile grew
      const prevDiscardSize = prev.currentRound?.discardPile?.length || 0;
      const currDiscardSize = gameState.currentRound?.discardPile?.length || 0;
      if (currDiscardSize > prevDiscardSize) {
        soundEffects.playDiscard();
        return;
      }

      // Check if draw pile shrank or someone's cardCount grew
      const prevDrawSize = prev.currentRound?.drawPileSize || 0;
      const currDrawSize = gameState.currentRound?.drawPileSize || 0;
      if (currDrawSize < prevDrawSize) {
        soundEffects.playDraw();
        return;
      }
      
      const prevTotalCards = prev.players.reduce((sum: number, p: any) => sum + p.cardCount, 0);
      const currTotalCards = gameState.players.reduce((sum: number, p: any) => sum + p.cardCount, 0);
      if (currTotalCards > prevTotalCards) {
        soundEffects.playDraw();
        return;
      }
    }
  }, [gameState, playerId]);

  // Micro-vibrate when it becomes the player's turn (runs on mobile WebView)
  useEffect(() => {
    const activePlayerId = gameState?.currentRound && gameState.players && !gameState.currentRound.roundEnded
      ? gameState.players[gameState.currentRound.currentPlayerIndex]?.id
      : null;

    if (gameState && gameState.status === 'IN_PROGRESS' && activePlayerId === playerId) {
      const vibrationEnabled = localStorage.getItem('vibrationEnabled') !== 'false';
      if (vibrationEnabled && navigator.vibrate) {
        navigator.vibrate(80); // 80ms micro-vibration
      }
    }
  }, [gameState?.currentRound?.currentPlayerIndex, gameState?.status, playerId]);

  // Global sound click listener
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'BUTTON' || target.closest('button') || target.classList.contains('game-card') || target.closest('.game-card'))) {
        soundEffects.playClick();
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  // Initialize unique playerId and check for active game session to reconnect
  useEffect(() => {
    const startup = async () => {
      // Restore any settings if localStorage was cleared
      await initPersistentStorage();
      setStorageInitialized(true);

      // Configure native local reminders on slots
      await setupLocalNotifications();

      let id = localStorage.getItem('tickPlayerId');
      if (!id) {
        id = 'USR_' + Math.random().toString(36).substring(2, 8).toUpperCase();
        await savePersistentItem('tickPlayerId', id);
      }
      setPlayerId(id);

      const activeGameId = localStorage.getItem('activeGameId');
      if (activeGameId) {
        try {
          const res = await fetch(`${apiBase}/api/game/${activeGameId}?playerId=${id}`);
          if (res.ok) {
            const data = await res.json();
            const isInGame = data.players?.some((p: any) => p.id === id);
            if (isInGame && data.status !== 'GAME_OVER') {
              connect(activeGameId, id);
              setScreen('table');
            } else {
              localStorage.removeItem('activeGameId');
            }
          } else {
            localStorage.removeItem('activeGameId');
          }
        } catch (err) {
          console.error('Failed to restore active game session:', err);
          localStorage.removeItem('activeGameId');
        }
      }
    };

    startup();
  }, [connect, apiBase]);

  // Auto-leave if player is kicked/removed from the game due to inactivity
  useEffect(() => {
    if (screen === 'table' && gameState && gameState.players && playerId) {
      const isPlayerStillInGame = gameState.players.some(p => p.id === playerId);
      if (!isPlayerStillInGame) {
        localStorage.removeItem('activeGameId');
        disconnect();
        setScreen('menu');
        setIsKicked(true);
      }
    }
  }, [screen, gameState, playerId, disconnect]);

  // Check for updates on startup (runs once on mount, works only in native mobile app)
  useEffect(() => {
    const isNativeMobileApp = !!(window as any).Capacitor;
    if (isNativeMobileApp) {
      checkForUpdates()
        .then(data => {
          if (data) {
            setUpdate(data);
          }
        })
        .catch(err => {
          console.log(err);
        });
    }
  }, []);

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
      localStorage.setItem('activeGameId', gameId);
      connect(gameId, playerId);
      setScreen('table');
    } catch (e) {
      console.error('Failed to start offline game', e);
      alert('Error initializing offline game.');
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
      localStorage.setItem('activeGameId', gameId);
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
      localStorage.setItem('activeGameId', gameId);
      connect(gameId, playerId);
      setScreen('table');
    } catch (e) {
      console.error('Failed to join online game', e);
      alert('Error joining room. Check the code and try again.');
    }
  };

  const handleLeave = () => {
    localStorage.removeItem('activeGameId');
    disconnect();
    setScreen('menu');
  };

  if (!storageInitialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#040814', color: '#22d3ee', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '1px' }}>LOADING...</div>
      </div>
    );
  }

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
          onShowTutorial={() => setShowTutorial(true)}
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
              Establishing connection.
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
            latestReaction={latestReaction}
            onSendReaction={sendReaction}
            voiceMuted={voiceMuted}
            activeSpeakers={activeSpeakers}
            onToggleVoiceMute={toggleVoiceMute}
          />

          {/* Round Results Screen Overlay */}
          {gameState.status === 'ROUND_OVER' && (
            <RoundResultModal
              gameState={gameState}
              currentPlayerId={playerId}
              onNextRound={markReady}
              onLeave={handleLeave}
              onShowLeaderboard={endGame}
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

      {update && (
        <UpdateModal
          version={update.version}
          apkUrl={update.apkUrl}
        />
      )}

      {/* Onboarding Tutorial Modal */}
      <TutorialModal
        isOpen={showTutorial}
        onClose={() => {
          savePersistentItem('hasSeenTutorial', 'true');
          setShowTutorial(false);
        }}
      />
    </div>
  );
};
export default App;
