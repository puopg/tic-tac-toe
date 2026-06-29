import LocalGame from "@/common/components/LocalGame";
import { getGameConfig } from "@/lib/gameConfig";
import type { LocalMode } from "@/lib/localGameEngine";
import styles from "@/app/page.module.scss";

/** Default header name when the lobby didn't pass one. */
const DEFAULT_NAME: Record<LocalMode, string> = {
  local: "Local game",
  ai: "vs AI",
};

type Props = {
  mode: LocalMode;
  /** Optional header name from the lobby; falls back to a per-mode default. */
  name?: string;
};

/**
 * Shared body for the single-device game pages. Holds no server state - it just
 * reads the active game config (board size, win run, shift variant) so the
 * client game starts with the same rules a new online room would, then hands off
 * to the fully client-side {@link LocalGame}. Each mode has its own route
 * (app/play/local, app/play/ai) that renders this with its mode fixed.
 */
const PlayScene = async ({ mode, name }: Props) => {
  const { boardSize, winLength, shiftMode } = await getGameConfig();

  return (
    <main className={styles.roomMain}>
      <LocalGame
        mode={mode}
        config={{ size: boardSize, winLength, shiftMode }}
        name={name?.trim() || DEFAULT_NAME[mode]}
      />
    </main>
  );
};

export default PlayScene;
