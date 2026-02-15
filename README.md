# Microservices Example Project

This project demonstrates a basic microservice architecture using Node.js, Express, MongoDB, and Docker Compose. It consists of 4 services that interact with each other to simulate a gaming timer and leaderboard system.

## Services

1.  **Timer Service (Port 3001):**
    -   Manages start/stop timers for users.
    -   Calculates duration and fetches the current "game date" from the Mock Date Service.
    -   Stores audit records in its own MongoDB instance (`audit-db`).
    -   Logs events to the Logger Service.

2.  **Leaderboard Service (Port 3002):**
    -   Generates daily leaderboards by aggregating data from the Timer Service.
    -   Stores rankings in its own MongoDB instance (`leaderboard-db`).
    -   Exposes endpoints to view the leaderboard and a summary (Top 5).

3.  **Mock Date Service (Port 3003):**
    -   A simple service that returns a fixed date (currently `2024-05-20`).
    -   Used by other services to determine the "current" date for game logic.

4.  **Logger Service (Port 3004):**
    -   Centralized logging service.
    -   Writes logs to `logs/all.log` in the root directory.

## Infrastructure

-   **Docker Compose:** Orchestrates all 4 services and 2 MongoDB databases.
-   **Swagger UI (Port 8080):** A centralized Swagger UI that aggregates API documentation from all services.
-   **Networking:** All services communicate via a dedicated Docker bridge network (`microservice-net`).

## Prerequisites

-   Docker and Docker Compose installed on your machine.
-   Node.js (optional, for local development outside Docker).

## How to Run

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/audacityrifatjahanazad/microservice-example.git
    cd microservice-example
    ```

2.  **Start the application:**
    ```bash
    docker-compose up -d --build
    ```

3.  **Access the Services:**
    -   **Central Swagger UI:** [http://localhost:8080](http://localhost:8080)
    -   **Timer Service:** [http://localhost:3001](http://localhost:3001)
    -   **Leaderboard Service:** [http://localhost:3002](http://localhost:3002)
    -   **Mock Date Service:** [http://localhost:3003](http://localhost:3003)
    -   **Logger Service:** [http://localhost:3004](http://localhost:3004)

4.  **Check Logs:**
    The logs are persisted to the local `logs/` directory:
    ```bash
    cat logs/all.log
    ```

## API Usage Examples

### 1. Start a Timer
```bash
curl -X POST -H "Content-Type: application/json" -d '{"username":"player1"}' http://localhost:3001/timer/start
```

### 2. Stop a Timer
```bash
# Replace <TIMER_ID> with the ID returned from the start command
curl -X POST -H "Content-Type: application/json" -d '{"timerId":"<TIMER_ID>"}' http://localhost:3001/timer/stop
```

### 3. Generate Leaderboard
```bash
curl -X POST http://localhost:3002/generate
```

### 4. Get Leaderboard Summary
```bash
curl http://localhost:3002/summary
```

## Directory Structure

```
.
├── docker-compose.yml
├── service-timer/        # Timer Service Code
├── service-leaderboard/  # Leaderboard Service Code
├── service-mock-date/    # Mock Date Service Code
├── service-logger/       # Logger Service Code
├── logs/                 # Shared log directory
└── README.md
```
