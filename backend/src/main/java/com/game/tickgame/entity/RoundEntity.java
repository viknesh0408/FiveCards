package com.game.tickgame.entity;

import com.game.tickgame.model.Card;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Entity
@Table(name = "rounds")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoundEntity {

    @Id
    @Column(name = "id")
    private String id; // gameId + "_" + roundNumber

    @Column(name = "game_id")
    private String gameId;

    @Column(name = "round_number")
    private int roundNumber;

    @Convert(converter = CardConverter.class)
    @Column(name = "joker_card_data", columnDefinition = "TEXT")
    private Card jokerCard;

    @Column(name = "joker_rank")
    private String jokerRank;

    @Convert(converter = CardListConverter.class)
    @Column(name = "draw_pile_data", columnDefinition = "TEXT")
    private List<Card> drawPile;

    @Convert(converter = CardListConverter.class)
    @Column(name = "discard_pile_data", columnDefinition = "TEXT")
    private List<Card> discardPile;

    @Column(name = "current_player_index")
    private int currentPlayerIndex;

    @Column(name = "round_ended")
    private boolean roundEnded;

    @Column(name = "tick_player_id")
    private String tickPlayerId;

    @Column(name = "end_condition")
    private String endCondition;

    @Column(name = "has_discarded_this_turn")
    private boolean hasDiscardedThisTurn;

    @Column(name = "needs_to_draw")
    private boolean needsToDraw;

    @Column(name = "cards_discarded_this_turn")
    private int cardsDiscardedThisTurn;

    @Column(name = "first_turn_completed")
    private boolean firstTurnCompleted;

    @Convert(converter = PlayerScoresConverter.class)
    @Column(name = "player_scores_data", columnDefinition = "TEXT")
    private Map<String, Integer> playerScores;
}
