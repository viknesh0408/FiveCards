package com.game.tickgame.service;

import com.game.tickgame.model.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameEngine {

    @Autowired
    private AiEngine aiEngine;

    @Autowired
    private ScoreEngine scoreEngine;

    // In-memory store of active game sessions
    private final ConcurrentHashMap<String, Game> activeGames = new ConcurrentHashMap<>();

    public Game createGame(String gameId, int maxRounds) {
        if (gameId == null || gameId.trim().isEmpty()) {
            gameId = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        }
        Game game = new Game();
        game.setGameId(gameId);
        game.setMaxRounds(maxRounds > 0 ? maxRounds : 20);
        game.setStatus(GameStatus.WAITING_FOR_PLAYERS);
        activeGames.put(gameId, game);
        return game;
    }

    public Game getGame(String gameId) {
        return activeGames.get(gameId);
    }

    public void removeGame(String gameId) {
        activeGames.remove(gameId);
    }

    public Player addPlayer(String gameId, String playerId, String name, boolean isAi, AiLevel aiLevel) {
        Game game = activeGames.get(gameId);
        if (game == null) {
            throw new IllegalArgumentException("Game not found: " + gameId);
        }

        if (game.getStatus() != GameStatus.WAITING_FOR_PLAYERS) {
            throw new IllegalStateException("Game already started or finished");
        }

        if (game.getPlayers().size() >= 6) {
            throw new IllegalStateException("Game lobby is full (max 6 players)");
        }

        // Check if player already exists
        Player existing = game.getPlayerById(playerId);
        if (existing != null) {
            return existing;
        }

        Player player = new Player();
        player.setId(playerId);
        player.setName(name);
        player.setAi(isAi);
        player.setAiLevel(aiLevel);
        player.setRoundScore(0);
        player.setTotalScore(0);
        player.setReady(isAi); // AI is always ready
        player.setHand(new ArrayList<>());

        game.getPlayers().add(player);
        return player;
    }

    public void startNewGame(String gameId) {
        Game game = activeGames.get(gameId);
        if (game == null) return;

        game.setCurrentRoundNumber(0);
        game.setWinnerId(null);
        for (Player p : game.getPlayers()) {
            p.setTotalScore(0);
            p.setRoundScore(0);
        }
        startNextRound(gameId);
    }

    public void startNextRound(String gameId) {
        Game game = activeGames.get(gameId);
        if (game == null) return;

        int nextRoundNumber = game.getCurrentRoundNumber() + 1;
        if (nextRoundNumber > game.getMaxRounds()) {
            endGame(game);
            return;
        }

        game.setCurrentRoundNumber(nextRoundNumber);
        game.setStatus(GameStatus.IN_PROGRESS);

        // 1. Create and Shuffle standard 52-card deck
        List<Card> deck = createStandardDeck();
        Collections.shuffle(deck);

        // 2. Select Joker card for the round
        Card jokerCard = deck.remove(0); // Reveal one card from the deck
        while (jokerCard.isJoker()) {
            deck.add(jokerCard); // Put it back at the bottom
            jokerCard = deck.remove(0);
        }
        Rank jokerRank = jokerCard.getRank(); // The revealed card's rank IS the joker rank

        // Mark all remaining deck cards of the same rank as Jokers
        for (Card card : deck) {
            if (card.getRank() == jokerRank) {
                card.setJoker(true);
            }
        }
        // The revealed jokerCard is set aside and not in play, so no need to flag it

        // 3. Clear players' hands and reset round status
        for (Player p : game.getPlayers()) {
            p.clearHand();
            if (!p.isAi()) {
                p.setReady(false); // Reset readiness for humans so they must click ready for next round
            }
        }

        // 4. Deal 5 cards to each player
        for (int i = 0; i < 5; i++) {
            for (Player p : game.getPlayers()) {
                p.addCard(deck.remove(0));
            }
        }

        // 5. Setup Round object
        Round round = new Round();
        round.setRoundNumber(nextRoundNumber);
        round.setJokerCard(jokerCard);
        round.setJokerRank(jokerRank);
        round.setDrawPile(deck);
        round.setRoundEnded(false);

        // 6. Create discard pile with one open card
        List<Card> discardPile = new ArrayList<>();
        discardPile.add(round.getDrawPile().remove(0));
        round.setDiscardPile(discardPile);

        // 7. Choose starting player (rotates each round)
        int startingPlayerIndex = (nextRoundNumber - 1) % game.getPlayers().size();
        round.setCurrentPlayerIndex(startingPlayerIndex);
        round.setTurnStartedAt(System.currentTimeMillis());

        game.setCurrentRound(round);
    }

    public Card drawCard(String gameId, String playerId, boolean fromDiscard) {
        Game game = activeGames.get(gameId);
        if (game == null) throw new IllegalArgumentException("Game not found");

        Round round = game.getCurrentRound();
        if (round == null || round.isRoundEnded()) {
            throw new IllegalStateException("Round is not active");
        }

        List<Player> players = game.getPlayers();
        Player currentPlayer = players.get(round.getCurrentPlayerIndex());

        if (!currentPlayer.getId().equals(playerId)) {
            throw new IllegalStateException("Not your turn!");
        }

        if (!round.isHasDiscardedThisTurn()) {
            throw new IllegalStateException("Must discard a card before drawing");
        }

        if (!round.isNeedsToDraw()) {
            throw new IllegalStateException("You matched the previous discard; no need to draw a card.");
        }

        Card drawnCard;
        if (fromDiscard) {
            int k = round.getCardsDiscardedThisTurn();
            if (k <= 0) {
                int handSize = currentPlayer.getHand().size();
                k = 5 - handSize; // fallback
            }
            int drawableIndex = round.getDiscardPile().size() - k - 1;
            if (drawableIndex < 0 || drawableIndex >= round.getDiscardPile().size()) {
                throw new IllegalStateException("No previous discard card available to draw.");
            }
            drawnCard = round.getDiscardPile().remove(drawableIndex);
        } else {
            if (round.getDrawPile().isEmpty()) {
                round.setEndCondition("DECK_EXHAUSTED");
                endRound(game, round);
                throw new IllegalStateException("Draw pile is empty. Round ended.");
            }
            drawnCard = round.getDrawPile().remove(0);
        }

        currentPlayer.addCard(drawnCard);
        round.setNeedsToDraw(false);
        return drawnCard;
    }

    public void discardCard(String gameId, String playerId, Card cardToDiscard) {
        Game game = activeGames.get(gameId);
        if (game == null) throw new IllegalArgumentException("Game not found");

        Round round = game.getCurrentRound();
        if (round == null || round.isRoundEnded()) {
            throw new IllegalStateException("Round is not active");
        }

        List<Player> players = game.getPlayers();
        Player currentPlayer = players.get(round.getCurrentPlayerIndex());

        if (!currentPlayer.getId().equals(playerId)) {
            throw new IllegalStateException("Not your turn!");
        }

        if (round.isHasDiscardedThisTurn()) {
            throw new IllegalStateException("Already discarded this turn.");
        }

        // Find card in hand
        Card handCard = null;
        for (Card c : currentPlayer.getHand()) {
            if (c.getRank() == cardToDiscard.getRank() && c.getSuit() == cardToDiscard.getSuit()) {
                handCard = c;
                break;
            }
        }

        if (handCard == null) {
            throw new IllegalArgumentException("Card not in hand: " + cardToDiscard);
        }

        Card previousTopCard = round.getTopDiscardCard();

        currentPlayer.removeCard(handCard);
        round.getDiscardPile().add(handCard);
        round.setHasDiscardedThisTurn(true);
        round.setCardsDiscardedThisTurn(1);

        // Check if matching the rank of previous top card of discard pile
        if (previousTopCard != null && handCard.getRank() == previousTopCard.getRank()) {
            round.setNeedsToDraw(false);
        } else {
            round.setNeedsToDraw(true);
            round.setTurnStartedAt(System.currentTimeMillis());
        }

        // Check if player reaches 0 cards (wins/ends the round)
        if (currentPlayer.getHand().isEmpty()) {
            round.setNeedsToDraw(false); // Out of cards, no drawing needed!
            long activePlayersCount = getPlayersWithCardsCount(game);
            if (activePlayersCount < 2) {
                round.setEndCondition("OUT_OF_CARDS");
                endRound(game, round);
            }
        }
    }

    /**
     * Allows a player to discard multiple cards of the SAME rank at once.
     * The rank-match rule applies: if the rank matches the current top discard, no draw needed.
     */
    public void discardMultipleCards(String gameId, String playerId, List<Card> cardsToDiscard) {
        if (cardsToDiscard == null || cardsToDiscard.isEmpty()) {
            throw new IllegalArgumentException("No cards provided to discard.");
        }

        Game game = activeGames.get(gameId);
        if (game == null) throw new IllegalArgumentException("Game not found");

        Round round = game.getCurrentRound();
        if (round == null || round.isRoundEnded()) {
            throw new IllegalStateException("Round is not active");
        }

        List<Player> players = game.getPlayers();
        Player currentPlayer = players.get(round.getCurrentPlayerIndex());

        if (!currentPlayer.getId().equals(playerId)) {
            throw new IllegalStateException("Not your turn!");
        }

        if (round.isHasDiscardedThisTurn()) {
            throw new IllegalStateException("Already discarded this turn.");
        }

        // Validate all cards share the same rank
        Rank targetRank = cardsToDiscard.get(0).getRank();
        for (Card c : cardsToDiscard) {
            if (c.getRank() != targetRank) {
                throw new IllegalArgumentException("All discarded cards must share the same rank.");
            }
        }

        // Find and remove each card from hand
        List<Card> handCopy = currentPlayer.getHand();
        List<Card> resolvedCards = new ArrayList<>();
        for (Card cd : cardsToDiscard) {
            Card found = null;
            for (Card handCard : handCopy) {
                if (handCard.getRank() == cd.getRank() && handCard.getSuit() == cd.getSuit()) {
                    // Make sure we haven't already claimed this card
                    if (!resolvedCards.contains(handCard)) {
                        found = handCard;
                        break;
                    }
                }
            }
            if (found == null) {
                throw new IllegalArgumentException("Card not in hand: " + cd);
            }
            resolvedCards.add(found);
        }

        Card previousTopCard = round.getTopDiscardCard();

        // Remove all resolved cards from hand and add to discard pile
        for (Card resolved : resolvedCards) {
            currentPlayer.removeCard(resolved);
            round.getDiscardPile().add(resolved);
        }
        round.setHasDiscardedThisTurn(true);
        round.setCardsDiscardedThisTurn(resolvedCards.size());

        // Check rank-match rule: if any discarded card matches the previous top card rank, no draw needed
        if (previousTopCard != null && previousTopCard.getRank() == targetRank) {
            round.setNeedsToDraw(false);
        } else {
            round.setNeedsToDraw(true);
            round.setTurnStartedAt(System.currentTimeMillis());
        }

        // Check if player runs out of cards
        if (currentPlayer.getHand().isEmpty()) {
            round.setNeedsToDraw(false); // Out of cards, no drawing needed!
            long activePlayersCount = getPlayersWithCardsCount(game);
            if (activePlayersCount < 2) {
                round.setEndCondition("OUT_OF_CARDS");
                endRound(game, round);
            }
        }
    }

    public void declareTick(String gameId, String playerId) {
        Game game = activeGames.get(gameId);
        if (game == null) throw new IllegalArgumentException("Game not found");

        Round round = game.getCurrentRound();
        if (round == null || round.isRoundEnded()) {
            throw new IllegalStateException("Round is not active");
        }

        List<Player> players = game.getPlayers();
        Player currentPlayer = players.get(round.getCurrentPlayerIndex());

        if (!currentPlayer.getId().equals(playerId)) {
            throw new IllegalStateException("Not your turn!");
        }

        if (round.isHasDiscardedThisTurn()) {
            throw new IllegalStateException("Cannot declare Tick after discarding/drawing cards");
        }

        currentPlayer.setDeclaredTick(true);
        round.setTickPlayerId(playerId);
        round.setEndCondition("TICK");
        endRound(game, round);
    }

    public void endTurn(String gameId, String playerId) {
        Game game = activeGames.get(gameId);
        if (game == null) throw new IllegalArgumentException("Game not found");

        Round round = game.getCurrentRound();
        if (round == null || round.isRoundEnded()) {
            throw new IllegalStateException("Round is not active");
        }

        List<Player> players = game.getPlayers();
        Player currentPlayer = players.get(round.getCurrentPlayerIndex());

        if (!currentPlayer.getId().equals(playerId)) {
            throw new IllegalStateException("Not your turn!");
        }

        if (!round.isHasDiscardedThisTurn()) {
            throw new IllegalStateException("Must discard a card before ending turn");
        }

        if (round.isNeedsToDraw()) {
            throw new IllegalStateException("Must draw a card before ending turn");
        }

        // Reset turn state variables for the next player
        round.setHasDiscardedThisTurn(false);
        round.setNeedsToDraw(false);
        round.setFirstTurnCompleted(true);

        // Advance turn to next player (skipping any who ran out of cards)
        int nextPlayerIndex = (round.getCurrentPlayerIndex() + 1) % players.size();
        int attempts = 0;
        while (players.get(nextPlayerIndex).getHand().isEmpty() && attempts < players.size()) {
            nextPlayerIndex = (nextPlayerIndex + 1) % players.size();
            attempts++;
        }
        round.setCurrentPlayerIndex(nextPlayerIndex);
        round.setTurnStartedAt(System.currentTimeMillis());
    }

    private void endRound(Game game, Round round) {
        round.setRoundEnded(true);
        scoreEngine.calculateRoundScores(game, round);
        game.getRounds().add(round);
        game.setStatus(GameStatus.ROUND_OVER);

        // Check if we reached the max rounds limit
        if (game.getCurrentRoundNumber() >= game.getMaxRounds()) {
            endGame(game);
        }
    }

    private void endGame(Game game) {
        game.setStatus(GameStatus.GAME_OVER);
        
        // Find player with the minimum total score
        Player winner = null;
        int minTotalScore = Integer.MAX_VALUE;
        for (Player p : game.getPlayers()) {
            if (p.getTotalScore() < minTotalScore) {
                minTotalScore = p.getTotalScore();
                winner = p;
            }
        }

        if (winner != null) {
            game.setWinnerId(winner.getId());
        }
    }

    private List<Card> createStandardDeck() {
        List<Card> deck = new ArrayList<>();
        for (Suit suit : Suit.values()) {
            for (Rank rank : Rank.values()) {
                deck.add(new Card(suit, rank, false));
            }
        }
        // Add 2 printed Jokers
        deck.add(new Card(null, null, true));
        deck.add(new Card(null, null, true));

        // Add 20 extra cards from a second deck to increase draw pile size
        List<Card> extraDeck = new ArrayList<>();
        for (Suit suit : Suit.values()) {
            for (Rank rank : Rank.values()) {
                extraDeck.add(new Card(suit, rank, false));
            }
        }
        Collections.shuffle(extraDeck);
        deck.addAll(extraDeck.subList(0, 20));

        return deck;
    }

    public void skipEmptyHandedPlayers(Round round, List<Player> players) {
        if (players == null || players.isEmpty()) return;
        int currIndex = round.getCurrentPlayerIndex();
        int index = currIndex % players.size();
        int attempts = 0;
        while (players.get(index).getHand().isEmpty() && attempts < players.size()) {
            index = (index + 1) % players.size();
            attempts++;
        }
        round.setCurrentPlayerIndex(index);
    }

    private long getPlayersWithCardsCount(Game game) {
        if (game.getPlayers() == null) return 0;
        return game.getPlayers().stream()
                .filter(p -> p.getHand() != null && !p.getHand().isEmpty())
                .count();
    }
}
