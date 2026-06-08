package com.game.tickgame.controller;

import com.game.tickgame.dto.SanitizedGame;
import com.game.tickgame.model.AiLevel;
import com.game.tickgame.model.Game;
import com.game.tickgame.model.Player;
import com.game.tickgame.service.GameEngine;
import com.game.tickgame.service.GamePersistenceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/game")
public class GameController {

    @Autowired
    private GameEngine gameEngine;

    @Autowired
    private GamePersistenceService gamePersistenceService;

    @PostMapping("/create")
    public ResponseEntity<SanitizedGame> createGame(
            @RequestParam(required = false) String gameId,
            @RequestParam(defaultValue = "20") int maxRounds,
            @RequestParam(defaultValue = "true") boolean isMultiplayer) {
        
        Game game = gameEngine.createGame(gameId, maxRounds);
        game.setMultiplayer(isMultiplayer);
        gamePersistenceService.saveGame(game);
        
        return ResponseEntity.ok(SanitizedGame.fromGame(game, null));
    }

    @PostMapping("/{gameId}/join")
    public ResponseEntity<?> joinPlayer(
            @PathVariable String gameId,
            @RequestParam String playerId,
            @RequestParam String name) {
        
        try {
            Game game = gameEngine.getGame(gameId);
            if (game == null) {
                // Try to load from DB
                game = gamePersistenceService.loadGame(gameId);
                if (game == null) {
                    return ResponseEntity.status(404).body(Map.of("error", "Game room not found: " + gameId));
                }
            }

            Player player = gameEngine.addPlayer(gameId, playerId, name, false, null);
            gamePersistenceService.saveGame(game);
            
            return ResponseEntity.ok(SanitizedGame.fromGame(game, playerId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{gameId}/add-ai")
    public ResponseEntity<?> addAiPlayer(
            @PathVariable String gameId,
            @RequestParam String name,
            @RequestParam AiLevel aiLevel) {
        
        try {
            Game game = gameEngine.getGame(gameId);
            if (game == null) {
                game = gamePersistenceService.loadGame(gameId);
                if (game == null) {
                    return ResponseEntity.status(404).body(Map.of("error", "Game not found"));
                }
            }

            String aiId = "AI_" + UUID.randomUUID().toString().substring(0, 6);
            gameEngine.addPlayer(gameId, aiId, name, true, aiLevel);
            gamePersistenceService.saveGame(game);
            
            return ResponseEntity.ok(SanitizedGame.fromGame(game, null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{gameId}")
    public ResponseEntity<?> getGameStatus(
            @PathVariable String gameId,
            @RequestParam(required = false) String playerId) {
        
        Game game = gameEngine.getGame(gameId);
        if (game == null) {
            game = gamePersistenceService.loadGame(gameId);
            if (game == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Game not found"));
            }
        }
        
        return ResponseEntity.ok(SanitizedGame.fromGame(game, playerId));
    }

    @PostMapping("/{gameId}/start")
    public ResponseEntity<?> startNewGame(@PathVariable String gameId) {
        try {
            Game game = gameEngine.getGame(gameId);
            if (game == null) {
                game = gamePersistenceService.loadGame(gameId);
                if (game == null) {
                    return ResponseEntity.status(404).body(Map.of("error", "Game not found"));
                }
            }

            gameEngine.startNewGame(gameId);
            gamePersistenceService.saveGame(game);
            return ResponseEntity.ok(SanitizedGame.fromGame(game, null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
