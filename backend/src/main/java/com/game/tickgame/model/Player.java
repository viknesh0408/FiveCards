package com.game.tickgame.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Player {
    private String id;
    private String name;
    private boolean isAi;
    private AiLevel aiLevel;
    private List<Card> hand = new ArrayList<>();
    private int roundScore;
    private int totalScore;
    private boolean isReady;
    private boolean declaredTick;
    private int timeoutCount;

    public Player(String id, String name, boolean isAi, AiLevel aiLevel, List<Card> hand, int roundScore, int totalScore, boolean isReady, boolean declaredTick) {
        this.id = id;
        this.name = name;
        this.isAi = isAi;
        this.aiLevel = aiLevel;
        this.hand = hand;
        this.roundScore = roundScore;
        this.totalScore = totalScore;
        this.isReady = isReady;
        this.declaredTick = declaredTick;
        this.timeoutCount = 0;
    }

    public int getHandValue() {
        if (hand == null) return 0;
        return hand.stream().mapToInt(Card::getValue).sum();
    }

    public void clearHand() {
        if (this.hand == null) {
            this.hand = new ArrayList<>();
        } else {
            this.hand.clear();
        }
        this.declaredTick = false;
        this.roundScore = 0;
    }

    public void addCard(Card card) {
        if (this.hand == null) {
            this.hand = new ArrayList<>();
        }
        this.hand.add(card);
    }

    public void removeCard(Card card) {
        if (this.hand != null) {
            this.hand.remove(card);
        }
    }
}
