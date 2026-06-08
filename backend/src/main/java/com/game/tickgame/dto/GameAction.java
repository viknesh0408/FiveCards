package com.game.tickgame.dto;

import com.game.tickgame.model.Card;
import lombok.Data;

import java.util.List;

@Data
public class GameAction {
    private String type; // "DRAW", "DISCARD", "DISCARD_MULTI", "TICK", "END_TURN", "READY", "START", "REJOIN"
    private String playerId;
    private boolean fromDiscard;
    private Card card;         // single card to discard
    private List<Card> cards;  // multiple cards to discard (same rank)
}
