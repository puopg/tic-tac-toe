"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MAX_BOARD_SIZE,
  MIN_BOARD_SIZE,
  MIN_WIN_LENGTH,
} from "@/constants/game";
import {
  fetchGameConfig,
  setGameConfig,
  type GameConfig,
} from "@/utils/roomClient";
import {
  shiftBoard,
  type Board,
  type ShiftMode,
} from "@/utils/gameLogic";
import MiniBoard from "@/common/components/MiniBoard";
import Spinner from "@/common/components/Spinner";
import styles from "./page.module.scss";

const GAME_CONFIG_KEY = ["game-config"] as const;

/** The ticket's worked example: the board before O shifts it right. */
const EXAMPLE_BOARD: Board = [
  "X", "O", "O",
  "O", "X", "O",
  "O", "X", null,
];

const MODE_COPY: Record<ShiftMode, { title: string; blurb: string }> = {
  classic: {
    title: "Classic",
    blurb: "Slide the whole grid exactly one cell; marks pushed off the edge are lost.",
  },
  collapse: {
    title: "Collapse",
    blurb:
      "Each line collapses toward its edge; the leading run of matching marks is swept off and the first differing mark settles against the edge.",
  },
};

/** Inclusive integer range [min, max] as an array, for the segmented controls. */
const range = (min: number, max: number): number[] =>
  Array.from({ length: max - min + 1 }, (_, i) => min + i);

/** A labelled row of single-select segment buttons over a list of numbers. */
const Segmented = (props: {
  label: string;
  values: number[];
  selected: number;
  busy: boolean;
  onSelect: (value: number) => void;
}) => (
  <div className={styles.segmented} role="group" aria-label={props.label}>
    {props.values.map((n) => (
      <button
        key={n}
        type="button"
        className={styles.segment}
        aria-pressed={props.selected === n}
        disabled={props.busy}
        onClick={() => props.onSelect(n)}
      >
        {n}
      </button>
    ))}
  </div>
);

/** The "O's shift behaviour" section: mode toggle plus before/after examples. */
const ShiftModeSection = (props: {
  shiftMode: ShiftMode;
  busy: boolean;
  onSelect: (mode: ShiftMode) => void;
}) => (
  <section className={styles.section}>
    <h2 className={styles.sectionTitle}>O&rsquo;s shift behaviour</h2>
    <div className={styles.toggle} role="group" aria-label="Shift mode">
      {(Object.keys(MODE_COPY) as ShiftMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          className={styles.option}
          aria-pressed={props.shiftMode === mode}
          disabled={props.busy}
          onClick={() => props.onSelect(mode)}
        >
          <span className={styles.optionTitle}>{MODE_COPY[mode].title}</span>
          <span className={styles.optionBlurb}>{MODE_COPY[mode].blurb}</span>
        </button>
      ))}
    </div>
    <p className={styles.active}>
      Active mode: <strong>{MODE_COPY[props.shiftMode].title}</strong>
    </p>

    <div className={styles.examples}>
      <figure className={styles.example}>
        <MiniBoard board={EXAMPLE_BOARD} />
        <figcaption>Before</figcaption>
      </figure>
      <figure className={styles.example}>
        <MiniBoard board={shiftBoard(EXAMPLE_BOARD, "right", "classic")} />
        <figcaption>Classic →</figcaption>
      </figure>
      <figure className={styles.example}>
        <MiniBoard board={shiftBoard(EXAMPLE_BOARD, "right", "collapse")} />
        <figcaption>Collapse →</figcaption>
      </figure>
    </div>
  </section>
);

/** The "Board size & win length" section: two segmented controls plus a preview. */
const BoardSizeSection = (props: {
  boardSize: number;
  winLength: number;
  busy: boolean;
  onChange: (patch: Partial<GameConfig>) => void;
}) => {
  // A sample board showing a winning run: the first `winLength` cells of the top
  // row are filled so MiniBoard highlights them, making the run length visible
  // against the board size.
  const previewBoard: Board = Array(
    props.boardSize * props.boardSize,
  ).fill(null);
  for (let i = 0; i < props.winLength; i++) previewBoard[i] = "X";

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Board size &amp; win length</h2>

      <h3 className={styles.subheading}>Board size</h3>
      <p className={styles.subtitle}>
        New games are played on an N×N board, from {MIN_BOARD_SIZE} up to{" "}
        {MAX_BOARD_SIZE} cells per side.
      </p>
      <Segmented
        label="Board size"
        values={range(MIN_BOARD_SIZE, MAX_BOARD_SIZE)}
        selected={props.boardSize}
        busy={props.busy}
        onSelect={(n) => props.onChange({ boardSize: n })}
      />

      <h3 className={styles.subheading}>Win length</h3>
      <p className={styles.subtitle}>
        How many of your marks in a row - across, down, or diagonally - wins.
        Capped at the board size.
      </p>
      <Segmented
        label="Win length"
        values={range(MIN_WIN_LENGTH, props.boardSize)}
        selected={props.winLength}
        busy={props.busy}
        onSelect={(n) => props.onChange({ winLength: n })}
      />

      <figure className={styles.preview}>
        <MiniBoard
          board={previewBoard}
          winLength={props.winLength}
          cellSize={28}
        />
        <figcaption>
          {props.boardSize}×{props.boardSize} board, {props.winLength} in a row
          to win
        </figcaption>
      </figure>
    </section>
  );
};

/**
 * Internal POC tool at /internal/game-config for trying out rule variants: the
 * experimental shift behaviour, the board size, and the run length needed to
 * win. Deliberately unauthenticated - anyone can flip it.
 */
const GameConfigPage = () => {
  const queryClient = useQueryClient();

  const { data: config, isPending } = useQuery({
    queryKey: GAME_CONFIG_KEY,
    queryFn: ({ signal }) => fetchGameConfig(signal),
  });

  const mutation = useMutation({
    mutationFn: setGameConfig,
    onSuccess: (next) => queryClient.setQueryData(GAME_CONFIG_KEY, next),
  });

  if (isPending || !config) {
    return (
      <main className={styles.main}>
        <Spinner label="Loading config" />
      </main>
    );
  }

  const update = (patch: Partial<GameConfig>) => mutation.mutate(patch);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>Game config</h1>
        <p className={styles.subtitle}>
          Internal POC controls. Changes apply to new games only; games already
          created keep the size, win length, and shift rule they started with.
        </p>
      </header>

      <ShiftModeSection
        shiftMode={config.shiftMode}
        busy={mutation.isPending}
        onSelect={(shiftMode) => update({ shiftMode })}
      />

      <BoardSizeSection
        boardSize={config.boardSize}
        winLength={config.winLength}
        busy={mutation.isPending}
        onChange={update}
      />
    </main>
  );
};

export default GameConfigPage;
