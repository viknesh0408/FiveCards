package com.game.tickgame.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Game {
    private String gameId;
    private List<Player> players = new ArrayList<>();
    private int currentRoundNumber;
    private int maxRounds = 20; // Default is 20 rounds
    private Round currentRound;
    private List<Round> rounds = new ArrayList<>();
    private GameStatus status = GameStatus.WAITING_FOR_PLAYERS;
    private String winnerId;
    private boolean isMultiplayer = false;
    private String hostId;

    public Player getPlayerById(String id) {
        if (players == null) return null;
        return players.stream()
                .filter(p -> p.getId().equals(id))
                .findFirst()
                .orElse(null);
    }
}
