package com.game.tickgame.entity;

import com.game.tickgame.model.Card;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Entity
@Table(name = "players")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlayerEntity {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "game_id")
    private String gameId;

    @Column(name = "name")
    private String name;

    @Column(name = "is_ai")
    private boolean isAi;

    @Column(name = "ai_level")
    private String aiLevel;

    @Column(name = "total_score")
    private int totalScore;

    @Column(name = "round_score")
    private int roundScore;

    @Column(name = "is_ready")
    private boolean isReady;

    @Column(name = "declared_tick")
    private boolean declaredTick;

    @Convert(converter = CardListConverter.class)
    @Column(name = "hand_data", columnDefinition = "TEXT")
    private List<Card> hand;

    @Column(name = "timeout_count")
    private int timeoutCount;

    @Column(name = "avatar")
    private String avatar = "none";

    @Column(name = "avatar_pic")
    private String avatarPic = "none";

    public PlayerEntity(String id, String gameId, String name, boolean isAi, String aiLevel, int totalScore, int roundScore, boolean isReady, boolean declaredTick, List<Card> hand) {
        this.id = id;
        this.gameId = gameId;
        this.name = name;
        this.isAi = isAi;
        this.aiLevel = aiLevel;
        this.totalScore = totalScore;
        this.roundScore = roundScore;
        this.isReady = isReady;
        this.declaredTick = declaredTick;
        this.hand = hand;
        this.timeoutCount = 0;
        this.avatar = "none";
        this.avatarPic = "none";
    }
}
