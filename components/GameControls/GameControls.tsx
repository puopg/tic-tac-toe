import type { GameMode } from "@/components/Game/Game";
import styles from "./styles.module.scss";

interface GameControlsProps {
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  onNewGame: () => void;
  onResetScores: () => void;
}

export default function GameControls({
  mode,
  onModeChange,
  onNewGame,
  onResetScores,
}: GameControlsProps) {
  return (
    <div className={styles.controls}>
      <div
        className={styles.modeToggle}
        role="group"
        aria-label="Game mode"
      >
        <button
          type="button"
          className={mode === "two-player" ? styles.active : ""}
          onClick={() => onModeChange("two-player")}
          aria-pressed={mode === "two-player"}
        >
          2 Players
        </button>
        <button
          type="button"
          className={mode === "ai" ? styles.active : ""}
          onClick={() => onModeChange("ai")}
          aria-pressed={mode === "ai"}
        >
          vs AI
        </button>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={onNewGame}
        >
          New Game
        </button>
        <button type="button" className={styles.ghost} onClick={onResetScores}>
          Reset Scores
        </button>
      </div>
    </div>
  );
}
