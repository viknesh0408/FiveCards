# 5 Card Tick Game

A premium 2D multiplayer card game based on the traditional Indian card game **5 Card Tick**, built using a **Spring Boot** backend, **WebSocket** real-time coordination, and a **React + Vite + Vanilla CSS** frontend.

---

## Game Objectives & Rules

Players try to maintain the **lowest cumulative score** across multiple rounds (default: 20).

### Card Values

- **Ace**: 1 point
- **Number Cards (2-10)**: Face value (e.g. 7 is 7 points)
- **Jack**: 11 points
- **Queen**: 12 points
- **King**: 13 points
- **Joker Cards**: 0 points

### The Joker Rule

At the start of each round, a card is revealed from the deck. All cards of the **next rank** in the cycle (A ➔ 2 ➔ ... ➔ K ➔ A) become Jokers for that round.

- _Example 1_: Revealed card is **7 of Hearts** ➔ All **8s** are Jokers.
- _Example 2_: Revealed card is **King of Clubs** ➔ All **Aces** are Jokers.

### Gameplay Loop

Each turn consists of:

1. **Draw**: Player must draw 1 card from either the **Draw Pile** (face down) or **Discard Pile** (face up).
2. **Discard**: Player now has 6 cards and must choose 1 card to discard.
3. **Optional Action**: Before their turn ends, the player may choose to declare **Tick**.
4. **Pass**: If Tick is not declared, the turn passes to the next player.

### Round End Conditions & Scoring

- **Condition 1: Tick Declaration**
  - If the declaring player has the **lowest hand value** (Correct Tick):
    - Declaring Player Score = **0 points**
    - Others = Receive points equal to their hand values.
  - If another player has an **equal or lower score** (Wrong Tick):
    - Declaring Player Score = **80 points** (penalty)
    - Actual Lowest Player = **0 points**
    - Others = Receive points equal to their hand values.
- **Condition 2: Deck Exhaustion**
  - If the draw pile runs out of cards, the round ends.
  - The player(s) holding the lowest hand value receive **0 points**.
  - All other players receive points equal to their actual hand values.

---

## Technical Stack

- **Frontend**: React 18, Vite, TypeScript, Vanilla CSS (Glassmorphism, custom dealing animations)
- **Backend**: Spring Boot 3.3.x, Java 21, Spring Data JPA, STOMP WebSockets
- **Database**: MySQL 8.x (with local H2 in-memory fallback for testing)
- **Deployment**: Docker Compose, Nginx (frontend proxy)

---

## Project Structure

```
├── backend/
│   ├── Dockerfile
│   ├── build.gradle
│   └── src/
│       ├── main/java/com/game/tickgame/
│       │   ├── config/          # WebSocket and CORS configurations
│       │   ├── controller/      # REST and STOMP handlers
│       │   ├── dto/             # Network message models
│       │   ├── entity/          # JPA database mappings
│       │   ├── model/           # Core game domain objects
│       │   └── service/         # Game, Score, and AI engines
│       └── test/                # JUnit integration tests
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
│       ├── components/          # Radial Table, Menus, Results, Leaderboard
│       ├── hooks/               # useWebSocket STOMP subscriber hook
│       ├── utils/               # Display format helpers
│       ├── App.tsx              # Router and coordinate controller
│       └── index.css            # CSS custom properties and animations
└── docker-compose.yml
```

---

## Getting Started

### Method 1: Local Development Run (Using H2 in-memory DB)

This runs the application without requiring a local MySQL instance:

1. **Start the Backend**:

   ```bash
   cd backend
   ./gradlew.bat bootRun
   ```

   The backend server runs on `http://localhost:8080`. The in-memory database console can be inspected at `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:tickgamedb`, user: `sa`, no password).

2. **Start the Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

### Method 2: Docker Compose (Using Production MySQL Profile)

To compile, package, and deploy all services (Nginx frontend, Spring Boot backend, and MySQL database) in a unified network:

1. Build and launch the containers:
   ```bash
   docker-compose up --build
   ```
2. Once initialization completes, open:
   `http://localhost` (port 80) to play.
