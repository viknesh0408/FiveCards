package com.game.tickgame.controller;

import com.game.tickgame.dto.GameAction;
import com.game.tickgame.dto.SanitizedGame;
import com.game.tickgame.model.*;
import com.game.tickgame.service.AiEngine;
import com.game.tickgame.service.GameEngine;
import com.game.tickgame.service.GamePersistenceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.context.event.EventListener;
import java.util.Map;

import java.util.Collections;
import java.util.Set;
import java.util.concurrent.*;

@Controller
public class GameWebSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private GameEngine gameEngine;

    @Autowired
    private AiEngine aiEngine;

    @Autowired
    private GamePersistenceService gamePersistenceService;

    // Executor for handling AI turns asynchronously with realistic pacing delays
    private final ScheduledExecutorService aiExecutor = Executors.newScheduledThreadPool(4);
    
    // Set to track active AI loops to avoid concurrent AI threads for the same game
    private final Set<String> activeAiGames = ConcurrentHashMap.newKeySet();

    // Map to track active human turn timers
    private final ConcurrentHashMap<String, ScheduledFuture<?>> activeTurnTimers = new ConcurrentHashMap<>();

    // Set to track connected player IDs
    private final Set<String> connectedPlayers = ConcurrentHashMap.newKeySet();

    @MessageMapping("/game/{gameId}/action")
    public void handleGameAction(@DestinationVariable String gameId, GameAction action, SimpMessageHeaderAccessor headerAccessor) {
        if (headerAccessor.getSessionAttributes() != null) {
            headerAccessor.getSessionAttributes().put("gameId", gameId);
            headerAccessor.getSessionAttributes().put("playerId", action.getPlayerId());
        }

        Game game = gameEngine.getGame(gameId);
        if (game == null) {
            game = gamePersistenceService.loadGame(gameId);
            if (game == null) return;
        }

        synchronized (game) {
            String type = action.getType();
            String playerId = action.getPlayerId();

            // Track that this player is connected
            connectedPlayers.add(playerId);

            // Reset timeout count on manual activity
            Player activePlayerUser = game.getPlayerById(playerId);
            if (activePlayerUser != null) {
                activePlayerUser.setTimeoutCount(0);
            }

            try {
                switch (type) {
                    case "READY":
                        Player player = game.getPlayerById(playerId);
                        if (player != null) {
                            // Toggle ready state if the game is in lobby or round is completed
                            if (game.getStatus() == GameStatus.WAITING_FOR_PLAYERS || game.getStatus() == GameStatus.ROUND_OVER) {
                                player.setReady(!player.isReady());
                            } else {
                                player.setReady(true);
                            }
                            
                            // Check if all players are ready
                            boolean allReady = game.getPlayers().stream().allMatch(Player::isReady);
                            if (allReady && game.getPlayers().size() >= 2) {
                                if (game.getStatus() == GameStatus.WAITING_FOR_PLAYERS) {
                                    gameEngine.startNewGame(gameId);
                                } else if (game.getStatus() == GameStatus.ROUND_OVER) {
                                    gameEngine.startNextRound(gameId);
                                }

                                // Start turn timer for starting player
                                Round r = game.getCurrentRound();
                                if (r != null && !r.isRoundEnded()) {
                                    Player startingPlayer = game.getPlayers().get(r.getCurrentPlayerIndex());
                                    startTurnTimer(gameId, startingPlayer.getId(), "DISCARD");
                                }
                            }
                        }
                        break;

                    case "DRAW":
                        gameEngine.drawCard(gameId, playerId, action.isFromDiscard());
                        autoEndTurnIfComplete(game, playerId);
                        // Start timer for the next player (if human)
                        Round rDraw = game.getCurrentRound();
                        if (rDraw != null && !rDraw.isRoundEnded()) {
                            Player nextPlayer = game.getPlayers().get(rDraw.getCurrentPlayerIndex());
                            startTurnTimer(gameId, nextPlayer.getId(), "DISCARD");
                        } else {
                            cancelTurnTimer(gameId);
                        }
                        break;

                    case "DISCARD":
                        gameEngine.discardCard(gameId, playerId, action.getCard());
                        autoEndTurnIfComplete(game, playerId);
                        handlePostDiscardTimer(game, gameId, playerId);
                        break;

                    case "DISCARD_MULTI":
                        gameEngine.discardMultipleCards(gameId, playerId, action.getCards());
                        autoEndTurnIfComplete(game, playerId);
                        handlePostDiscardTimer(game, gameId, playerId);
                        break;


                    case "TICK":
                        gameEngine.declareTick(gameId, playerId);
                        cancelTurnTimer(gameId);
                        break;

                    case "END_TURN":
                        gameEngine.endTurn(gameId, playerId);
                        Round rEnd = game.getCurrentRound();
                        if (rEnd != null && !rEnd.isRoundEnded()) {
                            Player nextPlayer = game.getPlayers().get(rEnd.getCurrentPlayerIndex());
                            startTurnTimer(gameId, nextPlayer.getId(), "DISCARD");
                        } else {
                            cancelTurnTimer(gameId);
                        }
                        break;

                    case "REJOIN":
                        // Start turn timer for active human player if not already scheduled
                        Round rRejoin = game.getCurrentRound();
                        if (rRejoin != null && !rRejoin.isRoundEnded() && game.getStatus() == GameStatus.IN_PROGRESS) {
                            Player activeP = game.getPlayers().get(rRejoin.getCurrentPlayerIndex());
                            if (activeP != null && !activeP.isAi() && !activeTurnTimers.containsKey(gameId)) {
                                String phase = rRejoin.isHasDiscardedThisTurn() ? "DRAW" : "DISCARD";
                                startTurnTimer(gameId, activeP.getId(), phase);
                            }
                        }
                        break;

                    case "START":
                        gameEngine.startNewGame(gameId);
                        Round rStart = game.getCurrentRound();
                        if (rStart != null && !rStart.isRoundEnded()) {
                            Player startingPlayer = game.getPlayers().get(rStart.getCurrentPlayerIndex());
                            startTurnTimer(gameId, startingPlayer.getId(), "DISCARD");
                        }
                        break;

                    case "END_GAME":
                        gameEngine.endGame(gameId);
                        break;
                }

                // Broadcast state updates
                broadcastGameState(game);

                // If game is active and current player is AI, trigger AI loop
                triggerAiTurnIfNecessary(gameId);

            } catch (Exception e) {
                // Send private error to the sender
                messagingTemplate.convertAndSend("/topic/game/" + gameId + "/player/" + playerId, 
                        (Object) Collections.singletonMap("error", e.getMessage()));
            }
        }
    }

    private void broadcastGameState(Game game) {
        // Save state to database for persistence
        gamePersistenceService.saveGame(game);

        // Broadcast public state (hands hidden unless round is over)
        messagingTemplate.convertAndSend("/topic/game/" + game.getGameId() + "/state", 
                SanitizedGame.fromGame(game, null));

        // Send customized private state to each player
        for (Player p : game.getPlayers()) {
            if (!p.isAi()) {
                messagingTemplate.convertAndSend("/topic/game/" + game.getGameId() + "/player/" + p.getId(), 
                        SanitizedGame.fromGame(game, p.getId()));
            }
        }
    }

    private void triggerAiTurnIfNecessary(String gameId) {
        Game game = gameEngine.getGame(gameId);
        if (game == null || game.getStatus() != GameStatus.IN_PROGRESS) return;

        Round round = game.getCurrentRound();
        if (round == null || round.isRoundEnded()) return;

        Player currentPlayer = game.getPlayers().get(round.getCurrentPlayerIndex());
        if (currentPlayer != null && currentPlayer.isAi()) {
            // Check if AI task is already running for this game to avoid duplicate schedulers
            if (activeAiGames.add(gameId)) {
                scheduleAiAction(gameId, currentPlayer.getId());
            }
        }
    }

    private void scheduleAiAction(String gameId, String aiPlayerId) {
        // Run AI turn asynchronously with delays to simulate human thinking
        aiExecutor.schedule(() -> {
            Game game = gameEngine.getGame(gameId);
            if (game == null || game.getStatus() != GameStatus.IN_PROGRESS) {
                activeAiGames.remove(gameId);
                return;
            }

            synchronized (game) {
                Round round = game.getCurrentRound();
                if (round == null || round.isRoundEnded()) {
                    activeAiGames.remove(gameId);
                    return;
                }

                Player aiPlayer = game.getPlayerById(aiPlayerId);
                // Verify AI player is indeed the current active player
                int activeIndex = round.getCurrentPlayerIndex();
                if (aiPlayer == null || !game.getPlayers().get(activeIndex).getId().equals(aiPlayerId)) {
                    activeAiGames.remove(gameId);
                    // Trigger again in case active player changed
                    triggerAiTurnIfNecessary(gameId);
                    return;
                }

                try {
                    // Decide if AI should declare Tick at start of turn
                    boolean declareTick = aiEngine.shouldDeclareTick(aiPlayer, game, round);
                    if (declareTick) {
                        gameEngine.declareTick(gameId, aiPlayerId);
                        broadcastGameState(game);

                        // AI turn complete
                        activeAiGames.remove(gameId);
                        triggerAiTurnIfNecessary(gameId);
                        return;
                    }

                    // Otherwise, play normally: Step 1: Discard card
                    Card discardChoice = aiEngine.chooseCardToDiscard(aiPlayer, round);
                    gameEngine.discardCard(gameId, aiPlayerId, discardChoice);
                    broadcastGameState(game);

                    // If round ended immediately due to discard (0 cards left), terminate early
                    if (round.isRoundEnded() || game.getStatus() != GameStatus.IN_PROGRESS) {
                        activeAiGames.remove(gameId);
                        return;
                    }

                    // Check if AI needs to draw
                    if (round.isNeedsToDraw()) {
                        // Schedule DRAW action after 1.2s
                        aiExecutor.schedule(() -> {
                            synchronized (game) {
                                Round rDraw = game.getCurrentRound();
                                if (rDraw == null || rDraw.isRoundEnded() || !game.getPlayers().get(rDraw.getCurrentPlayerIndex()).getId().equals(aiPlayerId)) {
                                    activeAiGames.remove(gameId);
                                    triggerAiTurnIfNecessary(gameId);
                                    return;
                                }

                                try {
                                    boolean fromDiscard = aiEngine.shouldDrawFromDiscard(aiPlayer, rDraw);
                                    gameEngine.drawCard(gameId, aiPlayerId, fromDiscard);
                                    broadcastGameState(game);

                                    // If round ended due to deck exhaustion, stop
                                    if (rDraw.isRoundEnded() || game.getStatus() != GameStatus.IN_PROGRESS) {
                                        activeAiGames.remove(gameId);
                                        return;
                                    }

                                    // Schedule End Turn after another 1.2s
                                    scheduleAiEndTurn(gameId, aiPlayerId, game, aiPlayer);

                                } catch (Exception e) {
                                    activeAiGames.remove(gameId);
                                    e.printStackTrace();
                                }
                            }
                        }, 1200, TimeUnit.MILLISECONDS);
                    } else {
                        // Matching card played; no need to draw. Schedule End Turn directly
                        scheduleAiEndTurn(gameId, aiPlayerId, game, aiPlayer);
                    }

                } catch (Exception e) {
                    activeAiGames.remove(gameId);
                    e.printStackTrace();
                }
            }
        }, 1500, TimeUnit.MILLISECONDS);
    }

    private void scheduleAiEndTurn(String gameId, String aiPlayerId, Game game, Player aiPlayer) {
        aiExecutor.schedule(() -> {
            synchronized (game) {
                Round r2 = game.getCurrentRound();
                if (r2 == null || r2.isRoundEnded() || !game.getPlayers().get(r2.getCurrentPlayerIndex()).getId().equals(aiPlayerId)) {
                    activeAiGames.remove(gameId);
                    triggerAiTurnIfNecessary(gameId);
                    return;
                }

                try {
                    gameEngine.endTurn(gameId, aiPlayerId);
                    broadcastGameState(game);

                    // AI turn complete for this player
                    activeAiGames.remove(gameId);

                    // If the turn passed to a human player, start their turn timer
                    Round rNext = game.getCurrentRound();
                    if (rNext != null && !rNext.isRoundEnded()) {
                        Player nextPlayer = game.getPlayers().get(rNext.getCurrentPlayerIndex());
                        if (nextPlayer != null && !nextPlayer.isAi()) {
                            startTurnTimer(gameId, nextPlayer.getId(), "DISCARD");
                        }
                    }

                    // If the turn passed to another AI, trigger it
                    triggerAiTurnIfNecessary(gameId);

                } catch (Exception e) {
                    activeAiGames.remove(gameId);
                    e.printStackTrace();
                }
            }
        }, 1200, TimeUnit.MILLISECONDS);
    }

    private void autoEndTurnIfComplete(Game game, String playerId) {
        Player p = game.getPlayerById(playerId);
        if (p != null && !p.isAi()) {
            Round round = game.getCurrentRound();
            if (round != null && round.isHasDiscardedThisTurn() && !round.isNeedsToDraw() && !round.isRoundEnded()) {
                gameEngine.endTurn(game.getGameId(), playerId);
            }
        }
    }

    private void startTurnTimer(String gameId, String playerId, String phase) {
        System.out.println("[TIMER] Attempting to start timer for game: " + gameId + ", player: " + playerId + ", phase: " + phase);
        ScheduledFuture<?> existing = activeTurnTimers.remove(gameId);
        if (existing != null) {
            System.out.println("[TIMER] Cancelled existing timer task for game: " + gameId);
            existing.cancel(false);
        }

        Game game = gameEngine.getGame(gameId);
        if (game == null) {
            System.out.println("[TIMER] Game not found");
            return;
        }
        if (game.getStatus() != GameStatus.IN_PROGRESS) {
            System.out.println("[TIMER] Game status is not IN_PROGRESS: " + game.getStatus());
            return;
        }
        Player player = game.getPlayerById(playerId);
        if (player == null) {
            System.out.println("[TIMER] Player not found: " + playerId);
            return;
        }
        if (player.isAi()) {
            System.out.println("[TIMER] Player is AI, not scheduling human timer: " + player.getName());
            return;
        }

        System.out.println("[TIMER] Scheduling 60s timeout task for player: " + player.getName());
        ScheduledFuture<?> task = aiExecutor.schedule(() -> {
            handleTimeout(gameId, playerId, phase);
        }, 60, TimeUnit.SECONDS);

        activeTurnTimers.put(gameId, task);
    }

    private void cancelTurnTimer(String gameId) {
        ScheduledFuture<?> task = activeTurnTimers.remove(gameId);
        if (task != null) {
            task.cancel(false);
        }
    }

    private void handlePostDiscardTimer(Game game, String gameId, String playerId) {
        Round r = game.getCurrentRound();
        if (r == null || r.isRoundEnded() || game.getStatus() != GameStatus.IN_PROGRESS) {
            cancelTurnTimer(gameId);
            return;
        }

        Player activePlayer = game.getPlayers().get(r.getCurrentPlayerIndex());
        if (activePlayer.getId().equals(playerId)) {
            if (r.isNeedsToDraw()) {
                startTurnTimer(gameId, playerId, "DRAW");
            }
        } else {
            startTurnTimer(gameId, activePlayer.getId(), "DISCARD");
        }
    }

    private void handleTimeout(String gameId, String playerId, String phase) {
        System.out.println("[TIMEOUT] handleTimeout triggered for game: " + gameId + ", player: " + playerId + ", phase: " + phase);
        Game game = gameEngine.getGame(gameId);
        if (game == null) {
            System.out.println("[TIMEOUT] Game not found");
            return;
        }
        if (game.getStatus() != GameStatus.IN_PROGRESS) {
            System.out.println("[TIMEOUT] Game is not IN_PROGRESS: " + game.getStatus());
            return;
        }

        synchronized (game) {
            Round round = game.getCurrentRound();
            if (round == null) {
                System.out.println("[TIMEOUT] Current round is null");
                return;
            }
            if (round.isRoundEnded()) {
                System.out.println("[TIMEOUT] Round already ended");
                return;
            }

            Player currentPlayer = game.getPlayers().get(round.getCurrentPlayerIndex());
            if (currentPlayer == null) {
                System.out.println("[TIMEOUT] Current player is null");
                return;
            }
            if (!currentPlayer.getId().equals(playerId)) {
                System.out.println("[TIMEOUT] Active player has changed. Active: " + currentPlayer.getId() + ", Expected: " + playerId);
                return;
            }

            try {
                System.out.println("[TIMEOUT] Processing timeout action for active player: " + currentPlayer.getName() + ", phase: " + phase);
                
                // Increment player's timeout count
                currentPlayer.setTimeoutCount(currentPlayer.getTimeoutCount() + 1);
                System.out.println("[TIMEOUT] Player " + currentPlayer.getName() + " timeout count: " + currentPlayer.getTimeoutCount());

                if (currentPlayer.getTimeoutCount() >= 2) {
                    System.out.println("[TIMEOUT] Kicking player " + currentPlayer.getName() + " due to inactivity");
                    handlePlayerLeave(gameId, playerId);
                    return;
                }

                if ("DISCARD".equals(phase)) {
                    if (!round.isHasDiscardedThisTurn()) {
                        Card highestCard = null;
                        int maxVal = -1;
                        for (Card c : currentPlayer.getHand()) {
                            if (c.getValue() > maxVal) {
                                maxVal = c.getValue();
                                highestCard = c;
                            }
                        }

                        if (highestCard != null) {
                            System.out.println("[TIMEOUT] Auto-discarding highest card: " + highestCard);
                            gameEngine.discardCard(gameId, playerId, highestCard);
                            
                            if (round.isRoundEnded() || game.getStatus() != GameStatus.IN_PROGRESS) {
                                System.out.println("[TIMEOUT] Round or Game ended immediately after discard");
                                cancelTurnTimer(gameId);
                                broadcastGameState(game);
                                return;
                            }

                            if (round.isNeedsToDraw()) {
                                System.out.println("[TIMEOUT] Player needs to draw, starting DRAW timer");
                                startTurnTimer(gameId, playerId, "DRAW");
                            } else {
                                System.out.println("[TIMEOUT] Player matched discard, auto-ending turn");
                                autoEndTurnIfComplete(game, playerId);
                                Round rNext = game.getCurrentRound();
                                if (rNext != null && !rNext.isRoundEnded()) {
                                    Player nextPlayer = game.getPlayers().get(rNext.getCurrentPlayerIndex());
                                    System.out.println("[TIMEOUT] Next turn starting for: " + nextPlayer.getName());
                                    startTurnTimer(gameId, nextPlayer.getId(), "DISCARD");
                                } else {
                                    cancelTurnTimer(gameId);
                                }
                            }
                        } else {
                            System.out.println("[TIMEOUT] Hand is empty, cannot discard");
                        }
                    } else {
                        System.out.println("[TIMEOUT] Player has already discarded this turn");
                    }
                } else if ("DRAW".equals(phase)) {
                    if (round.isNeedsToDraw()) {
                        System.out.println("[TIMEOUT] Auto-drawing card from deck");
                        gameEngine.drawCard(gameId, playerId, false);
                        autoEndTurnIfComplete(game, playerId);
                        Round rNext = game.getCurrentRound();
                        if (rNext != null && !rNext.isRoundEnded()) {
                            Player nextPlayer = game.getPlayers().get(rNext.getCurrentPlayerIndex());
                            System.out.println("[TIMEOUT] Next turn starting for: " + nextPlayer.getName());
                            startTurnTimer(gameId, nextPlayer.getId(), "DISCARD");
                        } else {
                            cancelTurnTimer(gameId);
                        }
                    } else {
                        System.out.println("[TIMEOUT] Player does not need to draw");
                    }
                }

                broadcastGameState(game);
                triggerAiTurnIfNecessary(gameId);

            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
        Map<String, Object> sessionAttributes = headers.getSessionAttributes();
        if (sessionAttributes != null) {
            String gameId = (String) sessionAttributes.get("gameId");
            String playerId = (String) sessionAttributes.get("playerId");

            if (gameId != null && playerId != null) {
                // Remove from active connected set
                connectedPlayers.remove(playerId);
                
                // Schedule a grace period check to allow rejoining on refresh
                aiExecutor.schedule(() -> {
                    Game game = gameEngine.getGame(gameId);
                    if (game == null) {
                        game = gamePersistenceService.loadGame(gameId);
                    }
                    if (game == null) return;
                    
                    synchronized (game) {
                        if (!connectedPlayers.contains(playerId)) {
                            System.out.println("[DISCONNECT] Player " + playerId + " did not reconnect. Removing player.");
                            handlePlayerLeave(gameId, playerId);
                        } else {
                            System.out.println("[DISCONNECT] Player " + playerId + " successfully reconnected during grace period.");
                        }
                    }
                }, 8, TimeUnit.SECONDS);
            }
        }
    }

    private void handlePlayerLeave(String gameId, String playerId) {
        Game game = gameEngine.getGame(gameId);
        if (game == null) return;

        synchronized (game) {
            int removedIndex = -1;
            for (int i = 0; i < game.getPlayers().size(); i++) {
                if (game.getPlayers().get(i).getId().equals(playerId)) {
                    removedIndex = i;
                    break;
                }
            }

            if (removedIndex == -1) return;

            // Remove the player from list
            game.getPlayers().remove(removedIndex);

            // Save state
            gamePersistenceService.saveGame(game);

            // Check if multiplayer game should end
            if (game.isMultiplayer() && game.getStatus() != GameStatus.GAME_OVER && game.getStatus() != GameStatus.WAITING_FOR_PLAYERS) {
                if (game.getPlayers().size() <= 1) {
                    game.setStatus(GameStatus.GAME_OVER);
                    if (!game.getPlayers().isEmpty()) {
                        game.setWinnerId(game.getPlayers().get(0).getId());
                    }
                    cancelTurnTimer(gameId);
                    broadcastGameState(game);
                    return;
                }
            }

            // Adjust active round player index
            if (game.getStatus() == GameStatus.IN_PROGRESS) {
                Round round = game.getCurrentRound();
                if (round != null && !round.isRoundEnded()) {
                    int activeIndex = round.getCurrentPlayerIndex();
                    if (removedIndex < activeIndex) {
                        round.setCurrentPlayerIndex(activeIndex - 1);
                        gameEngine.skipEmptyHandedPlayers(round, game.getPlayers());
                    } else if (removedIndex == activeIndex) {
                        if (!game.getPlayers().isEmpty()) {
                            int nextIndex = activeIndex % game.getPlayers().size();
                            round.setCurrentPlayerIndex(nextIndex);
                            gameEngine.skipEmptyHandedPlayers(round, game.getPlayers());
                            round.setHasDiscardedThisTurn(false);
                            round.setNeedsToDraw(false);
                            round.setTurnStartedAt(System.currentTimeMillis());

                            Player newActivePlayer = game.getPlayers().get(round.getCurrentPlayerIndex());
                            startTurnTimer(gameId, newActivePlayer.getId(), "DISCARD");
                        }
                    }
                }
            }

            broadcastGameState(game);
            triggerAiTurnIfNecessary(gameId);
        }
    }
}
