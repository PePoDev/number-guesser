// Game state variables
let targetNumber = "";
let attemptsLeft = 5;
let maxAttempts = 5;
let digitCount = 3;
let gameOver = false;
let guessHistory = [];

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

// Update settings from UI
function updateSettings() {
  digitCount = parseInt(document.getElementById("digit-count").value);
  maxAttempts = parseInt(document.getElementById("max-attempts").value);

  // Update UI text
  document.getElementById("digit-display").textContent = digitCount;

  // Update input placeholder and constraints
  const input = document.getElementById("guess-input");

  input.placeholder = `Enter ${digitCount}-digit number`;
  input.maxLength = digitCount;

  // Start new game with new settings
  startNewGame();
}

// Start a new game
function startNewGame() {
  targetNumber = generateRandomNumber();
  attemptsLeft = maxAttempts;
  gameOver = false;
  guessHistory = [];

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

  console.log("New game started. Target number:", targetNumber); // For debugging
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
