package com.game.tickgame.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Round {
    private int roundNumber;
    private Card jokerCard;
    private Rank jokerRank;
    private List<Card> drawPile = new ArrayList<>();
    private List<Card> discardPile = new ArrayList<>();
    private int currentPlayerIndex;
    private boolean roundEnded;
    private String tickPlayerId;
    private String endCondition; // "TICK" or "DECK_EXHAUSTED"
    private boolean hasDiscardedThisTurn;
    private boolean needsToDraw;
    private int cardsDiscardedThisTurn;
    private Long turnStartedAt;
    private boolean firstTurnCompleted;
    private Map<String, Integer> playerScores = new HashMap<>();

    public Card getTopDiscardCard() {
        if (discardPile == null || discardPile.isEmpty()) {
            return null;
        }
        return discardPile.get(discardPile.size() - 1);
    }
}
