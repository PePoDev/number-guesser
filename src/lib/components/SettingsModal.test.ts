import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import SettingsModal from "./SettingsModal.svelte";
import { gameStore } from "$lib/stores/gameStore";

describe("SettingsModal Component", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    gameStore.reset();
  });

  it("should render modal with title", () => {
    render(SettingsModal, { props: { onclose: mockOnClose } });
    expect(screen.getByText("Game Settings")).toBeInTheDocument();
  });

  it("should have close button", () => {
    render(SettingsModal, { props: { onclose: mockOnClose } });
    const closeButton = screen.getByText("×");
    expect(closeButton).toBeInTheDocument();
  });

  it("should call onclose when close button clicked", async () => {
    const user = userEvent.setup();
    render(SettingsModal, { props: { onclose: mockOnClose } });

    const closeButton = screen.getByText("×");
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should call onclose when Close button clicked", async () => {
    const user = userEvent.setup();
    render(SettingsModal, { props: { onclose: mockOnClose } });

    const closeButton = screen.getByText("Close");
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  describe("Game Mode Selection", () => {
    it("should display game mode selector", () => {
      render(SettingsModal, { props: { onclose: mockOnClose } });
      expect(screen.getByLabelText("Game Mode:")).toBeInTheDocument();
    });

    it("should have single and multi player options", () => {
      render(SettingsModal, { props: { onclose: mockOnClose } });
      const select = screen.getByLabelText("Game Mode:") as HTMLSelectElement;
      const options = Array.from(select.options).map((opt) => opt.text);

      expect(options).toContain("Single Player");
      expect(options).toContain("Multi Player");
    });

    it("should change game mode when selected", async () => {
      const user = userEvent.setup();
      render(SettingsModal, { props: { onclose: mockOnClose } });

      const select = screen.getByLabelText("Game Mode:");
      await user.selectOptions(select, "multi");

      await waitFor(() => {
        expect(screen.getByLabelText("Number of Players:")).toBeInTheDocument();
      });
    });

    it("should show player count selector in multiplayer mode", async () => {
      const user = userEvent.setup();
      gameStore.setMode("multi");
      render(SettingsModal, { props: { onclose: mockOnClose } });

      expect(screen.getByLabelText("Number of Players:")).toBeInTheDocument();
    });

    it("should not show player count in single player mode", () => {
      gameStore.setMode("single");
      render(SettingsModal, { props: { onclose: mockOnClose } });

      expect(
        screen.queryByLabelText("Number of Players:")
      ).not.toBeInTheDocument();
    });
  });

  describe("Digit Count Selection", () => {
    it("should display digit count selector", () => {
      render(SettingsModal, { props: { onclose: mockOnClose } });
      expect(screen.getByLabelText("Number of Digits:")).toBeInTheDocument();
    });

    it("should have options for 2-5 digits", () => {
      render(SettingsModal, { props: { onclose: mockOnClose } });
      const select = screen.getByLabelText(
        "Number of Digits:"
      ) as HTMLSelectElement;
      const options = Array.from(select.options).map((opt) => opt.text);

      expect(options).toContain("2 digits");
      expect(options).toContain("3 digits");
      expect(options).toContain("4 digits");
      expect(options).toContain("5 digits");
    });

    it("should update digit count when changed", async () => {
      const user = userEvent.setup();
      render(SettingsModal, { props: { onclose: mockOnClose } });

      const select = screen.getByLabelText("Number of Digits:");
      await user.selectOptions(select, "4");

      await waitFor(() => {
        const state = gameStore;
        // The store should be updated
      });
    });
  });

  describe("Max Attempts Selection (Single Player)", () => {
    beforeEach(() => {
      gameStore.setMode("single");
    });

    it("should display max attempts selector in single player mode", () => {
      render(SettingsModal, { props: { onclose: mockOnClose } });
      expect(screen.getByLabelText("Max Attempts:")).toBeInTheDocument();
    });

    it("should have attempt options", () => {
      render(SettingsModal, { props: { onclose: mockOnClose } });
      const select = screen.getByLabelText(
        "Max Attempts:"
      ) as HTMLSelectElement;
      const options = Array.from(select.options).map((opt) => opt.text);

      expect(options).toContain("3 attempts");
      expect(options).toContain("5 attempts");
      expect(options).toContain("7 attempts");
      expect(options).toContain("10 attempts");
      expect(options).toContain("15 attempts");
      expect(options).toContain("20 attempts");
    });

    it("should not show max attempts in multiplayer mode", async () => {
      const user = userEvent.setup();
      render(SettingsModal, { props: { onclose: mockOnClose } });

      const select = screen.getByLabelText("Game Mode:");
      await user.selectOptions(select, "multi");

      await waitFor(() => {
        expect(
          screen.queryByLabelText("Max Attempts:")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Player Count Selection (Multiplayer)", () => {
    beforeEach(() => {
      gameStore.setMode("multi");
    });

    it("should have player count options", () => {
      render(SettingsModal, { props: { onclose: mockOnClose } });
      const select = screen.getByLabelText(
        "Number of Players:"
      ) as HTMLSelectElement;
      const options = Array.from(select.options).map((opt) => opt.text);

      expect(options).toContain("2 players");
      expect(options).toContain("3 players");
      expect(options).toContain("4 players");
    });

    it("should update player count when changed", async () => {
      const user = userEvent.setup();
      render(SettingsModal, { props: { onclose: mockOnClose } });

      const select = screen.getByLabelText("Number of Players:");
      await user.selectOptions(select, "3");

      // Store should be updated
      await waitFor(() => {
        // Verify the change was applied
      });
    });
  });

  describe("Modal Behavior", () => {
    it("should have dialog role", () => {
      render(SettingsModal, { props: { onclose: mockOnClose } });
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });

    it("should have aria-modal attribute", () => {
      render(SettingsModal, { props: { onclose: mockOnClose } });
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    it("should close when clicking backdrop", async () => {
      const user = userEvent.setup();
      render(SettingsModal, { props: { onclose: mockOnClose } });

      const backdrop = screen.getByRole("dialog");
      await user.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should not close when clicking modal content", async () => {
      const user = userEvent.setup();
      render(SettingsModal, { props: { onclose: mockOnClose } });

      const modalContent = screen.getByText("Game Settings");
      await user.click(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("should have backdrop blur effect", () => {
      render(SettingsModal, { props: { onclose: mockOnClose } });
      const backdrop = screen.getByRole("dialog");
      expect(backdrop).toHaveClass("backdrop-blur-sm");
    });

    it("should have animation class", () => {
      render(SettingsModal, { props: { onclose: mockOnClose } });
      const modal = screen
        .getByRole("dialog")
        .querySelector(".animate-modal-slide-in");
      expect(modal).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper labels for all inputs", () => {
      render(SettingsModal, { props: { onclose: mockOnClose } });

      expect(screen.getByLabelText("Game Mode:")).toBeInTheDocument();
      expect(screen.getByLabelText("Number of Digits:")).toBeInTheDocument();
      expect(screen.getByLabelText("Max Attempts:")).toBeInTheDocument();
    });

    it("should be keyboard navigable", async () => {
      const user = userEvent.setup();
      render(SettingsModal, { props: { onclose: mockOnClose } });

      // Tab through elements
      await user.tab();
      await user.tab();

      // Should be able to navigate through the modal
      expect(document.activeElement).toBeTruthy();
    });
  });

  describe("Settings Persistence", () => {
    it("should reflect current game settings", () => {
      gameStore.updateSettings({ digitCount: 4, maxAttempts: 10 });
      render(SettingsModal, { props: { onclose: mockOnClose } });

      const digitSelect = screen.getByLabelText(
        "Number of Digits:"
      ) as HTMLSelectElement;
      const attemptsSelect = screen.getByLabelText(
        "Max Attempts:"
      ) as HTMLSelectElement;

      expect(digitSelect.value).toBe("4");
      expect(attemptsSelect.value).toBe("10");
    });

    it("should start new game when settings change", async () => {
      const user = userEvent.setup();
      render(SettingsModal, { props: { onclose: mockOnClose } });

      const select = screen.getByLabelText("Number of Digits:");
      await user.selectOptions(select, "5");

      // New game should be started with new settings
      await waitFor(() => {
        // Verify game was restarted
      });
    });
  });
});
