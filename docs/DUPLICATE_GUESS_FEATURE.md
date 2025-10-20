# Duplicate Guess Detection Feature

## Overview

The duplicate guess detection feature prevents users from wasting attempts by guessing the same number multiple times in a single game session.

## Implementation

### Location

- **Component**: [`src/lib/components/SinglePlayerGame.svelte`](../src/lib/components/SinglePlayerGame.svelte)
- **Lines**: 28-34

### Logic

```typescript
// Check for duplicate guess
const isDuplicate = $gameStore.guessHistory.some(
  (entry) => entry.guess === guess
);
if (isDuplicate) {
  feedbackMessage = `You've already guessed ${guess}. Try a different number!`;
  feedbackType = "incorrect";
  return;
}
```

### How It Works

1. **Before Processing**: After validation but before calculating feedback
2. **Check History**: Compares the current guess against all previous guesses
3. **Early Return**: If duplicate found, shows error message and returns without:
   - Decrementing attempts
   - Adding to guess history
   - Calculating feedback

## User Experience

### Error Message

When a duplicate guess is detected, the user sees:

```
You've already guessed [number]. Try a different number!
```

### Benefits

- **Saves Attempts**: Duplicate guesses don't count against the attempt limit
- **Clear Feedback**: User immediately knows they've already tried that number
- **Prevents Confusion**: Avoids duplicate entries in guess history

## Edge Cases Handled

### 1. Leading Zeros

Numbers are padded with leading zeros before duplicate checking:

- User enters: `12`
- Stored as: `012`
- Later entering `012` will be detected as duplicate

### 2. Multiple Duplicates

Users can attempt the same duplicate multiple times without penalty:

- First guess: `123` ✓
- Second guess: `123` ✗ (duplicate error)
- Third guess: `123` ✗ (duplicate error again)
- Fourth guess: `456` ✓ (different number accepted)

## Testing

### Unit Tests

Location: [`src/lib/components/SinglePlayerGame.test.ts`](../src/lib/components/SinglePlayerGame.test.ts)

Tests include:

1. **Basic Detection**: Detects and rejects duplicate guesses
2. **Padding Handling**: Detects duplicates after zero-padding
3. **Attempt Preservation**: Doesn't count duplicates against attempts
4. **History Integrity**: Doesn't add duplicates to history

### E2E Tests

Location: [`e2e/single-player.spec.ts`](../e2e/single-player.spec.ts)

Tests include:

1. **User Workflow**: Complete duplicate detection flow
2. **Attempt Counting**: Verifies attempts remain unchanged
3. **Zero Padding**: Tests duplicate detection with padded numbers
4. **Recovery**: Allows different guesses after duplicate error
5. **Multiple Guesses**: Tracks unique guesses correctly

## Examples

### Example 1: Basic Duplicate

```
Guess 1: 123 → Feedback: 2 correct digits, 1 correct position
Guess 2: 123 → Error: "You've already guessed 123. Try a different number!"
Attempts: Still 6 remaining (not decremented)
```

### Example 2: Padded Duplicate

```
Guess 1: 12  → Stored as 012, Feedback shown
Guess 2: 012 → Error: "You've already guessed 012. Try a different number!"
```

### Example 3: Multiple Unique Guesses

```
Guess 1: 123 → Valid
Guess 2: 456 → Valid
Guess 3: 789 → Valid
Guess 4: 123 → Duplicate error
Guess 5: 012 → Valid (different from previous guesses)
```

## Future Enhancements

Potential improvements:

1. **Visual Indicator**: Highlight previous guesses in history when duplicate detected
2. **Suggestion System**: Suggest numbers not yet tried
3. **Statistics**: Track how many duplicate attempts were made
4. **Multiplayer**: Extend duplicate detection to multiplayer mode

## Related Files

- Implementation: [`src/lib/components/SinglePlayerGame.svelte`](../src/lib/components/SinglePlayerGame.svelte)
- Unit Tests: [`src/lib/components/SinglePlayerGame.test.ts`](../src/lib/components/SinglePlayerGame.test.ts)
- E2E Tests: [`e2e/single-player.spec.ts`](../e2e/single-player.spec.ts)
- Game Store: [`src/lib/stores/gameStore.ts`](../src/lib/stores/gameStore.ts)

---

**Last Updated**: 2025-01-20
