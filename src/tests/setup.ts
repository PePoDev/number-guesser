import "@testing-library/jest-dom";
import { expect, afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/svelte";

// Game targets come from Math.random; pinning it makes every target
// predictable (500 for three digits), so no test depends on chance.
beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Add custom matchers if needed
expect.extend({
  // Custom matchers can be added here
});
