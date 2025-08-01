// Game state variables
let targetNumber = "";
let attemptsLeft = 5;
let maxAttempts = 5;
let digitCount = 3;
let gameOver = false;
let guessHistory = [];

// Multiplayer variables
let gameMode = "single";
let playerCount = 2;
let players = [];
let currentSetupPlayer = 0;
let currentGuesser = 0;
let gamePhase = "setup"; // setup, guessing, finished
let activePlayers = [];

// Initialize the game when page loads
document.addEventListener("DOMContentLoaded", function () {
  updateSettings();
  startNewGame();

  // Allow Enter key to submit guess
  document
    .getElementById("guess-input")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        makeGuess();
      }
    });

  // Allow Enter key to save player setup (when in number input field)
  document
    .getElementById("player-number-input")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        savePlayerSetup();
      }
    });

  // Allow Enter key to submit multiplayer guess
  document
    .getElementById("multi-guess-input")
    .addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        makeMultiPlayerGuess();
      }
    });

  // Close modal when clicking outside of it
  window.addEventListener("click", function (event) {
    const modal = document.getElementById("settings-modal");
    if (event.target === modal) {
      closeSettingsModal();
    }
  });
});

// Generate a random number based on digit count
function generateRandomNumber() {
  const max = Math.pow(10, digitCount) - 1; // e.g., 99 for 2 digits, 999 for 3 digits
  const randomNum = Math.floor(Math.random() * (max + 1)); // 0 to max inclusive
  return randomNum.toString().padStart(digitCount, "0"); // Pad with leading zeros
}

// Open settings modal
function openSettingsModal() {
  document.getElementById("settings-modal").style.display = "block";
}

// Close settings modal
function closeSettingsModal() {
  document.getElementById("settings-modal").style.display = "none";
}

// Update game mode
function updateGameMode() {
  gameMode = document.getElementById("game-mode").value;
  const playerCountRow = document.getElementById("player-count-row");
  const maxAttemptsRow = document.getElementById("max-attempts-row");

  if (gameMode === "multi") {
    playerCountRow.style.display = "flex";
    maxAttemptsRow.style.display = "none"; // Hide max attempts for multiplayer
  } else {
    playerCountRow.style.display = "none";
    maxAttemptsRow.style.display = "flex";
  }

  updateSettings();
}

// Update settings from UI
function updateSettings() {
  digitCount = parseInt(document.getElementById("digit-count").value);

  if (gameMode === "single") {
    maxAttempts = parseInt(document.getElementById("max-attempts").value);
  } else {
    playerCount = parseInt(document.getElementById("player-count").value);
  }

  // Update UI text
  document.getElementById("digit-display").textContent = digitCount;

  // Update input constraints
  const singleInput = document.getElementById("guess-input");
  const playerInput = document.getElementById("player-number-input");
  const multiInput = document.getElementById("multi-guess-input");
  const nameInput = document.getElementById("player-name-input");

  if (singleInput) {
    singleInput.placeholder = `Enter ${digitCount}-digit number`;
    singleInput.maxLength = digitCount;
  }

  if (playerInput) {
    playerInput.placeholder = `Enter your ${digitCount}-digit secret number`;
    playerInput.maxLength = digitCount;
  }

  if (multiInput) {
    multiInput.placeholder = `Enter ${digitCount}-digit guess`;
    multiInput.maxLength = digitCount;
  }

  if (nameInput) {
    nameInput.placeholder = "Enter player name";
    nameInput.maxLength = 20;
  }

  // Start new game with new settings
  startNewGame();
}

// Start a new game
function startNewGame() {
  if (gameMode === "single") {
    startSinglePlayerGame();
  } else {
    startMultiPlayerGame();
  }
}

// Start single player game
function startSinglePlayerGame() {
  targetNumber = generateRandomNumber();
  attemptsLeft = maxAttempts;
  gameOver = false;
  guessHistory = [];

  // Show single player area, hide multiplayer area
  document.getElementById("single-player-area").style.display = "block";
  document.getElementById("multi-player-area").style.display = "none";

  // Reset UI elements
  document.getElementById("attempts-left").textContent = attemptsLeft;
  document.getElementById("guess-input").value = "";
  document.getElementById("guess-input").disabled = false;
  document.getElementById("submit-guess").disabled = false;
  document.getElementById("current-guess").textContent = "";
  document.getElementById("feedback").textContent = "";
  document.getElementById("feedback").className = "";
  document.getElementById("guess-history").innerHTML = "";

  // Remove any win/lose messages
  const existingMessages = document.querySelectorAll(
    ".win-message, .lose-message"
  );
  existingMessages.forEach((msg) => msg.remove());

  console.log("New single player game started. Target number:", targetNumber);
}

// Start multiplayer game
function startMultiPlayerGame() {
  // Initialize multiplayer variables
  players = [];
  currentSetupPlayer = 0;
  currentGuesser = 0;
  gamePhase = "setup";
  activePlayers = [];

  // Initialize players with default names
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: i,
      name: `Player ${i + 1}`,
      number: "",
      guesses: [],
      eliminated: false,
    });
    activePlayers.push(i);
  }

  // Show multiplayer area, hide single player area
  const singlePlayerArea = document.getElementById("single-player-area");
  const multiPlayerArea = document.getElementById("multi-player-area");
  const playerSetupPhase = document.getElementById("player-setup-phase");
  const guessingPhase = document.getElementById("guessing-phase");
  const gameResults = document.getElementById("game-results");

  if (singlePlayerArea) singlePlayerArea.style.display = "none";
  if (multiPlayerArea) multiPlayerArea.style.display = "block";
  if (playerSetupPhase) playerSetupPhase.style.display = "block";
  if (guessingPhase) guessingPhase.style.display = "none";
  if (gameResults) gameResults.style.display = "none";

  // Update current setup player display
  updateCurrentSetupPlayer();

  console.log("New multiplayer game started with", playerCount, "players");
}

// Update current setup player display
function updateCurrentSetupPlayer() {
  if (currentSetupPlayer < playerCount) {
    const currentSetupPlayerElement = document.getElementById(
      "current-setup-player"
    );
    const nameInput = document.getElementById("player-name-input");
    const numberInput = document.getElementById("player-number-input");

    if (currentSetupPlayerElement) {
      currentSetupPlayerElement.textContent = players[currentSetupPlayer].name;
    }
    if (nameInput) {
      nameInput.value = players[currentSetupPlayer].name;
      nameInput.focus();
      nameInput.select();
    }
    if (numberInput) {
      numberInput.value = "";
    }
  }
}

// Save player setup (name and number)
function savePlayerSetup() {
  console.log(
    `Saving setup for player ${currentSetupPlayer + 1} of ${playerCount}`
  );

  const nameInput = document.getElementById("player-name-input");
  const numberInput = document.getElementById("player-number-input");

  let name = nameInput.value.trim();
  let number = numberInput.value.trim();

  // Check if name is empty, use default name
  if (!name) {
    name = `Player ${currentSetupPlayer + 1}`;
  }

  // Check if number is empty
  if (!number) {
    alert("Please enter a secret number.");
    numberInput.focus();
    return;
  }

  // Pad with leading zeros if needed
  if (number.length < digitCount && !isNaN(number) && number.length > 0) {
    number = number.padStart(digitCount, "0");
  }

  // Validate the number
  const validation = validateGuess(number);
  if (!validation.valid) {
    alert(validation.message);
    numberInput.focus();
    return;
  }

  // Save the name and number
  players[currentSetupPlayer].name = name;
  players[currentSetupPlayer].number = number;
  console.log(
    `Player ${currentSetupPlayer + 1} setup complete: ${name} - ${number}`
  );
  currentSetupPlayer++;

  // Check if all players have completed setup
  console.log(
    `Current setup player: ${currentSetupPlayer}, Player count: ${playerCount}`
  );
  if (currentSetupPlayer >= playerCount) {
    console.log("All players setup complete, starting guessing phase");
    startGuessingPhase();
  } else {
    console.log("Moving to next player setup");
    updateCurrentSetupPlayer();
  }
}

// Start guessing phase
function startGuessingPhase() {
  gamePhase = "guessing";

  // Hide setup phase, show guessing phase
  const setupPhase = document.getElementById("player-setup-phase");
  const guessingPhase = document.getElementById("guessing-phase");

  if (setupPhase) setupPhase.style.display = "none";
  if (guessingPhase) guessingPhase.style.display = "block";

  // Create player columns
  createPlayerColumns();

  // Setup target player dropdown
  setupTargetPlayerDropdown();

  // Update current guesser
  updateCurrentGuesser();
}

// Create player columns for the game board
function createPlayerColumns() {
  const container = document.getElementById("player-columns");
  container.innerHTML = "";

  players.forEach((player, index) => {
    const column = document.createElement("div");
    column.className = "player-column";
    column.id = `player-column-${index}`;

    const header = document.createElement("div");
    header.className = "player-header";
    header.textContent = player.name;

    const guessesContainer = document.createElement("div");
    guessesContainer.className = "player-guesses";
    guessesContainer.id = `player-guesses-${index}`;

    column.appendChild(header);
    column.appendChild(guessesContainer);
    container.appendChild(column);
  });
}

// Setup target player dropdown
function setupTargetPlayerDropdown() {
  const dropdown = document.getElementById("target-player");
  dropdown.innerHTML = "";

  activePlayers.forEach((playerIndex) => {
    if (playerIndex !== currentGuesser) {
      const option = document.createElement("option");
      option.value = playerIndex;
      option.textContent = players[playerIndex].name;
      dropdown.appendChild(option);
    }
  });
}

// Update current guesser display
function updateCurrentGuesser() {
  if (activePlayers.length <= 1) {
    endGame();
    return;
  }

  // Find next active player
  while (players[currentGuesser].eliminated) {
    currentGuesser = (currentGuesser + 1) % playerCount;
  }

  document.getElementById("current-guesser").textContent =
    players[currentGuesser].name;

  // Update player column headers
  players.forEach((player, index) => {
    const header = document.querySelector(
      `#player-column-${index} .player-header`
    );
    header.className = "player-header";

    if (index === currentGuesser && !player.eliminated) {
      header.classList.add("active");
    } else if (player.eliminated) {
      header.classList.add("eliminated");
    }
  });

  // Update target dropdown
  setupTargetPlayerDropdown();

  // Clear and focus input
  document.getElementById("multi-guess-input").value = "";
  document.getElementById("multi-guess-input").focus();
}

// Make multiplayer guess
function makeMultiPlayerGuess() {
  if (gamePhase !== "guessing") return;

  const guessInput = document.getElementById("multi-guess-input");
  const targetSelect = document.getElementById("target-player");

  let guess = guessInput.value.trim();
  const targetPlayerIndex = parseInt(targetSelect.value);

  // Pad with leading zeros if needed
  if (guess.length < digitCount && !isNaN(guess)) {
    guess = guess.padStart(digitCount, "0");
  }

  // Validate the guess
  const validation = validateGuess(guess);
  if (!validation.valid) {
    alert(validation.message);
    return;
  }

  // Check if guess is correct and calculate feedback
  const targetPlayer = players[targetPlayerIndex];
  const isCorrect = guess === targetPlayer.number;
  const feedback = calculateFeedback(guess, targetPlayer.number);

  // Add guess to history
  const guessEntry = {
    guesser: currentGuesser,
    target: targetPlayerIndex,
    guess: guess,
    correct: isCorrect,
    correctDigits: feedback.correctDigits,
    correctPositions: feedback.correctPositions,
  };

  // Add to target player's guess history
  targetPlayer.guesses.push(guessEntry);

  // Update display
  updatePlayerGuessDisplay(targetPlayerIndex, guessEntry);

  if (isCorrect) {
    // Target player is eliminated
    targetPlayer.eliminated = true;
    activePlayers = activePlayers.filter((p) => p !== targetPlayerIndex);

    // Update column appearance
    const column = document.getElementById(
      `player-column-${targetPlayerIndex}`
    );
    column.classList.add("eliminated");

    const header = column.querySelector(".player-header");
    header.classList.add("eliminated");

    // Check if game is over
    if (activePlayers.length === 1) {
      endGame();
      return;
    }
  }

  // Move to next player
  do {
    currentGuesser = (currentGuesser + 1) % playerCount;
  } while (players[currentGuesser].eliminated);

  updateCurrentGuesser();
}

// Update player guess display
function updatePlayerGuessDisplay(playerIndex, guessEntry) {
  const container = document.getElementById(`player-guesses-${playerIndex}`);

  const entry = document.createElement("div");
  entry.className = `guess-entry-multi ${guessEntry.correct ? "correct" : ""}`;

  const guesserName = players[guessEntry.guesser].name;
  const guessText = guessEntry.guess;

  let resultText;
  if (guessEntry.correct) {
    resultText = "CORRECT!";
  } else {
    resultText = `D:${guessEntry.correctDigits}, P:${guessEntry.correctPositions}`;
  }

  entry.innerHTML = `
    <div style="display: flex; justify-content: space-between; width: 100%;">
      <span>${guesserName}: ${guessText}</span>
      <span>${resultText}</span>
    </div>
  `;

  container.appendChild(entry);
  container.scrollTop = container.scrollHeight;
}

// End multiplayer game
function endGame() {
  gamePhase = "finished";

  // Hide guessing phase, show results
  document.getElementById("guessing-phase").style.display = "none";
  document.getElementById("game-results").style.display = "block";

  // Determine winner
  const winner = players[activePlayers[0]];
  document.getElementById(
    "winner-announcement"
  ).textContent = `🎉 ${winner.name} wins! 🎉`;

  // Update winner column appearance
  const winnerColumn = document.getElementById(`player-column-${winner.id}`);
  winnerColumn.classList.add("winner");

  const winnerHeader = winnerColumn.querySelector(".player-header");
  winnerHeader.classList.add("winner");
}

// Validate the guess input
function validateGuess(guess) {
  // Check if it's a number
  if (isNaN(guess)) {
    return { valid: false, message: "Please enter a valid number." };
  }

  // Check if it's exactly the required number of digits
  if (guess.length !== digitCount) {
    return {
      valid: false,
      message: `Please enter exactly ${digitCount} digits.`,
    };
  }

  // Check if it's within range (0 to max with leading zeros allowed)
  const num = parseInt(guess);
  const max = Math.pow(10, digitCount) - 1;

  if (num < 0 || num > max) {
    const minDisplay = "0".repeat(digitCount);
    const maxDisplay = max.toString();
    return {
      valid: false,
      message: `Please enter a number between ${minDisplay} and ${maxDisplay}.`,
    };
  }

  return { valid: true };
}

// Calculate feedback for the guess
function calculateFeedback(guess, target) {
  const guessDigits = guess.split("");
  const targetDigits = target.split("");

  let correctPositions = 0;
  let correctDigits = 0;

  // Count correct positions (exact matches)
  for (let i = 0; i < digitCount; i++) {
    if (guessDigits[i] === targetDigits[i]) {
      correctPositions++;
    }
  }

  // Count correct digits (regardless of position)
  const targetDigitCount = {};
  const guessDigitCount = {};

  // Count occurrences of each digit in target and guess
  for (let i = 0; i < digitCount; i++) {
    targetDigitCount[targetDigits[i]] =
      (targetDigitCount[targetDigits[i]] || 0) + 1;
    guessDigitCount[guessDigits[i]] =
      (guessDigitCount[guessDigits[i]] || 0) + 1;
  }

  // Calculate correct digits by taking minimum count for each digit
  for (let digit in guessDigitCount) {
    if (targetDigitCount[digit]) {
      correctDigits += Math.min(
        guessDigitCount[digit],
        targetDigitCount[digit]
      );
    }
  }

  return {
    correctDigits: correctDigits,
    correctPositions: correctPositions,
  };
}

// Make a guess
function makeGuess() {
  if (gameOver) {
    return;
  }

  const guessInput = document.getElementById("guess-input");
  let guess = guessInput.value.trim();

  // Pad with leading zeros if needed
  if (guess.length < digitCount && !isNaN(guess)) {
    guess = guess.padStart(digitCount, "0");
  }

  // Validate the guess
  const validation = validateGuess(guess);
  if (!validation.valid) {
    showFeedback(validation.message, "incorrect");
    return;
  }

  // Calculate feedback
  const feedback = calculateFeedback(guess, targetNumber);

  // Add to history
  guessHistory.push({
    guess: guess,
    correctDigits: feedback.correctDigits,
    correctPositions: feedback.correctPositions,
  });

  // Update attempts
  attemptsLeft--;
  document.getElementById("attempts-left").textContent = attemptsLeft;

  // Display current guess
  document.getElementById("current-guess").textContent = `Your guess: ${guess}`;

  // Check if player won
  if (feedback.correctPositions === digitCount) {
    showWinMessage();
    endGame();
    return;
  }

  // Check if player lost (no attempts left)
  if (attemptsLeft === 0) {
    showLoseMessage();
    endGame();
    return;
  }

  // Show feedback
  const feedbackText = `Correct digits: ${feedback.correctDigits}, Correct positions: ${feedback.correctPositions}`;
  showFeedback(feedbackText, "incorrect");

  // Update history display
  updateHistoryDisplay();

  // Clear input for next guess
  guessInput.value = "";
  guessInput.focus();
}

// Show feedback message
function showFeedback(message, type) {
  const feedbackElement = document.getElementById("feedback");
  feedbackElement.textContent = message;
  feedbackElement.className =
    type === "correct" ? "feedback-correct" : "feedback-incorrect";
}

// Update the guess history display
function updateHistoryDisplay() {
  const historyContainer = document.getElementById("guess-history");
  historyContainer.innerHTML = "";

  guessHistory.forEach((entry, index) => {
    const entryDiv = document.createElement("div");
    entryDiv.className = "guess-entry";

    entryDiv.innerHTML = `
            <span class="guess-number">Guess ${index + 1}: ${entry.guess}</span>
            <span class="guess-result">Digits: ${
              entry.correctDigits
            }, Positions: ${entry.correctPositions}</span>
        `;

    historyContainer.appendChild(entryDiv);
  });
}

// Show win message
function showWinMessage() {
  const message = document.createElement("div");
  message.className = "win-message";
  const attemptsUsed = maxAttempts - attemptsLeft;
  message.innerHTML = `
        🎉 Congratulations! You guessed the number ${targetNumber} correctly!<br>
        You won with ${attemptsUsed} attempt${attemptsUsed === 1 ? "" : "s"}!
    `;

  document.querySelector(".feedback-section").appendChild(message);
  showFeedback("Perfect! All digits in correct positions!", "correct");
}

// Show lose message
function showLoseMessage() {
  const message = document.createElement("div");
  message.className = "lose-message";
  message.innerHTML = `
        😞 Game Over! You've used all your attempts.<br>
        The correct number was: <strong>${targetNumber}</strong>
    `;

  document.querySelector(".feedback-section").appendChild(message);
  showFeedback("Better luck next time!", "incorrect");
}

// End the game
function endGame() {
  gameOver = true;
  document.getElementById("guess-input").disabled = true;
  document.getElementById("submit-guess").disabled = true;
  updateHistoryDisplay();
}
