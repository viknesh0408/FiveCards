import { useState, useEffect, useRef, useCallback } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import type { IAgoraRTCClient, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';

// Plug in your Agora App ID here or set VITE_AGORA_APP_ID in your environment
const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || "5cf06a7921b34a9eb77b813a335581bb";

export const useAgoraVoice = () => {
  const [joined, setJoined] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(true); // Start muted by default for privacy
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);

  const leaveVoice = useCallback(async () => {
    // 1. Stop and close local mic track
    if (localAudioTrackRef.current) {
      try {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
      } catch (err) {
        console.error('Error closing local audio track:', err);
      }
      localAudioTrackRef.current = null;
    }

    // 2. Leave Agora channel
    if (clientRef.current) {
      try {
        await clientRef.current.leave();
      } catch (err) {
        console.error('Error leaving Agora channel:', err);
      }
      clientRef.current = null;
    }

    setJoined(false);
    setMuted(true);
    setActiveSpeakers([]);
  }, []);

  const joinVoice = useCallback(async (channelName: string, playerId: string) => {
    if (!AGORA_APP_ID) {
      console.warn('Agora Voice Chat: VITE_AGORA_APP_ID is not configured. Voice chat is disabled.');
      return;
    }

    await leaveVoice(); // Ensure clean state first

    try {
      // Create Agora Client
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      // Handle remote users joining/publishing audio
      client.on('user-published', async (user, mediaType) => {
        if (mediaType === 'audio') {
          try {
            await client.subscribe(user, mediaType);
            if (user.audioTrack) {
              user.audioTrack.play();
            }
          } catch (err) {
            console.error('Error subscribing to remote audio track:', err);
          }
        }
      });

      // Handle remote users unpublishing or leaving
      client.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'audio' && user.audioTrack) {
          user.audioTrack.stop();
        }
      });

      // Volume indicator listener for active speakers
      client.enableAudioVolumeIndicator();
      client.on('volume-indicator', (volumes) => {
        const speakers: string[] = [];
        volumes.forEach((volume) => {
          // Only count as active speaker if volume level is above 5 (range: 0-100)
          if (volume.level > 5) {
            speakers.push(volume.uid.toString());
          }
        });
        setActiveSpeakers(speakers);
      });

      // Join the channel (using playerId as UID)
      // Note: We use null/no-token for simple local testing with token disabled in Agora console
      await client.join(AGORA_APP_ID, channelName, null, playerId);

      // Create Microphone Track
      const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localAudioTrackRef.current = localAudioTrack;

      // Publish the track (starts muted by default)
      await client.publish([localAudioTrack]);
      await localAudioTrack.setEnabled(false); // setEnabled(false) mutes the track

      setJoined(true);
      setMuted(true);
    } catch (err) {
      console.error('Failed to join Agora voice channel:', err);
      await leaveVoice();
    }
  }, [leaveVoice]);

  const toggleMute = useCallback(async () => {
    if (!localAudioTrackRef.current || !joined) return;

    try {
      const targetMuteState = !muted;
      // setEnabled(true) starts sending audio, setEnabled(false) mutes it
      await localAudioTrackRef.current.setEnabled(!targetMuteState);
      setMuted(targetMuteState);
    } catch (err) {
      console.error('Error toggling microphone track:', err);
    }
  }, [muted, joined]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveVoice();
    };
  }, [leaveVoice]);

  return {
    joined,
    muted,
    activeSpeakers,
    joinVoice,
    leaveVoice,
    toggleMute,
  };
};
