package com.game.tickgame.service;

import com.game.tickgame.model.Game;
import com.game.tickgame.model.Player;
import com.game.tickgame.model.Round;
import org.springframework.stereotype.Service;

import org.springframework.beans.factory.annotation.Autowired;
import java.util.List;

@Service
public class ScoreEngine {

    @Autowired
    private TickValidationEngine tickValidationEngine;

    /**
     * Calculates the round scores and updates total scores for all players in the game.
     * Scoring is based on the FACE VALUE SUM of remaining cards in each player's hand.
     * Joker = 0, Ace = 1, Numbers = face value, J = 11, Q = 12, K = 13.
     */
    public void calculateRoundScores(Game game, Round round) {
        List<Player> players = game.getPlayers();
        if (players == null || players.isEmpty()) {
            return;
        }

        boolean isTick = round.getTickPlayerId() != null && "TICK".equals(round.getEndCondition());

        // Filter out players who already dropped all cards (they are "safe" with 0 points)
        List<Player> activePlayers = players.stream()
                .filter(p -> p.getHand() != null && !p.getHand().isEmpty())
                .toList();

        // Players who already have 0 cards are "safe" - set their score to 0
        for (Player p : players) {
            if (p.getHand() == null || p.getHand().isEmpty()) {
                p.setRoundScore(0);
                p.setTotalScore(p.getTotalScore() + p.getRoundScore());
                round.getPlayerScores().put(p.getId(), p.getRoundScore());
            }
        }

        if (activePlayers.isEmpty()) {
            return;
        }

        if (isTick) {
            String tickPlayerId = round.getTickPlayerId();
            Player tickPlayer = game.getPlayerById(tickPlayerId);

            if (tickPlayer != null) {
                // Find the minimum hand value among active players only
                int minHandValue = Integer.MAX_VALUE;
                for (Player p : activePlayers) {
                    minHandValue = Math.min(minHandValue, p.getHandValue());
                }

                // Verify using separate Tick validation engine
                boolean isCorrectTick = tickValidationEngine.isTickCorrect(tickPlayer, activePlayers);

                if (isCorrectTick) {
                    // Correct Tick: declarer gets 0, others get their hand value as penalty,
                    // unless they tied the declarer's lowest score, in which case they also get 0.
                    int tickPlayerHandValue = tickPlayer.getHandValue();
                    for (Player p : activePlayers) {
                        if (p.getId().equals(tickPlayerId) || p.getHandValue() == tickPlayerHandValue) {
                            p.setRoundScore(0);
                        } else {
                            p.setRoundScore(p.getHandValue());
                        }
                        p.setTotalScore(p.getTotalScore() + p.getRoundScore());
                        round.getPlayerScores().put(p.getId(), p.getRoundScore());
                    }
                } else {
                    // Wrong Tick: declarer gets 80 penalty, player with lowest hand value gets 0
                    for (Player p : activePlayers) {
                        if (p.getId().equals(tickPlayerId)) {
                            p.setRoundScore(80);
                        } else if (p.getHandValue() == minHandValue) {
                            p.setRoundScore(0);
                        } else {
                            p.setRoundScore(p.getHandValue());
                        }
                        p.setTotalScore(p.getTotalScore() + p.getRoundScore());
                        round.getPlayerScores().put(p.getId(), p.getRoundScore());
                    }
                }
            }
        } else {
            // Out of Cards: player with lowest hand value gets 0, others get their hand value
            int minHandValue = Integer.MAX_VALUE;
            for (Player p : players) {
                int handVal = (p.getHand() == null || p.getHand().isEmpty()) ? 0 : p.getHandValue();
                minHandValue = Math.min(minHandValue, handVal);
            }

            for (Player p : activePlayers) {
                if (p.getHandValue() == minHandValue) {
                    p.setRoundScore(0);
                } else {
                    p.setRoundScore(p.getHandValue());
                }
                p.setTotalScore(p.getTotalScore() + p.getRoundScore());
                round.getPlayerScores().put(p.getId(), p.getRoundScore());
            }
        }
    }
}
