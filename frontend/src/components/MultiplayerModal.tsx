import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';

// ─── Types ───────────────────────────────────────────────────────────────────

type MatchmakingView = 'menu' | 'searching';

interface MultiplayerModalProps {
  playerName: string;
  playerId: string;
  apiBase: string;
  wsUrl: string;
  onFindMatchSuccess: (gameId: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onBack: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  playerName,
  playerId,
  apiBase,
  wsUrl,
  onFindMatchSuccess,
  onCreateRoom,
  onJoinRoom,
  onBack,
}) => {
  const [view, setView] = useState<MatchmakingView>('menu');
  const [queueSize, setQueueSize] = useState(0);
  const [countdown, setCountdown] = useState(15);
  const [dots, setDots] = useState('');

  const stompRef = useRef<Client | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchFoundRef = useRef(false);

  // ── Dots animation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (view === 'searching') {
      dotsRef.current = setInterval(() => {
        setDots(d => d.length >= 3 ? '' : d + '.');
      }, 500);
    }
    return () => {
      if (dotsRef.current) clearInterval(dotsRef.current);
    };
  }, [view]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cleanupSearch(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupSearch = useCallback((dequeue = true) => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    if (dotsRef.current) { clearInterval(dotsRef.current); dotsRef.current = null; }
    if (stompRef.current) { stompRef.current.deactivate(); stompRef.current = null; }
    if (dequeue) {
      fetch(`${apiBase}/api/matchmaking/leave?playerId=${encodeURIComponent(playerId)}`, { method: 'DELETE' })
        .catch(() => {}); // fire-and-forget
    }
  }, [apiBase, playerId]);

  // ── Start searching ─────────────────────────────────────────────────────
  const startSearch = useCallback(async () => {
    if (!playerName.trim()) return;
    matchFoundRef.current = false;
    setCountdown(15);
    setQueueSize(1);
    setView('searching');

    const avatar = localStorage.getItem('selected_avatar') || 'none';
    const avatarPic = localStorage.getItem('selected_avatar_pic') || 'none';

    // 1. Subscribe to WebSocket for instant MATCH_FOUND notification
    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 0,
      onConnect: () => {
        client.subscribe(`/topic/matchmaking/${playerId}`, (msg) => {
          const payload = JSON.parse(msg.body);
          if (payload.type === 'MATCH_FOUND' && !matchFoundRef.current) {
            matchFoundRef.current = true;
            cleanupSearch(false);
            onFindMatchSuccess(payload.gameId);
          }
        });
      },
    });
    stompRef.current = client;
    client.activate();

    // 2. Join REST queue
    try {
      const res = await fetch(`${apiBase}/api/matchmaking/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, name: playerName, avatar, avatarPic }),
      });
      if (!res.ok) {
        console.error('[MATCHMAKING] Failed to join queue');
        cleanupSearch(false);
        setView('menu');
        return;
      }
      const data = await res.json();
      setQueueSize(data.queueSize ?? 1);
    } catch (e) {
      console.error('[MATCHMAKING] Join queue error:', e);
      cleanupSearch(false);
      setView('menu');
      return;
    }

    // 3. Poll queue status every 2s for live player count
    pollRef.current = setInterval(async () => {
      if (matchFoundRef.current) return;
      try {
        const res = await fetch(`${apiBase}/api/matchmaking/status?playerId=${encodeURIComponent(playerId)}`);
        if (res.ok) {
          const data = await res.json();
          if (!data.inQueue && !matchFoundRef.current) {
            // We were removed from queue (match was created server-side)
            // WS notification should arrive; just update count in case
            setQueueSize(data.queueSize ?? 0);
          } else {
            setQueueSize(data.queueSize ?? 0);
          }
        }
      } catch (_) {}
    }, 2000);

    // 4. Countdown timer (visual only — server controls actual timing)
    let secs = 15;
    countdownRef.current = setInterval(() => {
      secs = Math.max(0, secs - 1);
      setCountdown(secs);
    }, 1000);
  }, [playerName, playerId, apiBase, wsUrl, cleanupSearch, onFindMatchSuccess]);

  // ── Cancel search ───────────────────────────────────────────────────────
  const cancelSearch = useCallback(() => {
    cleanupSearch(true);
    setView('menu');
    setQueueSize(0);
    setCountdown(15);
  }, [cleanupSearch]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (view === 'searching') {
    return (
      <div className="mm-form-panel glass-panel mm-matchmaking-panel">
        {/* Header */}
        <div className="mm-mm-header">
          <span className="mm-mm-globe">🌐</span>
          <h2 className="mm-form-title" style={{ marginBottom: 0 }}>Finding Match{dots}</h2>
          <p className="mm-form-desc">Connecting you with players around the globe</p>
        </div>

        {/* Player Slots */}
        <div className="mm-player-slots">
          {Array.from({ length: 4 }).map((_, i) => {
            const filled = i < queueSize;
            return (
              <div key={i} className={`mm-slot ${filled ? 'mm-slot-filled' : 'mm-slot-empty'}`}>
                {filled ? (
                  <>
                    <div className="mm-slot-avatar">{i === 0 ? '😊' : '🎮'}</div>
                    <span className="mm-slot-label">{i === 0 ? playerName.slice(0, 8) : 'Player'}</span>
                  </>
                ) : (
                  <>
                    <div className="mm-slot-avatar mm-slot-waiting">
                      <span className="mm-slot-pulse" />
                    </div>
                    <span className="mm-slot-label mm-slot-label-muted">Waiting{dots}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Player count */}
        <div className="mm-queue-count">
          <span className="mm-queue-num" style={{ color: '#22d3ee' }}>{queueSize}</span>
          <span className="mm-queue-sep"> / </span>
          <span className="mm-queue-num">4</span>
          <span className="mm-queue-label"> players found</span>
        </div>

        {/* Countdown bar */}
        <div className="mm-queue-bar-wrap">
          <div className="mm-queue-bar-label">
            {countdown > 0
              ? `Starting game in ${countdown}s…`
              : 'Launching game…'}
          </div>
          <div className="mm-queue-bar-track">
            <div
              className="mm-queue-bar-fill"
              style={{ width: `${((15 - countdown) / 15) * 100}%` }}
            />
          </div>
        </div>

        {/* Spinner */}
        <div className="mm-searching-spinner" aria-label="Searching" />

        {/* Cancel */}
        <button
          className="btn-secondary"
          id="mm-cancel-search-btn"
          style={{ marginTop: '16px', padding: '12px 28px', fontSize: '0.9rem', width: '100%' }}
          onClick={cancelSearch}
        >
          Cancel Search
        </button>
      </div>
    );
  }

  // ── Menu view ─────────────────────────────────────────────────────────────
  return (
    <div className="mm-form-panel glass-panel">
      <button className="mm-back-btn" onClick={onBack}>← Back</button>
      <div className="mm-form-header">
        <span className="mm-form-icon">🌐</span>
        <h2 className="mm-form-title">Multiplayer</h2>
        <p className="mm-form-desc">Choose how you want to play online</p>
      </div>

      <div className="mm-mp-grid">
        {/* Find Match */}
        <button
          className="mm-mp-card mm-mp-card-primary"
          id="mm-find-match-btn"
          onClick={startSearch}
          disabled={!playerName.trim()}
        >
          <div className="mm-mp-card-glow" />
          <span className="mm-mp-icon">🔎</span>
          <span className="mm-mp-title">Find Match</span>
          <span className="mm-mp-desc">Auto-match with up to 4 global players from around the world.</span>
          <span className="mm-mp-badge">GLOBAL</span>
        </button>

        {/* Create Room */}
        <button
          className="mm-mp-card mm-mp-card-secondary"
          id="mm-create-room-btn"
          onClick={onCreateRoom}
          disabled={!playerName.trim()}
        >
          <div className="mm-mp-card-glow mm-glow-green" />
          <span className="mm-mp-icon">🏠</span>
          <span className="mm-mp-title">Create Room</span>
          <span className="mm-mp-desc">Host a private game with a room code for friends.</span>
          <span className="mm-mp-badge mm-badge-green">PRIVATE</span>
        </button>

        {/* Join Room */}
        <button
          className="mm-mp-card mm-mp-card-ghost"
          id="mm-join-room-btn"
          onClick={onJoinRoom}
          disabled={!playerName.trim()}
        >
          <div className="mm-mp-card-glow mm-glow-purple" />
          <span className="mm-mp-icon">🔑</span>
          <span className="mm-mp-title">Join Room</span>
          <span className="mm-mp-desc">Enter a 6-character room code to join a friend's game.</span>
          <span className="mm-mp-badge mm-badge-purple">CODE</span>
        </button>
      </div>

      {!playerName.trim() && (
        <p style={{ textAlign: 'center', color: '#f87171', fontSize: '0.82rem', marginTop: '16px', fontWeight: 'bold' }}>
          ⚠️ Set your name in Edit Profile option to continue.
        </p>
      )}
    </div>
  );
};

export default MultiplayerModal;
