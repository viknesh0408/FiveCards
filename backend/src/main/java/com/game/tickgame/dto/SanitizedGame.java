package com.game.tickgame.dto;

import com.game.tickgame.model.*;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Data
public class SanitizedGame {
    private String gameId;
    private List<SanitizedPlayer> players;
    private int currentRoundNumber;
    private int maxRounds;
    private SanitizedRound currentRound;
    private List<SanitizedRound> rounds;
    private GameStatus status;
    private String winnerId;
    private boolean isMultiplayer;

    @Data
    public static class SanitizedPlayer {
        private String id;
        private String name;
        private boolean isAi;
        private AiLevel aiLevel;
        private List<Card> hand;
        private int cardCount;
        private int roundScore;
        private int totalScore;
        private boolean isReady;
        private boolean declaredTick;
    }

    @Data
    public static class SanitizedRound {
        private int roundNumber;
        private Card jokerCard;
        private Rank jokerRank;
        private int drawPileSize;
        private List<Card> discardPile;
        private int currentPlayerIndex;
        private boolean roundEnded;
        private String tickPlayerId;
        private String endCondition;
        private boolean needsToDraw;
        private boolean hasDiscardedThisTurn;
        private int cardsDiscardedThisTurn;
        private Long turnStartedAt;
        private boolean firstTurnCompleted;
        private Map<String, Integer> playerScores;
    }

    public static SanitizedGame fromGame(Game game, String playerId) {
        if (game == null) return null;

        SanitizedGame sg = new SanitizedGame();
        sg.setGameId(game.getGameId());
        sg.setCurrentRoundNumber(game.getCurrentRoundNumber());
        sg.setMaxRounds(game.getMaxRounds());
        sg.setStatus(game.getStatus());
        sg.setWinnerId(game.getWinnerId());
        sg.setMultiplayer(game.isMultiplayer());

        boolean revealAll = (game.getStatus() == GameStatus.ROUND_OVER || game.getStatus() == GameStatus.GAME_OVER);

        // Map Players
        List<SanitizedPlayer> sPlayers = new ArrayList<>();
        for (Player p : game.getPlayers()) {
            SanitizedPlayer sp = new SanitizedPlayer();
            sp.setId(p.getId());
            sp.setName(p.getName());
            sp.setAi(p.isAi());
            sp.setAiLevel(p.getAiLevel());
            sp.setRoundScore(p.getRoundScore());
            sp.setTotalScore(p.getTotalScore());
            sp.setReady(p.isReady());
            sp.setDeclaredTick(p.isDeclaredTick());
            sp.setCardCount(p.getHand() != null ? p.getHand().size() : 0);

            // Hide cards unless it's this player, or the round is finished and we show all hands
            if (revealAll || p.getId().equals(playerId)) {
                sp.setHand(p.getHand());
            } else {
                sp.setHand(new ArrayList<>()); // Empty hand for opponents during play
            }
            sPlayers.add(sp);
        }
        sg.setPlayers(sPlayers);

        // Map Current Round
        if (game.getCurrentRound() != null) {
            Round r = game.getCurrentRound();
            SanitizedRound sr = new SanitizedRound();
            sr.setRoundNumber(r.getRoundNumber());
            sr.setJokerCard(r.getJokerCard());
            sr.setJokerRank(r.getJokerRank());
            sr.setDrawPileSize(r.getDrawPile() != null ? r.getDrawPile().size() : 0);
            sr.setDiscardPile(r.getDiscardPile());
            sr.setCurrentPlayerIndex(r.getCurrentPlayerIndex());
            sr.setRoundEnded(r.isRoundEnded());
            sr.setTickPlayerId(r.getTickPlayerId());
            sr.setEndCondition(r.getEndCondition());
            sr.setNeedsToDraw(r.isNeedsToDraw());
            sr.setHasDiscardedThisTurn(r.isHasDiscardedThisTurn());
            sr.setCardsDiscardedThisTurn(r.getCardsDiscardedThisTurn());
            sr.setTurnStartedAt(r.getTurnStartedAt());
            sr.setFirstTurnCompleted(r.isFirstTurnCompleted());
            sr.setPlayerScores(r.getPlayerScores());
            sg.setCurrentRound(sr);
        }

        // Map Round History (Optional, typically sanitizes history too)
        if (game.getRounds() != null) {
            List<SanitizedRound> sRounds = game.getRounds().stream().map(r -> {
                SanitizedRound sr = new SanitizedRound();
                sr.setRoundNumber(r.getRoundNumber());
                sr.setJokerCard(r.getJokerCard());
                sr.setJokerRank(r.getJokerRank());
                sr.setDrawPileSize(r.getDrawPile() != null ? r.getDrawPile().size() : 0);
                sr.setDiscardPile(r.getDiscardPile());
                sr.setCurrentPlayerIndex(r.getCurrentPlayerIndex());
                sr.setRoundEnded(r.isRoundEnded());
                sr.setTickPlayerId(r.getTickPlayerId());
                sr.setEndCondition(r.getEndCondition());
                sr.setNeedsToDraw(r.isNeedsToDraw());
                sr.setHasDiscardedThisTurn(r.isHasDiscardedThisTurn());
                sr.setCardsDiscardedThisTurn(r.getCardsDiscardedThisTurn());
                sr.setTurnStartedAt(r.getTurnStartedAt());
                sr.setFirstTurnCompleted(r.isFirstTurnCompleted());
                sr.setPlayerScores(r.getPlayerScores());
                return sr;
            }).collect(Collectors.toList());
            sg.setRounds(sRounds);
        }

        return sg;
    }
}
