import { useState, useEffect, useRef, useCallback } from 'react';
import type { Client } from '@stomp/stompjs';

// Google's free public STUN servers — no cost, good global coverage
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export interface VoiceChatState {
  isVoiceEnabled: boolean;
  isMuted: boolean;
  isSpeakerMuted: boolean;
  speakingStates: Record<string, boolean>; // playerId -> is speaking
  toggleMute: () => void;
  toggleVoice: () => void;
  toggleSpeakerMute: () => void;
  hasPermission: boolean | null; // null = unknown, true = granted, false = denied
}

interface UseVoiceChatOptions {
  gameId: string | null;
  currentPlayerId: string;
  humanPlayerIds: string[]; // all human player IDs in the room (excluding self & AI bots)
  stompClientRef: React.MutableRefObject<Client | null>;
  connected: boolean; // whether STOMP is connected
}

export function useVoiceChat({
  gameId,
  currentPlayerId,
  humanPlayerIds,
  stompClientRef,
  connected,
}: UseVoiceChatOptions): VoiceChatState {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [speakingStates, setSpeakingStates] = useState<Record<string, boolean>>({});

  // Local mic stream
  const localStreamRef = useRef<MediaStream | null>(null);

  // Map of peerId -> RTCPeerConnection
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Map of peerId -> <audio> element
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Speaking detection: AudioContext + AnalyserNode per peer
  const analyserNodesRef = useRef<Map<string, { analyser: AnalyserNode; buffer: Uint8Array<ArrayBuffer> }>>(new Map());
  const speakingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // STOMP signaling subscription ref
  const signalSubRef = useRef<any>(null);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const sendSignal = useCallback((targetPlayerId: string, data: object) => {
    if (!stompClientRef.current || !gameId) return;
    stompClientRef.current.publish({
      destination: `/app/game/${gameId}/voice/signal`,
      body: JSON.stringify({
        ...data,
        fromPlayerId: currentPlayerId,
        targetPlayerId,
      }),
    });
  }, [stompClientRef, gameId, currentPlayerId]);

  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Send ICE candidates through the signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(peerId, {
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // When we receive the remote audio track — create an <audio> element and play it
    pc.ontrack = (event) => {
      let audio = audioElementsRef.current.get(peerId);
      if (!audio) {
        audio = document.createElement('audio');
        audio.autoplay = true;
        (audio as any).playsInline = true;
        audioElementsRef.current.set(peerId, audio);
      }
      audio.srcObject = event.streams[0];
      audio.muted = isSpeakerMuted;

      // Speaking detection via AudioContext AnalyserNode
      try {
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(event.streams[0]);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const buffer = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
        analyserNodesRef.current.set(peerId, { analyser, buffer });
      } catch (e) {
        console.warn('[Voice] Could not create analyser for', peerId, e);
      }
    };

    peersRef.current.set(peerId, pc);
    return pc;
  }, [sendSignal]);

  const addLocalTracks = useCallback((pc: RTCPeerConnection) => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });
  }, []);

  // ─── Kick off the handshake: "polite" side creates offer ──────────────────

  const connectToPeer = useCallback(async (peerId: string) => {
    if (peersRef.current.has(peerId)) return; // Already connected
    if (!localStreamRef.current) return;

    const pc = createPeerConnection(peerId);
    addLocalTracks(pc);

    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      sendSignal(peerId, { type: 'offer', sdp: pc.localDescription });
    } catch (e) {
      console.error('[Voice] Failed to create offer for', peerId, e);
    }
  }, [createPeerConnection, addLocalTracks, sendSignal]);

  // ─── Handle incoming signaling messages ───────────────────────────────────

  const handleSignal = useCallback(async (payload: any) => {
    const { type, fromPlayerId, sdp, candidate } = payload;
    if (!fromPlayerId || fromPlayerId === currentPlayerId) return;

    let pc = peersRef.current.get(fromPlayerId);

    if (type === 'offer') {
      // Received an offer — create answer
      if (!pc) {
        pc = createPeerConnection(fromPlayerId);
        addLocalTracks(pc);
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(fromPlayerId, { type: 'answer', sdp: pc.localDescription });
      } catch (e) {
        console.error('[Voice] Failed to handle offer from', fromPlayerId, e);
      }
    } else if (type === 'answer') {
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (e) {
        console.error('[Voice] Failed to handle answer from', fromPlayerId, e);
      }
    } else if (type === 'ice-candidate') {
      if (!pc || !candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[Voice] Failed to add ICE candidate from', fromPlayerId, e);
      }
    }
  }, [currentPlayerId, createPeerConnection, addLocalTracks, sendSignal]);

  // ─── Speaking detection loop ──────────────────────────────────────────────

  const startSpeakingDetection = useCallback(() => {
    if (speakingIntervalRef.current) return;
    speakingIntervalRef.current = setInterval(() => {
      const updates: Record<string, boolean> = {};
      analyserNodesRef.current.forEach(({ analyser, buffer }, peerId) => {
        analyser.getByteFrequencyData(buffer);
        const avg = buffer.reduce((a, b) => a + b, 0) / buffer.length;
        updates[peerId] = avg > 8; // threshold: silence < 8
      });
      setSpeakingStates((prev) => {
        const changed = Object.keys(updates).some((k) => prev[k] !== updates[k]);
        return changed ? { ...prev, ...updates } : prev;
      });
    }, 150);
  }, []);

  const stopSpeakingDetection = useCallback(() => {
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }
    setSpeakingStates({});
  }, []);

  // ─── Tear down all peer connections ───────────────────────────────────────

  const closePeers = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    audioElementsRef.current.forEach((el) => { el.srcObject = null; });
    audioElementsRef.current.clear();
    analyserNodesRef.current.clear();
    stopSpeakingDetection();
  }, [stopSpeakingDetection]);

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
  }, []);

  // ─── Enable voice (request mic + subscribe to signaling + connect to peers) 

  const enableVoice = useCallback(async () => {
    if (!gameId || !connected) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setHasPermission(true);
      setIsVoiceEnabled(true);

      // Apply current mute state
      stream.getAudioTracks().forEach((t) => { t.enabled = !isMuted; });

      // Subscribe to our private signaling topic
      if (stompClientRef.current && !signalSubRef.current) {
        signalSubRef.current = stompClientRef.current.subscribe(
          `/topic/game/${gameId}/voice/${currentPlayerId}`,
          (message) => {
            try {
              handleSignal(JSON.parse(message.body));
            } catch (e) {
              console.error('[Voice] Failed to parse signal', e);
            }
          }
        );
      }

      startSpeakingDetection();

      // Connect to all other human players currently in the room
      // Give them a short stagger so ICE candidates don't flood at once
      humanPlayerIds
        .filter((id) => id !== currentPlayerId)
        .forEach((peerId, i) => {
          setTimeout(() => connectToPeer(peerId), i * 200);
        });

    } catch (e: any) {
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setHasPermission(false);
        console.warn('[Voice] Microphone permission denied');
      } else {
        console.error('[Voice] getUserMedia error:', e);
      }
    }
  }, [gameId, connected, isMuted, stompClientRef, currentPlayerId, humanPlayerIds, handleSignal, startSpeakingDetection, connectToPeer]);

  // ─── Disable voice ────────────────────────────────────────────────────────

  const disableVoice = useCallback(() => {
    closePeers();
    stopLocalStream();
    if (signalSubRef.current) {
      try { signalSubRef.current.unsubscribe(); } catch (_) {}
      signalSubRef.current = null;
    }
    setIsVoiceEnabled(false);
  }, [closePeers, stopLocalStream]);

  // ─── Public controls ──────────────────────────────────────────────────────

  const toggleVoice = useCallback(() => {
    if (isVoiceEnabled) {
      disableVoice();
    } else {
      enableVoice();
    }
  }, [isVoiceEnabled, enableVoice, disableVoice]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !nextMuted; });
      return nextMuted;
    });
  }, []);

  const toggleSpeakerMute = useCallback(() => {
    setIsSpeakerMuted((prev) => {
      const nextMuted = !prev;
      audioElementsRef.current.forEach((audio) => {
        audio.muted = nextMuted;
      });
      return nextMuted;
    });
  }, []);

  // ─── New players joining — connect to them when humanPlayerIds updates ────

  useEffect(() => {
    if (!isVoiceEnabled || !localStreamRef.current) return;
    humanPlayerIds
      .filter((id) => id !== currentPlayerId && !peersRef.current.has(id))
      .forEach((peerId, i) => {
        setTimeout(() => connectToPeer(peerId), i * 200);
      });
  }, [isVoiceEnabled, humanPlayerIds, currentPlayerId, connectToPeer]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      disableVoice();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isVoiceEnabled,
    isMuted,
    isSpeakerMuted,
    speakingStates,
    toggleMute,
    toggleVoice,
    toggleSpeakerMute,
    hasPermission,
  };
}
