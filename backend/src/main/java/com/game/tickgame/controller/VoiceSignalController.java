package com.game.tickgame.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

/**
 * Relay-only WebRTC signaling controller.
 *
 * The server never processes audio — it simply forwards small JSON packets
 * (SDP offers/answers and ICE candidates) between peers so they can establish
 * a direct WebRTC connection for voice chat.
 *
 * Message flow:
 *   Client A → /app/game/{gameId}/voice/signal → server
 *           → /topic/game/{gameId}/voice/{targetPlayerId} → Client B
 */
@Controller
public class VoiceSignalController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Relay a WebRTC signaling message to a specific player.
     *
     * Expected payload keys:
     *   - type         : "offer" | "answer" | "ice-candidate"
     *   - fromPlayerId : sender's player ID
     *   - targetPlayerId : recipient's player ID
     *   - sdp           : SDP string (for offer/answer)
     *   - candidate     : ICE candidate object (for ice-candidate)
     */
    @MessageMapping("/game/{gameId}/voice/signal")
    public void relayVoiceSignal(
            @DestinationVariable String gameId,
            Map<String, Object> payload) {

        String targetPlayerId = (String) payload.get("targetPlayerId");
        if (targetPlayerId == null || targetPlayerId.isEmpty()) {
            return; // Invalid message — drop silently
        }

        // Forward the entire payload to the target player's private voice topic
        messagingTemplate.convertAndSend(
                "/topic/game/" + gameId + "/voice/" + targetPlayerId,
                (Object) payload
        );
    }
}
