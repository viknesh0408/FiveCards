package com.game.tickgame.controller;

import com.game.tickgame.dto.PlayerStatsDto;
import com.game.tickgame.service.PlayerStatsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for player stats sync.
 *
 * GET  /api/stats/{playerId}  → returns stored stats or 404
 * POST /api/stats/{playerId}  → upserts stats using MAX-merge strategy
 */
@RestController
@RequestMapping("/api/stats")
public class PlayerStatsController {

    @Autowired
    private PlayerStatsService playerStatsService;

    @GetMapping("/{playerId}")
    public ResponseEntity<?> getStats(@PathVariable String playerId) {
        PlayerStatsDto stats = playerStatsService.getStats(playerId);
        if (stats == null) {
            return ResponseEntity.status(404).body(Map.of("error", "No stats found for player: " + playerId));
        }
        return ResponseEntity.ok(stats);
    }

    @PostMapping("/{playerId}")
    public ResponseEntity<?> saveStats(
            @PathVariable String playerId,
            @RequestBody PlayerStatsDto dto) {
        try {
            dto.setPlayerId(playerId); // ensure path variable takes precedence
            PlayerStatsDto merged = playerStatsService.saveStats(playerId, dto);
            return ResponseEntity.ok(merged);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to save stats: " + e.getMessage()));
        }
    }
}
