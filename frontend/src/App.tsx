import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { MainMenu } from './components/MainMenu';
import type { OfflineSettings } from './components/MainMenu';
import { GameTable } from './components/GameTable';
import { RoundResultModal } from './components/RoundResultModal';
import { GameOverModal } from './components/GameOverModal';
import { InactivityKickModal } from './components/InactivityKickModal';
import { soundEffects } from './utils/soundEffects';

import { checkForUpdates } from "./services/updateChecker";
import UpdateModal from "./components/UpdateModal";
import { TutorialModal } from "./components/TutorialModal";
import { initPersistentStorage, savePersistentItem } from "./utils/persistentStorage";
import { setupLocalNotifications } from "./utils/localNotifications";
import { getLocalStats, saveLocalStats } from './utils/statsSystem';
import { pullAndMergeStats } from './services/statsSync';
import { getMatchHistory } from './utils/statsSystem';
import type { UpdateInfo } from './utils/gameHelpers';
import { Haptics } from '@capacitor/haptics';
import { App as CapacitorApp } from '@capacitor/app';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<'menu' | 'table'>('menu');
  const [playerId, setPlayerId] = useState<string>('');
  const [isKicked, setIsKicked] = useState<boolean>(false);
  const [storageInitialized, setStorageInitialized] = useState<boolean>(false);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [showAppLeaveConfirm, setShowAppLeaveConfirm] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(null);
  
  const menuBackButtonHandlerRef = useRef<(() => boolean) | null>(null);
  
  const {
    gameState,
    connected,
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
    startNextRound,
    endGame,
    latestReaction,
    sendReaction,
    apiBase,
    wsUrl,
    stompClientRef,
    leaveGame,
    isSpectator,
    reconnectCountdown,
    isReconnecting,
    chatMessages,
    sendChatMessage,
    isOffline,
  } = useWebSocket();

  // Initialize Battery Saver class on launch and request motion permission on first interaction
  useEffect(() => {
    // Read once; fall back to detecting mobile if never set
    const saved = localStorage.getItem('batterySaverEnabled');
    const isBatterySaver = saved !== null
      ? saved === 'true'
      : /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || !!(window as any).Capacitor;
    if (saved === null) {
      localStorage.setItem('batterySaverEnabled', isBatterySaver ? 'true' : 'false');
    }

    if (isBatterySaver) {
      document.body.classList.add('battery-saver');
    } else {
      document.body.classList.remove('battery-saver');
    }

    const requestMotionPermission = () => {
      const DeviceMotion = (window as any).DeviceMotionEvent;
      if (DeviceMotion && typeof DeviceMotion.requestPermission === 'function') {
        DeviceMotion.requestPermission()
          .then((response: string) => {
            console.log('Motion permission requested, result:', response);
          })
          .catch((err: any) => {
            console.warn('Motion permission request failed:', err);
          });
      }
      document.removeEventListener('click', requestMotionPermission);
      document.removeEventListener('touchstart', requestMotionPermission);
    };

    document.addEventListener('click', requestMotionPermission);
    document.addEventListener('touchstart', requestMotionPermission);

    return () => {
      document.removeEventListener('click', requestMotionPermission);
      document.removeEventListener('touchstart', requestMotionPermission);
    };
  }, []);

  // Hardware/navigation back button handling for native mobile devices
  useEffect(() => {
    if (!(window as any).Capacitor) return;

    const listenerPromise = CapacitorApp.addListener('backButton', () => {
      if (showAppLeaveConfirm) {
        setShowAppLeaveConfirm(false);
      } else if (showExitConfirm) {
        setShowExitConfirm(false);
      } else if (showTutorial) {
        setShowTutorial(false);
      } else if (isKicked) {
        setIsKicked(false);
      } else if (screen === 'table') {
        setShowAppLeaveConfirm(true);
      } else if (screen === 'menu') {
        if (menuBackButtonHandlerRef.current) {
          const handled = menuBackButtonHandlerRef.current();
          if (handled) return;
        }
        setShowExitConfirm(true);
      }
    });

    return () => {
      listenerPromise.then(handle => handle.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, showAppLeaveConfirm, showExitConfirm, showTutorial, isKicked]);

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

    // 1. Next Round start
    if (gameState.status === 'IN_PROGRESS' && (prev.status === 'WAITING_FOR_PLAYERS' || prev.status === 'ROUND_OVER' || gameState.currentRoundNumber > prev.currentRoundNumber)) {
      if (gameState.currentRoundNumber === 1) {
        localStorage.removeItem('processedGameId');
        localStorage.removeItem('lastGameResults');
        localStorage.setItem('consecutive_correct_ticks', '0');
        // Clear processed round indicators
        for (let i = 1; i <= 30; i++) {
          localStorage.removeItem(`processed_streak_round_${i}`);
        }
      }
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
      if (vibrationEnabled) {
        Haptics.vibrate({ duration: 80 }).catch((err) => {
          console.warn('Native haptics failed, trying browser vibrate:', err);
          if (navigator.vibrate) {
            navigator.vibrate(80);
          }
        });
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

      // Check connectivity first — avoid attempting network calls when offline
      if (!navigator.onLine) {
        alert('No internet connection');
        return;
      }

      // Pull & merge stats from backend (restores data after reinstall/browser clear)
      try {
        const result = await pullAndMergeStats(id, getLocalStats(), getMatchHistory());
        if (result) {
          saveLocalStats(result.stats);
          if (result.history.length > 0) {
            savePersistentItem('tickMatchHistory', JSON.stringify(result.history));
          }
        }
      } catch (_) {
        // Silently ignore — local data is always the fallback
      }

      const activeGameId = localStorage.getItem('activeGameId');
      if (activeGameId) {
        try {
          const res = await fetch(`${apiBase}/api/game/${activeGameId}?playerId=${id}`);
          if (res.ok) {
            const data = await res.json();
            const isInGame = data.players?.some((p: any) => p.id === id);
            const isSpectator = data.spectators?.some((s: any) => s.id === id);
            if ((isInGame || isSpectator) && data.status !== 'GAME_OVER') {
              connect(activeGameId, id, isSpectator);
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

  // Listen for Capacitor App state changes (pause/resume) to handle fast reconnection on mobile
  useEffect(() => {
    if (!(window as any).Capacitor) return;

    const listenerPromise = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      console.log('[App] App state changed, isActive:', isActive);
      if (isActive) {
        const activeGameId = localStorage.getItem('activeGameId');
        const id = localStorage.getItem('tickPlayerId');
        if (activeGameId && id && !isOffline) {
          console.log('[App] Foregrounded. Checking WebSocket connection...');
          connect(activeGameId, id, isSpectator);
        }
      }
    });

    return () => {
      listenerPromise.then(handle => handle.remove());
    };
  }, [connect, isSpectator, isOffline]);

  // Auto-leave if player is kicked/removed from the game due to inactivity
  useEffect(() => {
    if (screen === 'table' && gameState && playerId) {
      if (isSpectator) {
        const isSpectatorStillInGame = gameState.spectators?.some(s => s.id === playerId);
        if (gameState.spectators && !isSpectatorStillInGame) {
          localStorage.removeItem('activeGameId');
          disconnect();
          setScreen('menu');
          setIsKicked(true);
        }
      } else if (gameState.players) {
        const isPlayerStillInGame = gameState.players.some(p => p.id === playerId);
        if (!isPlayerStillInGame) {
          localStorage.removeItem('activeGameId');
          disconnect();
          setScreen('menu');
          setIsKicked(true);
        }
      }
    }
  }, [screen, gameState, playerId, disconnect, isSpectator]);



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

  // Deep Link listener for native Capacitor App
  useEffect(() => {
    if (!(window as any).Capacitor) return;

    const setupUrlListener = async () => {
      const listener = await CapacitorApp.addListener('appUrlOpen', (data: any) => {
        console.log('[App] App opened with URL:', data.url);
        try {
          const parsedUrl = new URL(data.url);
          const roomParam = parsedUrl.searchParams.get('room')?.trim().toUpperCase();
          if (roomParam && roomParam.length >= 4) {
            setPendingRoomCode(roomParam);
          }
        } catch (e) {
          console.error('[App] Failed to parse launch URL', e);
        }
      });
      return listener;
    };

    const listenerPromise = setupUrlListener();

    return () => {
      listenerPromise.then(handle => handle.remove());
    };
  }, []);


  // Disable pinch-to-zoom and gesture zooming globally
  useEffect(() => {
    const preventPinchZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    const preventGestureZoom = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener('touchstart', preventPinchZoom, { passive: false });
    document.addEventListener('gesturestart', preventGestureZoom);

    return () => {
      document.removeEventListener('touchstart', preventPinchZoom);
      document.removeEventListener('gesturestart', preventGestureZoom);
    };
  }, []);

  const handleNetworkError = useCallback((error: any, defaultMessage: string) => {
    if (!navigator.onLine || error instanceof TypeError) {
      alert('No internet connection');
    } else {
      alert(defaultMessage);
    }
  }, []);

  /** Saves the player name to local stats and persistent storage (DRY helper). */
  const savePlayerName = useCallback((name: string) => {
    const stats = getLocalStats();
    stats.name = name;
    saveLocalStats(stats);
  }, []);

  const handleStartOffline = async (settings: OfflineSettings) => {
    try {
      // Save name locally
      const stats = getLocalStats();
      stats.name = settings.playerName;
      saveLocalStats(stats);

      // Save offline configurations for connect() hook initialization
      localStorage.setItem('offline_maxRounds', settings.maxRounds.toString());
      localStorage.setItem('offline_aiCount', settings.aiCount.toString());
      localStorage.setItem('offline_playerName', settings.playerName);
      localStorage.removeItem('localGameState');

      // Connect locally
      const gameId = 'LOCAL_GAME';
      localStorage.setItem('activeGameId', gameId);
      connect(gameId, playerId, false, true);
      setScreen('table');
    } catch (e) {
      console.error('Failed to start offline game', e);
      handleNetworkError(e, 'Error initializing offline game.');
    }
  };

  const handleFindMatchSuccess = async (gameId: string, name: string) => {
    if (!navigator.onLine) {
      alert('No internet connection');
      return;
    }
    try {
      // The server already added us as a player during matchmaking — just connect the WS
      savePlayerName(name);
      localStorage.setItem('activeGameId', gameId);
      connect(gameId, playerId);
      setScreen('table');
    } catch (e) {
      console.error('Failed to join matchmade game', e);
    }
  };

  const handleCreateOnline = async (name: string, maxRounds: number) => {
    if (!navigator.onLine) {
      alert('No internet connection');
      return;
    }
    try {
      // 1. Create a game session
      const createRes = await fetch(`${apiBase}/api/game/create?maxRounds=${maxRounds}&isMultiplayer=true`, {
        method: 'POST',
      });
      const createData = await createRes.json();
      const gameId = createData.gameId;

      // Save name locally
      savePlayerName(name);

      // 2. Join player
      const avatar = localStorage.getItem('selected_avatar') || 'none';
      const avatarPic = localStorage.getItem('selected_avatar_pic') || 'none';
      await fetch(`${apiBase}/api/game/${gameId}/join?playerId=${playerId}&name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}&avatarPic=${encodeURIComponent(avatarPic)}`, {
        method: 'POST',
      });

      // 3. Connect WebSocket
      localStorage.setItem('activeGameId', gameId);
      connect(gameId, playerId);
      setScreen('table');
    } catch (e) {
      console.error('Failed to create online game', e);
      handleNetworkError(e, 'Error creating room. Is the backend running?');
    }
  };

  const handleJoinOnline = useCallback(async (gameId: string, name: string) => {
    if (!navigator.onLine) {
      alert('No internet connection');
      return;
    }
    try {
      // Save name locally
      savePlayerName(name);

      // 1. Join player
      const avatar = localStorage.getItem('selected_avatar') || 'none';
      const avatarPic = localStorage.getItem('selected_avatar_pic') || 'none';
      const joinRes = await fetch(`${apiBase}/api/game/${gameId}/join?playerId=${playerId}&name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}&avatarPic=${encodeURIComponent(avatarPic)}`, {
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
      handleNetworkError(e, 'Error joining room. Check the code and try again.');
    }
  }, [apiBase, playerId, connect, savePlayerName, handleNetworkError]);

  // Handle URL deep link room join (Web & Native pending)
  // This effect is placed AFTER handleJoinOnline declaration to avoid TS2448
  useEffect(() => {
    if (storageInitialized && playerId && screen === 'menu' && navigator.onLine) {
      if (pendingRoomCode) {
        const roomCode = pendingRoomCode;
        setPendingRoomCode(null);
        const stats = getLocalStats();
        const name = stats.name || 'Player';
        handleJoinOnline(roomCode, name);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room')?.trim().toUpperCase();
      if (roomParam && roomParam.length >= 4) {
        // Clear search parameter from URL to prevent rejoin on reload
        window.history.replaceState({}, document.title, window.location.pathname);
        const stats = getLocalStats();
        const name = stats.name || 'Player';
        handleJoinOnline(roomParam, name);
      }
    }
  }, [storageInitialized, playerId, screen, pendingRoomCode, handleJoinOnline]);

  const handleSpectateOnline = async (gameId: string, name: string) => {
    if (!navigator.onLine) {
      alert('No internet connection');
      return;
    }
    try {
      // Save name locally
      savePlayerName(name);

      // 1. Join spectator
      const spectateRes = await fetch(`${apiBase}/api/game/${gameId}/spectate?playerId=${playerId}&name=${encodeURIComponent(name)}`, {
        method: 'POST',
      });

      if (!spectateRes.ok) {
        const errorData = await spectateRes.json();
        alert(errorData.error || 'Failed to spectate room');
        return;
      }

      // 2. Connect WebSocket
      localStorage.setItem('activeGameId', gameId);
      connect(gameId, playerId, true);
      setScreen('table');
    } catch (e) {
      console.error('Failed to spectate online game', e);
      handleNetworkError(e, 'Error spectating room. Check the code and try again.');
    }
  };

  const handleLeave = () => {
    localStorage.removeItem('activeGameId');
    leaveGame();
    setTimeout(() => {
      disconnect();
    }, 100);
    setScreen('menu');
    setShowAppLeaveConfirm(false);
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
          onSpectateOnline={handleSpectateOnline}
          onCreateOnline={handleCreateOnline}
          onShowTutorial={() => setShowTutorial(true)}
          onFindMatchSuccess={handleFindMatchSuccess}
          playerId={playerId}
          apiBase={apiBase}
          wsUrl={wsUrl}
          onRegisterBackButton={(handler) => {
            menuBackButtonHandlerRef.current = handler;
          }}
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
          {/* Reconnecting Overlay – shown when WebSocket drops mid-game */}
          {isReconnecting && (
            <div className="reconnect-overlay">
              <div className="glass-panel" style={{
                padding: '40px 48px', textAlign: 'center', maxWidth: '360px', width: '90%',
                border: '1px solid rgba(251,191,36,0.3)',
                boxShadow: '0 0 40px rgba(251,191,36,0.1)',
              }}>
                {/* Spinner */}
                <div className="reconnect-spinner" />
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', marginBottom: '8px' }}>
                  Reconnecting...
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5 }}>
                  Connection lost. Attempting to rejoin your game.
                </p>
                {/* Progress bar */}
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px', height: '6px' }}>
                  <div 
                    className="reconnect-pulse-bar"
                    style={{
                      height: '100%',
                      width: '100%',
                      background: 'linear-gradient(90deg, #22d3ee, #00fff0, #22d3ee)',
                      backgroundSize: '200% 100%',
                      borderRadius: '8px',
                    }} 
                  />
                </div>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '24px', fontWeight: 600 }}>
                  {reconnectCountdown !== null && reconnectCountdown > 0
                    ? `Next attempt in ${reconnectCountdown}s...`
                    : 'Attempting connection...'}
                </p>
                <button
                  id="reconnect-leave-btn"
                  className="btn-secondary"
                  style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}
                  onClick={handleLeave}
                >
                  Leave Game
                </button>
              </div>
            </div>
          )}
          <GameTable
            gameState={gameState}
            currentPlayerId={playerId}
            isSpectator={isSpectator}
            onDraw={drawCard}
            onDiscard={discardCard}
            onDiscardMulti={discardMultipleCards}
            onTick={declareTick}
            onEndTurn={endTurn}
            onLeave={handleLeave}
            onReady={markReady}
            latestReaction={latestReaction}
            onSendReaction={sendReaction}
            stompClientRef={stompClientRef}
            connected={connected}
            chatMessages={chatMessages}
            onSendChatMessage={sendChatMessage}
            isOffline={isOffline}
          />

          {/* Round Results Screen Overlay */}
          {gameState.status === 'ROUND_OVER' && (
            <RoundResultModal
              gameState={gameState}
              currentPlayerId={playerId}
              onNextRound={(gameState.isMultiplayer || (gameState as any).multiplayer) ? startNextRound : markReady}
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

      {/* Back Button Leave Confirmation Modal */}
      {showAppLeaveConfirm && (
        <div className="modal-overlay" onClick={() => setShowAppLeaveConfirm(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '320px', textAlign: 'center', padding: '24px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.4rem' }}>Leave Game?</h2>
            <p style={{ marginBottom: '24px', color: 'var(--color-text-muted)', fontSize: '1rem' }}>
              Are you sure you want to leave the game? Your current progress will be lost.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowAppLeaveConfirm(false)}
                style={{ flex: 1, padding: '14px 20px', fontSize: '1rem' }}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  setShowAppLeaveConfirm(false);
                  handleLeave();
                }}
                style={{ flex: 1, padding: '14px 20px', fontSize: '1rem' }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Button Exit Application Confirmation Modal */}
      {showExitConfirm && (
        <div className="modal-overlay" onClick={() => setShowExitConfirm(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '320px', textAlign: 'center', padding: '24px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '1.4rem' }}>Exit Game?</h2>
            <p style={{ marginBottom: '24px', color: 'var(--color-text-muted)', fontSize: '1rem' }}>
              Are you sure you want to exit the game?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowExitConfirm(false)}
                style={{ flex: 1, padding: '14px 20px', fontSize: '1rem' }}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  setShowExitConfirm(false);
                  CapacitorApp.exitApp();
                }}
                style={{ flex: 1, padding: '14px 20px', fontSize: '1rem' }}
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
