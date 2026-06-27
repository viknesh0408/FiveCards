package com.game.tickgame.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "player_stats")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlayerStatsEntity {

    @Id
    @Column(name = "player_id", nullable = false)
    private String playerId;

    @Column(name = "player_name")
    private String playerName;

    @Column(name = "games_played_total")
    private int gamesPlayedTotal;

    @Column(name = "games_played_offline")
    private int gamesPlayedOffline;

    @Column(name = "games_played_online")
    private int gamesPlayedOnline;

    @Column(name = "wins_total")
    private int winsTotal;

    @Column(name = "wins_offline")
    private int winsOffline;

    @Column(name = "wins_online")
    private int winsOnline;

    @Column(name = "win_streak_current")
    private int winStreakCurrent;

    @Column(name = "win_streak_best")
    private int winStreakBest;

    @Column(name = "total_points_scored")
    private int totalPointsScored;

    @Column(name = "rounds_played")
    private int roundsPlayed;

    @Column(name = "lowest_round_score")
    private int lowestRoundScore;

    @Column(name = "highest_round_score")
    private int highestRoundScore;

    @Column(name = "declares_correct")
    private int declaresCorrect;

    @Column(name = "declares_wrong")
    private int declaresWrong;

    /** JSON-encoded String array: ["W","L","W",...] — last 5 results */
    @Column(name = "recent_form", columnDefinition = "TEXT")
    private String recentForm;

    /** JSON-encoded MatchHistoryEntry[] — last 50 matches */
    @Column(name = "match_history", columnDefinition = "TEXT")
    private String matchHistory;

    @Column(name = "updated_at")
    private long updatedAt;
}
