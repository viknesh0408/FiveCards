package com.game.tickgame.service;

import com.game.tickgame.model.*;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Random;

@Service
public class AiEngine {

    private final Random random = new Random();

    /**
     * Determines if the AI should draw from the discard pile instead of the deck.
     * AI draws from discard if the drawable card (previous top discard) is a Joker or has value <= 5.
     */
    public boolean shouldDrawFromDiscard(Player aiPlayer, Round round) {
        if (round == null || round.getDiscardPile() == null || round.getDiscardPile().isEmpty()) {
            return false;
        }

        int k = round.getCardsDiscardedThisTurn();
        if (k <= 0) {
            int handSize = aiPlayer.getHand().size();
            k = 5 - handSize;
        }
        int drawableIndex = round.getDiscardPile().size() - k - 1;
        if (drawableIndex < 0 || drawableIndex >= round.getDiscardPile().size()) {
            return false;
        }

        Card drawableCard = round.getDiscardPile().get(drawableIndex);
        return drawableCard.isJoker() || drawableCard.getValue() <= 5;
    }

    /**
     * Chooses which card to discard from the player's hand.
     * If there is a card matching the top of the discard pile, we play it.
     * Otherwise, we play the card with the highest face value (to reduce hand score).
     */
    public Card chooseCardToDiscard(Player aiPlayer, Round round) {
        List<Card> hand = aiPlayer.getHand();
        if (hand == null || hand.isEmpty()) {
            return null;
        }

        Card topDiscard = (round != null) ? round.getTopDiscardCard() : null;
        if (topDiscard != null) {
            // Check if we hold a card of the same rank as the top discard card
            for (Card c : hand) {
                if (c.getRank() == topDiscard.getRank()) {
                    return c; // Play matching card to avoid drawing
                }
            }
        }

        // If no matching card, discard the card with the highest face value to minimize hand score
        int maxVal = hand.stream()
                .mapToInt(Card::getValue)
                .max()
                .orElse(0);

        return hand.stream()
                .filter(c -> c.getValue() == maxVal)
                .findFirst()
                .orElse(hand.get(0));
    }

    /**
     * Decides whether the AI player should declare Tick.
     * Ticking is based on a human-like risk calculation using the bot's own hand value
     * and the card counts of opponents (avoiding looking at opponents' actual hidden hand values).
     */
    public boolean shouldDeclareTick(Player aiPlayer, Game game, Round round) {
        int myHandValue = aiPlayer.getHandValue();

        // Human-like decision: Estimate opponent scores based on their card counts
        int maxHandValueToTick = 7; // base threshold for ticking (under average hand value)

        for (Player p : game.getPlayers()) {
            if (!p.getId().equals(aiPlayer.getId()) && p.getHand() != null) {
                int opponentCardCount = p.getHand().size();
                if (opponentCardCount == 1) {
                    maxHandValueToTick = Math.min(maxHandValueToTick, 2);
                } else if (opponentCardCount == 2) {
                    maxHandValueToTick = Math.min(maxHandValueToTick, 4);
                } else if (opponentCardCount == 3) {
                    maxHandValueToTick = Math.min(maxHandValueToTick, 6);
                }
            }
        }

        return myHandValue <= maxHandValueToTick;
    }
}
