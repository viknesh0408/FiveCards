package com.game.tickgame.model;

public enum Rank {
    ACE(1),
    TWO(2),
    THREE(3),
    FOUR(4),
    FIVE(5),
    SIX(6),
    SEVEN(7),
    EIGHT(8),
    NINE(9),
    TEN(10),
    JACK(11),
    QUEEN(12),
    KING(13);

    private final int defaultPoints;

    Rank(int defaultPoints) {
        this.defaultPoints = defaultPoints;
    }

    public int getDefaultPoints() {
        return this.defaultPoints;
    }

    public Rank next() {
        Rank[] values = Rank.values();
        return values[(this.ordinal() + 1) % values.length];
    }
}
