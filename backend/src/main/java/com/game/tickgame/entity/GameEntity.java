package com.game.tickgame.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "games")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GameEntity {

    @Id
    @Column(name = "game_id")
    private String gameId;

    @Column(name = "status")
    private String status;

    @Column(name = "current_round_number")
    private int currentRoundNumber;

    @Column(name = "max_rounds")
    private int maxRounds;

    @Column(name = "winner_id")
    private String winnerId;

    @Column(name = "is_multiplayer")
    private boolean isMultiplayer;
}
