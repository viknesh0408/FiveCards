package com.game.tickgame;

import com.game.tickgame.model.*;
import com.game.tickgame.service.AiEngine;
import com.game.tickgame.service.GameEngine;
import com.game.tickgame.service.ScoreEngine;
import com.game.tickgame.service.GamePersistenceService;
import com.game.tickgame.controller.GameWebSocketController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.ArrayList;
import java.util.List;
import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class TickGameEngineTests {

    @Autowired
    private GameWebSocketController gameWebSocketController;

    @Autowired
    private GameEngine gameEngine;

    @Autowired
    private ScoreEngine scoreEngine;

    @Autowired
    private AiEngine aiEngine;

    @Autowired
    private GamePersistenceService gamePersistenceService;

    @Test
    public void testPersistence() {
        Game game = gameEngine.createGame("TEST_PER", 5);
        gameEngine.addPlayer("TEST_PER", "P1", "Alice", false, null);
        gameEngine.addPlayer("TEST_PER", "P2", "Bot1", true, AiLevel.EASY);
        gameEngine.startNewGame("TEST_PER");
        
        // Save
        gamePersistenceService.saveGame(game);
        
        // Load
        Game loaded = gamePersistenceService.loadGame("TEST_PER");
        assertNotNull(loaded);
        assertEquals(2, loaded.getPlayers().size());
        assertEquals("Alice", loaded.getPlayers().get(0).getName());
        assertEquals("Bot1", loaded.getPlayers().get(1).getName());
    }

    @Test
    public void testCardValuesAndJokerRankShift() {
        // Test basic rank values
        Card ace = new Card(Suit.HEARTS, Rank.ACE, false);
        assertEquals(1, ace.getValue());

        Card ten = new Card(Suit.DIAMONDS, Rank.TEN, false);
        assertEquals(10, ten.getValue());

        Card jack = new Card(Suit.SPADES, Rank.JACK, false);
        assertEquals(11, jack.getValue());

        Card queen = new Card(Suit.HEARTS, Rank.QUEEN, false);
        assertEquals(12, queen.getValue());

        Card king = new Card(Suit.CLUBS, Rank.KING, false);
        assertEquals(13, king.getValue());

        // Test next rank shifting (Joker assignment)
        assertEquals(Rank.TWO, Rank.ACE.next());
        assertEquals(Rank.ACE, Rank.KING.next());
        assertEquals(Rank.NINE, Rank.EIGHT.next());

        // Joker card counts as 0 points
        Card jokerAce = new Card(Suit.SPADES, Rank.ACE, true);
        assertEquals(0, jokerAce.getValue());
    }

    @Test
    public void testCorrectTickScoring() {
        Game game = new Game();
        game.setGameId("TEST1");

        // Player A = 1 card (count = 1)
        Player pA = new Player("A", "Alice", false, null, 
                new ArrayList<>(List.of(new Card(Suit.HEARTS, Rank.FIVE, false))), 0, 0, true, false);
        
        // Player B = 2 cards (count = 2)
        Player pB = new Player("B", "Bob", false, null, 
                new ArrayList<>(List.of(new Card(Suit.DIAMONDS, Rank.TEN, false), new Card(Suit.HEARTS, Rank.TWO, false))), 0, 0, true, false);

        // Player C = 2 cards (count = 2)
        Player pC = new Player("C", "Charlie", false, null, 
                new ArrayList<>(List.of(new Card(Suit.CLUBS, Rank.KING, false), new Card(Suit.SPADES, Rank.EIGHT, false))), 0, 0, true, false);

        game.setPlayers(List.of(pA, pB, pC));

        // Round ends with Player A declaring a correct Tick (has lowest card count = 1)
        Round round = new Round();
        round.setRoundNumber(1);
        round.setTickPlayerId("A");
        round.setEndCondition("TICK");
        round.setRoundEnded(true);

        scoreEngine.calculateRoundScores(game, round);

        // Check scores: Alice (A) should get 0, Bob (B) gets 12 (10+2), Charlie (C) gets 21 (13+8)
        assertEquals(0, pA.getRoundScore());
        assertEquals(0, pA.getTotalScore());

        assertEquals(12, pB.getRoundScore());
        assertEquals(12, pB.getTotalScore());

        assertEquals(21, pC.getRoundScore());
        assertEquals(21, pC.getTotalScore());
    }

    @Test
    public void testCorrectTickScoringWithTies() {
        Game game = new Game();
        game.setGameId("TEST_TIE");

        // Player A (declarer) has 7 points (5 + 2)
        Player pA = new Player("A", "Alice", false, null, 
                new ArrayList<>(List.of(new Card(Suit.HEARTS, Rank.FIVE, false), new Card(Suit.DIAMONDS, Rank.TWO, false))), 0, 0, true, false);
        
        // Player B (tied with A) has 7 points (4 + 3)
        Player pB = new Player("B", "Bob", false, null, 
                new ArrayList<>(List.of(new Card(Suit.CLUBS, Rank.FOUR, false), new Card(Suit.SPADES, Rank.THREE, false))), 0, 0, true, false);

        // Player C (higher) has 12 points (10 + 2)
        Player pC = new Player("C", "Charlie", false, null, 
                new ArrayList<>(List.of(new Card(Suit.CLUBS, Rank.TEN, false), new Card(Suit.SPADES, Rank.TWO, false))), 0, 0, true, false);

        game.setPlayers(List.of(pA, pB, pC));

        Round round = new Round();
        round.setRoundNumber(1);
        round.setTickPlayerId("A");
        round.setEndCondition("TICK");
        round.setRoundEnded(true);

        scoreEngine.calculateRoundScores(game, round);

        // A and B both tie for lowest (7 points), so A (declarer) gets 0 and B (tying player) also gets 0!
        // Charlie gets 12 penalty points.
        assertEquals(0, pA.getRoundScore());
        assertEquals(0, pB.getRoundScore());
        assertEquals(12, pC.getRoundScore());
    }

    @Test
    public void testWrongTickScoring() {
        Game game = new Game();
        game.setGameId("TEST2");

        // Tick Player A = 3 cards (count = 3)
        Player pA = new Player("A", "Alice", false, null, 
                new ArrayList<>(List.of(
                        new Card(Suit.HEARTS, Rank.SEVEN, false),
                        new Card(Suit.CLUBS, Rank.FIVE, false),
                        new Card(Suit.DIAMONDS, Rank.ACE, false)
                )), 0, 0, true, false);
        
        // Player B = 2 cards (count = 2) (Lower than A!)
        Player pB = new Player("B", "Bob", false, null, 
                new ArrayList<>(List.of(
                        new Card(Suit.DIAMONDS, Rank.FOUR, false),
                        new Card(Suit.SPADES, Rank.THREE, false)
                )), 0, 0, true, false);

        // Player C = 4 cards (count = 4)
        Player pC = new Player("C", "Charlie", false, null, 
                new ArrayList<>(List.of(
                        new Card(Suit.CLUBS, Rank.TEN, false), 
                        new Card(Suit.SPADES, Rank.FIVE, false),
                        new Card(Suit.HEARTS, Rank.NINE, false),
                        new Card(Suit.DIAMONDS, Rank.JACK, false)
                )), 0, 0, true, false);

        game.setPlayers(List.of(pA, pB, pC));

        // Player A declares Tick (Wrong Tick since Bob has 2 < A's 3)
        Round round = new Round();
        round.setRoundNumber(1);
        round.setTickPlayerId("A");
        round.setEndCondition("TICK");
        round.setRoundEnded(true);

        scoreEngine.calculateRoundScores(game, round);

        // Check scores: A (Alice) gets 80 penalty points. B (Bob) who was lowest gets 0. C (Charlie) gets 35 (10+5+9+11).
        assertEquals(80, pA.getRoundScore());
        assertEquals(80, pA.getTotalScore());

        assertEquals(0, pB.getRoundScore());
        assertEquals(0, pB.getTotalScore());

        assertEquals(35, pC.getRoundScore());
        assertEquals(35, pC.getTotalScore());
    }

    @Test
    public void testDeckExhaustedScoring() {
        Game game = new Game();
        game.setGameId("TEST3");

        Player pA = new Player("A", "Alice", false, null, 
                new ArrayList<>(List.of(
                        new Card(Suit.HEARTS, Rank.EIGHT, false),
                        new Card(Suit.CLUBS, Rank.ACE, false),
                        new Card(Suit.DIAMONDS, Rank.TWO, false)
                )), 0, 0, true, false);
        
        Player pB = new Player("B", "Bob", false, null, 
                new ArrayList<>(List.of(new Card(Suit.DIAMONDS, Rank.THREE, false))), 0, 0, true, false);

        Player pC = new Player("C", "Charlie", false, null, 
                new ArrayList<>(List.of(
                        new Card(Suit.CLUBS, Rank.FIVE, false),
                        new Card(Suit.SPADES, Rank.SIX, false)
                )), 0, 0, true, false);

        game.setPlayers(List.of(pA, pB, pC));

        // Round ends due to deck exhaustion
        Round round = new Round();
        round.setRoundNumber(1);
        round.setTickPlayerId(null);
        round.setEndCondition("DECK_EXHAUSTED");
        round.setRoundEnded(true);

        scoreEngine.calculateRoundScores(game, round);

        // Bob has lowest, gets 0. Alice gets 11 (8+1+2). Charlie gets 11 (5+6).
        assertEquals(11, pA.getRoundScore());
        assertEquals(0, pB.getRoundScore());
        assertEquals(11, pC.getRoundScore());
    }

    @Test
    public void testAiLogicAndSimulation() {
        Game game = gameEngine.createGame("SIM1", 5); // 5 rounds simulation
        
        gameEngine.addPlayer("SIM1", "AI_E", "EasyBot", true, AiLevel.EASY);
        gameEngine.addPlayer("SIM1", "AI_M", "MediumBot", true, AiLevel.MEDIUM);
        gameEngine.addPlayer("SIM1", "AI_H", "HardBot", true, AiLevel.HARD);

        assertEquals(3, game.getPlayers().size());

        // Perform a mock round setup
        gameEngine.startNewGame("SIM1");
        Round round = game.getCurrentRound();
        
        assertNotNull(round);
        assertEquals(1, round.getRoundNumber());
        assertEquals(5, game.getPlayers().get(0).getHand().size());
        assertEquals(5, game.getPlayers().get(1).getHand().size());
        assertEquals(5, game.getPlayers().get(2).getHand().size());

        // Verify Joker settings are applied correctly
        assertNotNull(round.getJokerCard());
        assertNotNull(round.getJokerRank());
        
        // Assert that at least some cards in the draw pile or player hands are marked as Joker
        // (with 3 bots * 5 cards = 15 cards + 36 remaining cards, there are 4 Jokers of the selected rank)
        int totalJokersCount = 0;
        for (Player p : game.getPlayers()) {
            for (Card c : p.getHand()) {
                if (c.isJoker()) totalJokersCount++;
            }
        }
        for (Card c : round.getDrawPile()) {
            if (c.isJoker()) totalJokersCount++;
        }
        for (Card c : round.getDiscardPile()) {
            if (c.isJoker()) totalJokersCount++;
        }
        // Calculate expected jokers count dynamically based on cards of the joker rank in play plus remaining printed Jokers (1 if revealed card is a printed Joker, 2 otherwise)
        int targetRankCount = 0;
        for (Player p : game.getPlayers()) {
            for (Card c : p.getHand()) {
                if (c.getRank() == round.getJokerRank()) targetRankCount++;
            }
        }
        for (Card c : round.getDrawPile()) {
            if (c.getRank() == round.getJokerRank()) targetRankCount++;
        }
        for (Card c : round.getDiscardPile()) {
            if (c.getRank() == round.getJokerRank()) targetRankCount++;
        }
        int expectedJokers = targetRankCount + (round.getJokerCard().isJoker() ? 1 : 2);
        assertEquals(expectedJokers, totalJokersCount);
    }

    @Test
    public void testDiscardFirstAndMatchComboFlow() {
        Game game = gameEngine.createGame("MATCH_FLOW", 5);
        Player p1 = gameEngine.addPlayer("MATCH_FLOW", "P1", "Alice", false, null);
        Player p2 = gameEngine.addPlayer("MATCH_FLOW", "P2", "Bob", false, null);
        
        gameEngine.startNewGame("MATCH_FLOW");
        Round round = game.getCurrentRound();
        
        // Set up hand and discard pile manually for precise verification
        p1.setHand(new ArrayList<>(List.of(
                new Card(Suit.HEARTS, Rank.TWO, false),
                new Card(Suit.DIAMONDS, Rank.FIVE, false)
        )));
        p2.setHand(new ArrayList<>(List.of(
                new Card(Suit.CLUBS, Rank.FIVE, false),
                new Card(Suit.SPADES, Rank.EIGHT, false)
        )));
        
        // Put a TWO on discard pile
        round.setDiscardPile(new ArrayList<>(List.of(new Card(Suit.CLUBS, Rank.TWO, false))));
        round.setCurrentPlayerIndex(0); // Alice's turn
        round.setHasDiscardedThisTurn(false);
        round.setNeedsToDraw(false);
        
        // Alice discards a TWO (matches top discard!)
        gameEngine.discardCard("MATCH_FLOW", "P1", new Card(Suit.HEARTS, Rank.TWO, false));
        
        assertTrue(round.isHasDiscardedThisTurn());
        assertFalse(round.isNeedsToDraw()); // Because it matched!
        assertEquals(1, p1.getHand().size()); // 2 -> 1 card left
        
        // Alice can end turn directly
        gameEngine.endTurn("MATCH_FLOW", "P1");
        assertEquals(1, round.getCurrentPlayerIndex()); // turn passed to Bob
        assertFalse(round.isHasDiscardedThisTurn());
        assertFalse(round.isNeedsToDraw());
        
        // Bob's turn: top discard is now a TWO. Bob discards a FIVE (no match).
        gameEngine.discardCard("MATCH_FLOW", "P2", new Card(Suit.CLUBS, Rank.FIVE, false));
        assertTrue(round.isHasDiscardedThisTurn());
        assertTrue(round.isNeedsToDraw()); // Needs to draw because rank FIVE doesn't match top discard TWO
        
        // Bob attempts to end turn without drawing -> should fail
        assertThrows(IllegalStateException.class, () -> gameEngine.endTurn("MATCH_FLOW", "P2"));
        
        // Bob draws a card
        int initialDrawPileSize = round.getDrawPile().size();
        Card drawn = gameEngine.drawCard("MATCH_FLOW", "P2", false);
        assertNotNull(drawn);
        assertFalse(round.isNeedsToDraw());
        assertEquals(2, p2.getHand().size()); // Discarded 1 (2->1), Drew 1 (1->2)
        assertEquals(initialDrawPileSize - 1, round.getDrawPile().size());
        
        // Bob can now end turn
        gameEngine.endTurn("MATCH_FLOW", "P2");
        assertEquals(0, round.getCurrentPlayerIndex()); // Back to Alice
    }

    @Test
    public void testAiDiscardMatchingStrategy() {
        Player ai = new Player("AI", "Bot", true, AiLevel.MEDIUM, 
                new ArrayList<>(List.of(
                        new Card(Suit.HEARTS, Rank.THREE, false),
                        new Card(Suit.DIAMONDS, Rank.SEVEN, false),
                        new Card(Suit.CLUBS, Rank.TEN, false)
                )), 0, 0, true, false);
        
        Round round = new Round();
        // Top of discard pile is a THREE
        round.setDiscardPile(new ArrayList<>(List.of(new Card(Suit.SPADES, Rank.THREE, false))));
        
        // AI should choose to discard the matching THREE instead of the highest card (TEN)
        Card choice = aiEngine.chooseCardToDiscard(ai, round);
        assertNotNull(choice);
        assertEquals(Rank.THREE, choice.getRank());
        
        // If there's no matching card, AI should choose the highest card (TEN)
        round.setDiscardPile(new ArrayList<>(List.of(new Card(Suit.SPADES, Rank.FIVE, false))));
        Card choice2 = aiEngine.chooseCardToDiscard(ai, round);
        assertNotNull(choice2);
        assertEquals(Rank.TEN, choice2.getRank());
    }

    @Test
    public void testNewTickRulesFlow() {
        Game game = gameEngine.createGame("TICK_FLOW", 5);
        Player p1 = gameEngine.addPlayer("TICK_FLOW", "P1", "Alice", false, null);
        Player p2 = gameEngine.addPlayer("TICK_FLOW", "P2", "Bob", false, null);

        gameEngine.startNewGame("TICK_FLOW");
        Round round = game.getCurrentRound();

        p1.setHand(new ArrayList<>(List.of(
                new Card(Suit.HEARTS, Rank.ACE, false), // 1 pt
                new Card(Suit.DIAMONDS, Rank.THREE, false) // 3 pts
        )));
        p2.setHand(new ArrayList<>(List.of(
                new Card(Suit.CLUBS, Rank.FIVE, false), // 5 pts
                new Card(Suit.SPADES, Rank.EIGHT, false) // 8 pts
        )));

        round.setCurrentPlayerIndex(0); // Alice's turn
        round.setHasDiscardedThisTurn(false);
        round.setNeedsToDraw(false);

        // Alice decides to Tick
        gameEngine.declareTick("TICK_FLOW", "P1");

        // Verify round ended
        assertTrue(round.isRoundEnded());
        assertEquals("TICK", round.getEndCondition());
        assertEquals("P1", round.getTickPlayerId());
        assertTrue(p1.isDeclaredTick());

        // Alice's cards are ACE (val 1) + THREE (val 3) = 4 pts. Bob's cards are FIVE + EIGHT (val 13).
        // Alice has lower value, so Tick is correct! Alice score = 0, Bob score = 13.
        assertEquals(0, p1.getRoundScore());
        assertEquals(13, p2.getRoundScore());
    }

    @Test
    public void testTickAfterDiscardThrows() {
        Game game = gameEngine.createGame("TICK_FAIL", 5);
        Player p1 = gameEngine.addPlayer("TICK_FAIL", "P1", "Alice", false, null);
        Player p2 = gameEngine.addPlayer("TICK_FAIL", "P2", "Bob", false, null);

        gameEngine.startNewGame("TICK_FAIL");
        Round round = game.getCurrentRound();

        p1.setHand(new ArrayList<>(List.of(
                new Card(Suit.HEARTS, Rank.ACE, false),
                new Card(Suit.DIAMONDS, Rank.THREE, false)
        )));
        
        round.setDiscardPile(new ArrayList<>(List.of(new Card(Suit.CLUBS, Rank.FIVE, false))));
        round.setCurrentPlayerIndex(0); // Alice's turn
        round.setHasDiscardedThisTurn(false);
        round.setNeedsToDraw(false);

        // Alice discards a THREE normally
        gameEngine.discardCard("TICK_FAIL", "P1", new Card(Suit.DIAMONDS, Rank.THREE, false));

        // Attempting to declare tick now (post-discard) should fail
        assertThrows(IllegalStateException.class, () -> 
            gameEngine.declareTick("TICK_FAIL", "P1")
        );
    }

    @Test
    public void testTimeoutDiscardFlow() throws Exception {
        // Create a game
        String gameId = "TIMEOUT_TEST";
        Game game = gameEngine.createGame(gameId, 5);
        Player p1 = gameEngine.addPlayer(gameId, "P1", "Alice", false, null);
        Player p2 = gameEngine.addPlayer(gameId, "P2", "Bob", false, null);
        
        gameEngine.startNewGame(gameId);
        Round round = game.getCurrentRound();
        
        // Manually set hand and discard pile to guarantee non-matching ranks
        p1.setHand(new ArrayList<>(List.of(
                new Card(Suit.HEARTS, Rank.TEN, false),
                new Card(Suit.DIAMONDS, Rank.THREE, false)
        )));
        round.setDiscardPile(new ArrayList<>(List.of(new Card(Suit.CLUBS, Rank.TWO, false))));
        
        round.setCurrentPlayerIndex(0); // Alice's turn
        round.setHasDiscardedThisTurn(false);
        round.setNeedsToDraw(false);
        
        // Assert Alice has cards
        int initialHandSize = p1.getHand().size();
        
        // Invoke private handleTimeout(gameId, playerId, phase) using reflection
        Method handleTimeoutMethod = GameWebSocketController.class.getDeclaredMethod(
                "handleTimeout", String.class, String.class, String.class);
        handleTimeoutMethod.setAccessible(true);
        
        // Call handleTimeout for DISCARD phase
        handleTimeoutMethod.invoke(gameWebSocketController, gameId, "P1", "DISCARD");
        
        // Assert card was discarded
        assertTrue(round.isHasDiscardedThisTurn());
        assertEquals(initialHandSize - 1, p1.getHand().size());
        assertTrue(round.isNeedsToDraw()); // since rank shouldn't match
    }

    @Test
    public void testOriginalJokerRevealedAsJokerCard() {
        boolean hitJoker = false;
        // Run game setups until a printed Joker is selected as the joker card
        for (int i = 0; i < 500; i++) {
            Game game = gameEngine.createGame("JOKER_TEST_" + i, 1);
            gameEngine.addPlayer("JOKER_TEST_" + i, "P1", "Alice", false, null);
            gameEngine.addPlayer("JOKER_TEST_" + i, "P2", "Bob", false, null);
            gameEngine.startNewGame("JOKER_TEST_" + i);
            
            Round round = game.getCurrentRound();
            Card jokerCard = round.getJokerCard();
            if (jokerCard.getSuit() == null && jokerCard.getRank() == null && jokerCard.isJoker()) {
                // We successfully drew a printed Joker!
                assertEquals(Rank.ACE, round.getJokerRank());
                // Verify that Aces are marked as Jokers
                int acesCount = 0;
                int acesJokerCount = 0;
                for (Card c : round.getDrawPile()) {
                    if (c.getRank() == Rank.ACE) {
                        acesCount++;
                        if (c.isJoker()) acesJokerCount++;
                    }
                }
                for (Player p : game.getPlayers()) {
                    for (Card c : p.getHand()) {
                        if (c.getRank() == Rank.ACE) {
                            acesCount++;
                            if (c.isJoker()) acesJokerCount++;
                        }
                    }
                }
                // Verify all Aces in play are marked as Jokers
                assertTrue(acesCount > 0);
                assertEquals(acesCount, acesJokerCount);
                hitJoker = true;
                break;
            }
        }
        assertTrue(hitJoker, "Should have encountered a printed Joker as the revealed card");
    }
}
