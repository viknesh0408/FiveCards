package com.game.tickgame.service;

import com.game.tickgame.model.*;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class AiEngine {

    private final Random random = new Random();

    /**
     * Determines if the AI should draw from the discard pile instead of the deck.
     * Medium-Hard: takes a card if it is a Joker, has value <= 7, OR if it creates
     * a pair in hand (same rank as any card already held). Occasionally passes on a
     * low-value card to avoid being fully predictable (10% bluff skip).
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

        // Always take a Joker
        if (drawableCard.isJoker()) return true;

        // Take if it makes a matching pair with a card in hand (strategic pair-building)
        boolean makesPair = aiPlayer.getHand().stream()
                .anyMatch(c -> c.getRank() == drawableCard.getRank());
        if (makesPair) {
            // 90% chance to take (small randomness so it's not perfectly predictable)
            return random.nextInt(10) < 9;
        }

        // Take if value is <= 7 (raised from <= 5)
        if (drawableCard.getValue() <= 7) {
            // 10% bluff — occasionally skip even a good card to keep opponent guessing
            return random.nextInt(10) < 9;
        }

        return false;
    }

    /**
     * Chooses which card(s) to discard from the player's hand.
     * Medium-Hard strategy:
     *  1. If holding a pair (or more) of the highest-value rank, dump them all at once.
     *  2. If a card matches the top discard rank, play it to avoid drawing.
     *  3. Otherwise discard the single highest-value card.
     *  4. Never discard a Joker if a better option exists.
     */
    public List<Card> chooseCardsToDiscard(Player aiPlayer, Round round) {
        List<Card> hand = aiPlayer.getHand();
        if (hand == null || hand.isEmpty()) {
            return List.of();
        }

        Card topDiscard = (round != null) ? round.getTopDiscardCard() : null;

        // --- Priority 1: Match the top discard to avoid drawing ---
        if (topDiscard != null) {
            List<Card> matchingCards = hand.stream()
                    .filter(c -> c.getRank() == topDiscard.getRank())
                    .collect(Collectors.toList());
            if (!matchingCards.isEmpty()) {
                // Dump ALL matching cards (multi-discard) to maximally reduce hand value
                return matchingCards;
            }
        }

        // --- Priority 2: Discard a pair/set of the highest non-Joker rank ---
        Map<Rank, List<Card>> byRank = hand.stream()
                .filter(c -> !c.isJoker())
                .collect(Collectors.groupingBy(Card::getRank));

        // Find the rank group that gives the best value dump (highest total value, >= 2 cards preferred)
        List<Card> bestGroup = null;
        int bestGroupValue = -1;
        for (Map.Entry<Rank, List<Card>> entry : byRank.entrySet()) {
            List<Card> group = entry.getValue();
            int groupValue = group.stream().mapToInt(Card::getValue).sum();
            if (group.size() >= 2 && groupValue > bestGroupValue) {
                bestGroupValue = groupValue;
                bestGroup = group;
            }
        }
        if (bestGroup != null) {
            return bestGroup; // Dump the whole high-value pair/set
        }

        // --- Priority 3: Discard single highest-value card (avoid discarding Jokers) ---
        List<Card> nonJokers = hand.stream()
                .filter(c -> !c.isJoker())
                .sorted(Comparator.comparingInt(Card::getValue).reversed())
                .collect(Collectors.toList());

        if (!nonJokers.isEmpty()) {
            return List.of(nonJokers.get(0));
        }

        // Fallback: discard first card (shouldn't normally happen)
        return List.of(hand.get(0));
    }

    /**
     * Legacy single-card chooser — delegates to chooseCardsToDiscard and returns the first.
     */
    public Card chooseCardToDiscard(Player aiPlayer, Round round) {
        List<Card> chosen = chooseCardsToDiscard(aiPlayer, round);
        return chosen.isEmpty() ? null : chosen.get(0);
    }

    /**
     * Decides whether the AI player should declare Tick.
     * Medium-Hard: Base threshold raised to 10. Opponent pressure (low card counts)
     * tightens it, but the AI is now more willing to bluff-tick on a slightly worse hand.
     */
    public boolean shouldDeclareTick(Player aiPlayer, Game game, Round round) {
        int myHandValue = aiPlayer.getHandValue();

        // Raised base threshold — AI ticks more aggressively than before
        int maxHandValueToTick = 10;

        for (Player p : game.getPlayers()) {
            if (!p.getId().equals(aiPlayer.getId()) && p.getHand() != null) {
                int opponentCardCount = p.getHand().size();
                // Tighten threshold as opponents get close to winning
                if (opponentCardCount == 1) {
                    maxHandValueToTick = Math.min(maxHandValueToTick, 3);
                } else if (opponentCardCount == 2) {
                    maxHandValueToTick = Math.min(maxHandValueToTick, 6);
                } else if (opponentCardCount == 3) {
                    maxHandValueToTick = Math.min(maxHandValueToTick, 8);
                }
            }
        }

        // Occasional confidence bluff: tick even slightly over threshold (within 2 points), 20% of the time
        if (myHandValue <= maxHandValueToTick + 2 && random.nextInt(10) < 2) {
            return true;
        }

        return myHandValue <= maxHandValueToTick;
    }
}
