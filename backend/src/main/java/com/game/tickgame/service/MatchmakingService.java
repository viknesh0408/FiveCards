package com.game.tickgame.service;

import com.game.tickgame.model.AiLevel;
import com.game.tickgame.model.Game;
import com.game.tickgame.model.Player;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Manages the global matchmaking queue.
 * <p>
 * Players who call {@link #enqueue} are added to a shared queue.
 * A game starts immediately when 4 humans are queued, or after a 15-second
 * countdown (whichever comes first) — remaining slots are filled with AI bots.
 * When a match is formed, each human player receives a WebSocket push on
 * {@code /topic/matchmaking/{playerId}} with payload {@code { "type": "MATCH_FOUND", "gameId": "..." }}.
 * </p>
 */
@Service
public class MatchmakingService {

    /** Maximum humans per matchmade game. */
    private static final int MAX_PLAYERS = 4;

    /** Seconds to wait for humans before filling with bots. */
    private static final long BOT_FILL_DELAY_SEC = 15;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private GameEngine gameEngine;

    @Autowired
    private GamePersistenceService gamePersistenceService;

    // Thread-safe queue of waiting players
    private final ConcurrentLinkedDeque<QueueEntry> queue = new ConcurrentLinkedDeque<>();

    // Scheduler for bot-fill countdown
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "matchmaking-scheduler");
        t.setDaemon(true);
        return t;
    });

    // Reference to the current countdown task so it can be cancelled/reset
    private final AtomicReference<ScheduledFuture<?>> countdownTask = new AtomicReference<>(null);

    // Lock to synchronise queue mutations + match creation
    private final Object lock = new Object();

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Adds a player to the matchmaking queue and triggers match logic.
     *
     * @return current queue size after adding
     */
    public int enqueue(String playerId, String name, String avatar, String avatarPic) {
        synchronized (lock) {
            // Prevent duplicate entries
            boolean alreadyQueued = queue.stream().anyMatch(e -> e.playerId.equals(playerId));
            if (!alreadyQueued) {
                queue.addLast(new QueueEntry(playerId, name, avatar, avatarPic));
                System.out.println("[MATCHMAKING] Enqueued: " + name + " (" + playerId + "). Queue size: " + queue.size());
            }

            int size = queue.size();

            if (size >= MAX_PLAYERS) {
                // Instant match — 4 humans ready
                cancelCountdown();
                createMatch();
            } else {
                // Start or reset the bot-fill countdown
                resetCountdown();
            }

            return size;
        }
    }

    /**
     * Removes a player from the queue (e.g., they cancelled search).
     */
    public void dequeue(String playerId) {
        synchronized (lock) {
            boolean removed = queue.removeIf(e -> e.playerId.equals(playerId));
            if (removed) {
                System.out.println("[MATCHMAKING] Dequeued (cancel): " + playerId + ". Queue size: " + queue.size());
            }
            if (queue.isEmpty()) {
                cancelCountdown();
            }
        }
    }

    /**
     * Returns the current number of players waiting in the queue.
     */
    public int getQueueSize() {
        return queue.size();
    }

    /**
     * Returns the queue position of a given player (1-based), or -1 if not queued.
     */
    public int getQueuePosition(String playerId) {
        int pos = 0;
        for (QueueEntry e : queue) {
            pos++;
            if (e.playerId.equals(playerId)) return pos;
        }
        return -1;
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    private void resetCountdown() {
        cancelCountdown();
        ScheduledFuture<?> task = scheduler.schedule(() -> {
            synchronized (lock) {
                if (!queue.isEmpty()) {
                    System.out.println("[MATCHMAKING] Bot-fill countdown expired. Creating match with " + queue.size() + " human(s) + bots.");
                    createMatch();
                }
            }
        }, BOT_FILL_DELAY_SEC, TimeUnit.SECONDS);
        countdownTask.set(task);
    }

    private void cancelCountdown() {
        ScheduledFuture<?> existing = countdownTask.getAndSet(null);
        if (existing != null) {
            existing.cancel(false);
        }
    }

    /**
     * Drains up to MAX_PLAYERS entries from the queue, creates a game, fills
     * remaining slots with AI bots, persists it, and notifies each human.
     */
    private void createMatch() {
        // Take up to MAX_PLAYERS humans
        List<QueueEntry> participants = new ArrayList<>();
        while (!queue.isEmpty() && participants.size() < MAX_PLAYERS) {
            participants.add(queue.pollFirst());
        }

        if (participants.isEmpty()) return;

        // Create game
        String gameId = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        Game game = gameEngine.createGame(gameId, 10);
        game.setMultiplayer(true);
        game.setGameMode("MATCHMAKING");

        // Add human players
        for (QueueEntry entry : participants) {
            try {
                gameEngine.addPlayer(gameId, entry.playerId, entry.name, false, null, entry.avatar, entry.avatarPic);
            } catch (Exception ex) {
                System.err.println("[MATCHMAKING] Failed to add player " + entry.playerId + ": " + ex.getMessage());
            }
        }

        // Fill remaining slots with AI bots
        int botsNeeded = MAX_PLAYERS - participants.size();
        String[] botNames = { "Arun", "Priya", "Ravi", "Maya" };
        for (int i = 0; i < botsNeeded; i++) {
            String botId = "BOT_" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();
            String botName = botNames[i % botNames.length];
            try {
                gameEngine.addPlayer(gameId, botId, botName, true, AiLevel.MEDIUM, "none", "none");
            } catch (Exception ex) {
                System.err.println("[MATCHMAKING] Failed to add bot: " + ex.getMessage());
            }
        }

        gamePersistenceService.saveGame(game);

        System.out.println("[MATCHMAKING] Match created: " + gameId + " | " + participants.size() + " human(s) + " + botsNeeded + " bot(s)");

        // Notify each human player via WebSocket
        for (QueueEntry entry : participants) {
            Map<String, String> payload = new HashMap<>();
            payload.put("type", "MATCH_FOUND");
            payload.put("gameId", gameId);
            messagingTemplate.convertAndSend("/topic/matchmaking/" + entry.playerId, (Object) payload);
            System.out.println("[MATCHMAKING] Notified player: " + entry.playerId + " → game " + gameId);
        }
    }

    // ── Inner ─────────────────────────────────────────────────────────────────

    private static class QueueEntry {
        final String playerId;
        final String name;
        final String avatar;
        final String avatarPic;
        final long enqueuedAt;

        QueueEntry(String playerId, String name, String avatar, String avatarPic) {
            this.playerId = playerId;
            this.name = name;
            this.avatar = avatar != null ? avatar : "none";
            this.avatarPic = avatarPic != null ? avatarPic : "none";
            this.enqueuedAt = System.currentTimeMillis();
        }
    }
}
