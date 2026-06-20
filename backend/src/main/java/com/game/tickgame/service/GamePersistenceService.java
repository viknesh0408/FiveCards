package com.game.tickgame.service;

import com.game.tickgame.entity.GameEntity;
import com.game.tickgame.entity.PlayerEntity;
import com.game.tickgame.entity.RoundEntity;
import com.game.tickgame.model.*;
import com.game.tickgame.repository.GameRepository;
import com.game.tickgame.repository.PlayerRepository;
import com.game.tickgame.repository.RoundRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Async;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GamePersistenceService {

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private RoundRepository roundRepository;

    @Autowired
    private GameEngine gameEngine;

    public void saveGame(Game game) {
        if (game == null) return;

        // 1. Map to entities synchronously in the main thread (thread-safe data copy)
        GameEntity gameEntity = new GameEntity(
                game.getGameId(),
                game.getStatus().name(),
                game.getCurrentRoundNumber(),
                game.getMaxRounds(),
                game.getWinnerId(),
                game.isMultiplayer(),
                game.getHostId()
        );

        List<PlayerEntity> playerEntities = new ArrayList<>();
        if (game.getPlayers() != null) {
            playerEntities = game.getPlayers().stream().map(p -> {
                PlayerEntity pe = new PlayerEntity(
                        p.getId(),
                        game.getGameId(),
                        p.getName(),
                        p.isAi(),
                        p.getAiLevel() != null ? p.getAiLevel().name() : null,
                        p.getTotalScore(),
                        p.getRoundScore(),
                        p.isReady(),
                        p.isDeclaredTick(),
                        p.getHand() != null ? new ArrayList<>(p.getHand()) : new ArrayList<>()
                );
                pe.setTimeoutCount(p.getTimeoutCount());
                return pe;
            }).collect(Collectors.toList());
        }

        List<RoundEntity> roundEntities = new ArrayList<>();
        if (game.getRounds() != null) {
            for (Round r : game.getRounds()) {
                roundEntities.add(createRoundEntity(game.getGameId(), r));
            }
        }

        RoundEntity currentRoundEntity = null;
        if (game.getCurrentRound() != null) {
            currentRoundEntity = createRoundEntity(game.getGameId(), game.getCurrentRound());
        }

        // 2. Delegate the actual I/O writes asynchronously to save thread
        saveEntitiesAsync(gameEntity, playerEntities, roundEntities, currentRoundEntity);
    }

    @Async
    @Transactional
    public void saveEntitiesAsync(GameEntity gameEntity, List<PlayerEntity> playerEntities, List<RoundEntity> roundEntities, RoundEntity currentRoundEntity) {
        try {
            gameRepository.save(gameEntity);
            if (playerEntities != null && !playerEntities.isEmpty()) {
                playerRepository.saveAll(playerEntities);
            }
            if (roundEntities != null && !roundEntities.isEmpty()) {
                roundRepository.saveAll(roundEntities);
            }
            if (currentRoundEntity != null) {
                roundRepository.save(currentRoundEntity);
            }
        } catch (Exception e) {
            System.err.println("[GamePersistenceService] Async database save failed: " + e.getMessage());
        }
    }

    private RoundEntity createRoundEntity(String gameId, Round r) {
        return new RoundEntity(
                gameId + "_" + r.getRoundNumber(),
                gameId,
                r.getRoundNumber(),
                r.getJokerCard(),
                r.getJokerRank() != null ? r.getJokerRank().name() : null,
                r.getDrawPile() != null ? new ArrayList<>(r.getDrawPile()) : new ArrayList<>(),
                r.getDiscardPile() != null ? new ArrayList<>(r.getDiscardPile()) : new ArrayList<>(),
                r.getCurrentPlayerIndex(),
                r.isRoundEnded(),
                r.getTickPlayerId(),
                r.getEndCondition(),
                r.isHasDiscardedThisTurn(),
                r.isNeedsToDraw(),
                r.getCardsDiscardedThisTurn(),
                r.isFirstTurnCompleted(),
                r.getPlayerScores() != null ? new HashMap<>(r.getPlayerScores()) : new HashMap<>()
        );
    }

    @Transactional
    public Game loadGame(String gameId) {
        // 1. Fetch GameEntity
        GameEntity gameEntity = gameRepository.findById(gameId).orElse(null);
        if (gameEntity == null) {
            return null;
        }

        // 2. Fetch Players
        List<PlayerEntity> playerEntities = playerRepository.findByGameId(gameId);
        List<Player> players = playerEntities.stream().map(pe -> {
            Player p = new Player(
                    pe.getId(),
                    pe.getName(),
                    pe.isAi(),
                    pe.getAiLevel() != null ? AiLevel.valueOf(pe.getAiLevel()) : null,
                    pe.getHand() != null ? pe.getHand() : new ArrayList<>(),
                    pe.getRoundScore(),
                    pe.getTotalScore(),
                    pe.isReady(),
                    pe.isDeclaredTick()
            );
            p.setTimeoutCount(pe.getTimeoutCount());
            return p;
        }).collect(Collectors.toList());

        // 3. Fetch Rounds
        List<RoundEntity> roundEntities = roundRepository.findByGameId(gameId);
        List<Round> rounds = roundEntities.stream().map(re -> new Round(
                re.getRoundNumber(),
                re.getJokerCard(),
                re.getJokerRank() != null ? Rank.valueOf(re.getJokerRank()) : null,
                re.getDrawPile() != null ? re.getDrawPile() : new ArrayList<>(),
                re.getDiscardPile() != null ? re.getDiscardPile() : new ArrayList<>(),
                re.getCurrentPlayerIndex(),
                re.isRoundEnded(),
                re.getTickPlayerId(),
                re.getEndCondition(),
                re.isHasDiscardedThisTurn(),
                re.isNeedsToDraw(),
                re.getCardsDiscardedThisTurn(),
                null, // turnStartedAt
                re.isFirstTurnCompleted(),
                re.getPlayerScores() != null ? re.getPlayerScores() : new HashMap<>()
        )).sorted(Comparator.comparingInt(Round::getRoundNumber))
          .collect(Collectors.toList());

        // 4. Assemble Game domain model
        Game game = new Game();
        game.setGameId(gameEntity.getGameId());
        game.setStatus(GameStatus.valueOf(gameEntity.getStatus()));
        game.setCurrentRoundNumber(gameEntity.getCurrentRoundNumber());
        game.setMaxRounds(gameEntity.getMaxRounds());
        game.setWinnerId(gameEntity.getWinnerId());
        game.setMultiplayer(gameEntity.isMultiplayer());
        game.setHostId(gameEntity.getHostId());
        game.setPlayers(players);
        game.setRounds(rounds.stream().filter(Round::isRoundEnded).collect(Collectors.toList()));

        // Set current active round
        Round currentRound = rounds.stream()
                .filter(r -> r.getRoundNumber() == gameEntity.getCurrentRoundNumber())
                .findFirst()
                .orElse(null);
        game.setCurrentRound(currentRound);

        // Put in GameEngine active map so in-memory actions can resume
        Game activeGame = gameEngine.createGame(game.getGameId(), game.getMaxRounds());
        activeGame.setPlayers(game.getPlayers());
        activeGame.setStatus(game.getStatus());
        activeGame.setCurrentRoundNumber(game.getCurrentRoundNumber());
        activeGame.setCurrentRound(game.getCurrentRound());
        activeGame.setRounds(game.getRounds());
        activeGame.setWinnerId(game.getWinnerId());
        activeGame.setMultiplayer(game.isMultiplayer());
        activeGame.setHostId(game.getHostId());

        return activeGame;
    }
}
