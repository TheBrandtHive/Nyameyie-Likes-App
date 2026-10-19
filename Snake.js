
const COLS = 20;
const ROWS = 20;
const START_LENGTH = 3;
const START_SPEED = 450;
const MIN_SPEED = 300;
const SPEED_GAIN = 12;
const BASE_POINTS = 10;
const LEVEL_BONUS = 5;
const FOODS_PER_LEVEL = 5;

// Get elements from HTML
const board = document.querySelector("#board");
const boardWrap = document.querySelector("#boardWrap");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayMsg = document.querySelector("#overlayMsg");
const overlayScore = document.querySelector("#overlayScore");

const startBtn = document.querySelector("#startBtn");
const pauseBtn = document.querySelector("#pauseBtn");
const restartBtn = document.querySelector("#restartBtn");
const toastEl = document.querySelector("#toast");
const floaters = document.querySelector("#floaters");

const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#best");
const levelEl = document.querySelector("#level");
const lengthEl = document.querySelector("#length");
const levelBar = document.querySelector("#levelBar");
const progressText = document.querySelector("#progressText");

// Game variables
let cells = [];
let snake = [];
let food = { x: 0, y: 0 };
let direction = { x: 1, y: 0 };
let score = 0;
let foodsEaten = 0;
let best = Number(localStorage.getItem("snakeBest")) || 0;
let status = "ready";
let timerId = null;
let toastTimer = null;
let touchStart = null;
let lastGameWasBest = false;

const inputQueue = [];

const directions = {
    ArrowUp: { x: 0, y: -1 },
    KeyW: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    KeyS: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    KeyA: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    KeyD: { x: 1, y: 0 }
};

// Calculate the current level
function getLevel() {
    return Math.floor(foodsEaten / FOODS_PER_LEVEL) + 1;
}

// Make the snake faster as the level increases
function getSpeed() {
    return Math.max(
        MIN_SPEED,
        START_SPEED - (getLevel() - 1) * SPEED_GAIN
    );
}

// Get the position of a square on the board
function getCellIndex(position) {
    return position.y * COLS + position.x;
}

// Create the game board
function buildBoard() {
    board.innerHTML = "";
    cells = [];

    for (let i = 0; i < COLS * ROWS; i++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        board.appendChild(cell);
        cells.push(cell);
    }
}

// Show the snake and food on the board
function render() {
    cells.forEach(cell => {
        cell.className = "cell";
    });

    snake.forEach((part, index) => {
        cells[getCellIndex(part)].classList.add(
            index === 0 ? "head" : "body"
        );
    });

    cells[getCellIndex(food)].classList.add("food");
}

// Update the score and level information
function updateHUD() {
    scoreEl.textContent = score;
    bestEl.textContent = best;
    levelEl.textContent = getLevel();
    lengthEl.textContent = snake.length;

    const progress = foodsEaten % FOODS_PER_LEVEL;

    levelBar.style.width =
        (progress / FOODS_PER_LEVEL) * 100 + "%";

    progressText.textContent =
        `${progress} / ${FOODS_PER_LEVEL}`;

    pauseBtn.textContent =
        status === "paused" ? "Resume" : "Pause";
}

// Display a small message
function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toastEl.classList.remove("show");
    }, 1500);
}

// Add points when the snake eats food
function addScore() {
    const points = BASE_POINTS + (getLevel() - 1) * LEVEL_BONUS;

    score += points;

    if (score > best) {
        best = score;
        lastGameWasBest = true;

        localStorage.setItem("snakeBest", best);
        showToast("New Best Score!");
    }

    return points;
}

// Show points above the food
function showPoints(points, position) {
    const element = document.createElement("span");

    element.className = "float-point";
    element.textContent = `+${points}`;

    element.style.left =
        ((position.x + 0.5) / COLS) * 100 + "%";

    element.style.top =
        ((position.y + 0.5) / ROWS) * 100 + "%";

    floaters.appendChild(element);

    element.addEventListener("animationend", () => {
        element.remove();
    });
}

// Reset the game
function resetGame() {
    snake = [];

    const x = Math.floor(COLS / 2);
    const y = Math.floor(ROWS / 2);

    for (let i = 0; i < START_LENGTH; i++) {
        snake.push({ x: x - i, y: y });
    }

    direction = { x: 1, y: 0 };
    inputQueue.length = 0;
    score = 0;
    foodsEaten = 0;
    lastGameWasBest = false;

    spawnFood();
    render();
    updateHUD();
}

// Put food in an empty square
function spawnFood() {
    const emptyCells = [];

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const occupied = snake.some(part =>
                part.x === x && part.y === y
            );

            if (!occupied) {
                emptyCells.push({ x, y });
            }
        }
    }

    if (emptyCells.length === 0) {
        endGame("win");
        return;
    }

    const randomIndex = Math.floor(
        Math.random() * emptyCells.length
    );

    food = emptyCells[randomIndex];
}

// Start a new game
function startGame() {
    clearTimeout(timerId);

    resetGame();

    status = "running";
    overlay.classList.add("hidden");
    boardWrap.classList.remove("shake");

    updateHUD();

    timerId = setTimeout(tick, getSpeed());
}

// Move the snake
function tick() {
    if (status !== "running") return;

    if (inputQueue.length > 0) {
        direction = inputQueue.shift();
    }

    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    // Check if the snake hits a wall
    if (
        head.x < 0 ||
        head.x >= COLS ||
        head.y < 0 ||
        head.y >= ROWS
    ) {
        endGame("border");
        return;
    }

    const eating =
        head.x === food.x && head.y === food.y;

    // Check if the snake hits itself
    const body = eating ? snake : snake.slice(0, -1);

    const hitSelf = body.some(part =>
        part.x === head.x && part.y === head.y
    );

    if (hitSelf) {
        endGame("self");
        return;
    }

    // Add the new head
    snake.unshift(head);

    if (eating) {
        const oldFood = { ...food };

        foodsEaten++;

        const points = addScore();

        if (foodsEaten % FOODS_PER_LEVEL === 0) {
            showToast(`Level ${getLevel()}!`);
        }

        spawnFood();
        showPoints(points, oldFood);

        scoreEl.classList.remove("pop");
        void scoreEl.offsetWidth;
        scoreEl.classList.add("pop");
    } else {
        snake.pop();
    }

    render();
    updateHUD();

    if (status === "running") {
        timerId = setTimeout(tick, getSpeed());
    }
}

// End the game
function endGame(reason) {
    clearTimeout(timerId);

    status = "over";
    boardWrap.classList.add("shake");

    let title = "Game Over";
    let message = "Try again!";

    if (reason === "border") {
        message = "You hit the wall!";
    } else if (reason === "self") {
        message = "You hit your own body!";
    } else if (reason === "win") {
        title = "You Win!";
        message = "You filled the whole board!";
    }

    showOverlay(title, message, "Play Again");

    overlayScore.classList.remove("hidden");

    overlayScore.textContent =
        `Score: ${score} | Best: ${best}` +
        (lastGameWasBest && score > 0
            ? " | New High Score!"
            : "");

    updateHUD();
}

// Pause or continue the game
function togglePause() {
    if (status === "running") {
        status = "paused";
        clearTimeout(timerId);

        showOverlay(
            "Paused",
            "Press Resume to continue playing.",
            "Resume"
        );

        overlayScore.classList.add("hidden");
    } else if (status === "paused") {
        status = "running";
        overlay.classList.add("hidden");

        timerId = setTimeout(tick, getSpeed());
    }

    updateHUD();
}

// Show a message on the screen
function showOverlay(title, message, buttonText) {
    overlayTitle.textContent = title;
    overlayMsg.textContent = message;
    startBtn.textContent = buttonText;

    overlay.classList.remove("hidden");
}

// Change the snake's direction
function turn(newDirection) {
    if (status !== "running") return;

    const lastDirection = inputQueue.length
        ? inputQueue[inputQueue.length - 1]
        : direction;

    // Don't allow the snake to turn back on itself
    if (
        newDirection.x === -lastDirection.x &&
        newDirection.y === -lastDirection.y
    ) {
        return;
    }

    if (
        newDirection.x === lastDirection.x &&
        newDirection.y === lastDirection.y
    ) {
        return;
    }

    inputQueue.push(newDirection);
}

// Listen for keyboard presses
document.addEventListener("keydown", event => {
    const newDirection = directions[event.code];

    if (newDirection) {
        event.preventDefault();

        if (status === "ready" || status === "over") {
            startGame();
        }

        turn(newDirection);
        return;
    }

    if (event.code === "Space") {
        event.preventDefault();

        if (status === "ready" || status === "over") {
            startGame();
        } else {
            togglePause();
        }
    }

    if (event.code === "Enter") {
        if (status === "ready" || status === "over") {
            startGame();
        }
    }

    if (event.code === "KeyR") {
        startGame();
    }

    if (event.code === "KeyP") {
        togglePause();
    }
});

// Control the snake with the on-screen buttons
document.querySelectorAll("[data-dir]").forEach(button => {
    button.addEventListener("click", () => {
        const [x, y] = button.dataset.dir.split(",").map(Number);

        if (status === "ready" || status === "over") {
            startGame();
        }

        turn({ x, y });
    });
});

// Control the snake using swipes on mobile
boardWrap.addEventListener("touchstart", event => {
    touchStart = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
    };
}, { passive: true });

boardWrap.addEventListener("touchend", event => {
    if (!touchStart) return;

    const touch = event.changedTouches[0];

    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;

    touchStart = null;

    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

    let newDirection;

    if (Math.abs(dx) > Math.abs(dy)) {
        newDirection = { x: Math.sign(dx), y: 0 };
    } else {
        newDirection = { x: 0, y: Math.sign(dy) };
    }

    if (status === "ready" || status === "over") {
        startGame();
    }

    turn(newDirection);
}, { passive: true });

// Button events
startBtn.addEventListener("click", () => {
    startGame();
});

pauseBtn.addEventListener("click", () => {
    if (status === "ready" || status === "over") {
        startGame();
    } else {
        togglePause();
    }
});

restartBtn.addEventListener("click", () => {
    startGame();
});

// Set up the board when the page loads
buildBoard();
resetGame();

showOverlay(
    "Snake",
    "Use the arrow keys to move. Eat the food to grow and earn points. Avoid the walls and your own body!",
    "Start Game"
);
