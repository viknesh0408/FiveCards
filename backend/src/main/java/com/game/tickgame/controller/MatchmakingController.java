package com.game.tickgame.controller;

import com.game.tickgame.service.MatchmakingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST endpoints for the global matchmaking queue.
 *
 * POST   /api/matchmaking/join    — join the queue
 * DELETE /api/matchmaking/leave   — leave the queue (cancel search)
 * GET    /api/matchmaking/status  — poll queue position & size
 */
@RestController
@RequestMapping("/api/matchmaking")
public class MatchmakingController {

    @Autowired
    private MatchmakingService matchmakingService;

    /**
     * Join the matchmaking queue.
     * Body (JSON): { playerId, name, avatar?, avatarPic? }
     */
    @PostMapping("/join")
    public ResponseEntity<?> joinQueue(@RequestBody Map<String, String> body) {
        String playerId = body.get("playerId");
        String name     = body.get("name");
        String avatar   = body.getOrDefault("avatar", "none");
        String avatarPic = body.getOrDefault("avatarPic", "none");

        if (playerId == null || playerId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "playerId is required"));
        }
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "name is required"));
        }

        int queueSize = matchmakingService.enqueue(playerId, name, avatar, avatarPic);

        return ResponseEntity.ok(Map.of(
            "queueSize", queueSize,
            "maxPlayers", 4,
            "estimatedWaitSec", Math.max(0, 15 - (queueSize - 1) * 3)
        ));
    }

    /**
     * Leave the matchmaking queue (cancel search).
     */
    @DeleteMapping("/leave")
    public ResponseEntity<?> leaveQueue(@RequestParam String playerId) {
        if (playerId == null || playerId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "playerId is required"));
        }
        matchmakingService.dequeue(playerId);
        return ResponseEntity.ok(Map.of("status", "left"));
    }

    /**
     * Poll current queue status for a player.
     */
    @GetMapping("/status")
    public ResponseEntity<?> getStatus(@RequestParam String playerId) {
        int queueSize = matchmakingService.getQueueSize();
        int position  = matchmakingService.getQueuePosition(playerId);
        return ResponseEntity.ok(Map.of(
            "inQueue", position > 0,
            "position", Math.max(0, position),
            "queueSize", queueSize,
            "maxPlayers", 4
        ));
    }
}
