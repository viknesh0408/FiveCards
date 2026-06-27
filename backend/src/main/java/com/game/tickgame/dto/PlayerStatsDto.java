package com.game.tickgame.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for player statistics sync between frontend and backend.
 * Mirrors the TypeScript PlayerStats interface + matchHistory.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlayerStatsDto {

    private String playerId;
    private String playerName;

    private int gamesPlayedTotal;
    private int gamesPlayedOffline;
    private int gamesPlayedOnline;

    private int winsTotal;
    private int winsOffline;
    private int winsOnline;

    private int winStreakCurrent;
    private int winStreakBest;

    private int totalPointsScored;
    private int roundsPlayed;

    private int lowestRoundScore;
    private int highestRoundScore;

    private int declaresCorrect;
    private int declaresWrong;

    /** JSON string: ["W","L","W",...] */
    private String recentForm;

    /** JSON string: MatchHistoryEntry[] */
    private String matchHistory;
}
