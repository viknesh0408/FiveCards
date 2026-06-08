package com.game.tickgame.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Card {
    private Suit suit;
    private Rank rank;
    private boolean joker;

    public int getValue() {
        return joker ? 0 : rank.getDefaultPoints();
    }
}
