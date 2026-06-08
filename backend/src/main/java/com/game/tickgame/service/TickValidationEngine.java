package com.game.tickgame.service;

import com.game.tickgame.model.Player;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TickValidationEngine {

    /**
     * Checks if the tick declared by the tickPlayer is correct.
     * A Tick is correct if the tickPlayer's hand FACE VALUE is less than or equal to
     * every other player's hand face value.
     *
     * @param tickPlayer The player who declared Tick
     * @param allPlayers All players in the current game session
     * @return true if correct tick, false if wrong tick
     */
    public boolean isTickCorrect(Player tickPlayer, List<Player> allPlayers) {
        if (tickPlayer == null || allPlayers == null || allPlayers.isEmpty()) {
            return false;
        }

        int tickPlayerHandValue = tickPlayer.getHandValue();

        for (Player p : allPlayers) {
            // If any other player has a strictly lower hand value, the tick is wrong
            if (!p.getId().equals(tickPlayer.getId()) && p.getHandValue() < tickPlayerHandValue) {
                return false;
            }
        }

        return true;
    }
}
