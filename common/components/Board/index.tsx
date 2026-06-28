"use client";

import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { animated, to, useSpring, useTransition } from "@react-spring/web";
import { INITIAL_SIZE } from "@/constants/game";
import {
  shiftPlan,
  type Board as BoardState,
  type Direction,
  type Player,
  type ShiftMode,
} from "@/utils/gameLogic";
import Square from "@/common/components/Square";
import WinningLine from "@/common/components/WinningLine";
import styles from "./styles.module.scss";

/** Board grid gap in px; keep in sync with `gap` in styles.module.scss. */
const GAP = 10;
const SIZE = INITIAL_SIZE;

/**
 * A one-shot cue describing how the board reached its current `board` prop, so
 * the marks layer can animate the change instead of snapping to it. Pass a fresh
 * object only when an animation should play; pass null at rest. A board change
 * with no fresh cue snaps into place (resets, replay jumps, opponent moves).
 */
export type BoardTransition =
  | { kind: "place"; index: number }
  | { kind: "shift"; direction: Direction; mode: ShiftMode; from: BoardState };

/** One animated mark with a stable identity that survives across a shift. */
type Sprite = { id: number; player: Player; row: number; col: number };

const STEP: Record<Direction, [number, number]> = {
  top: [-1, 0],
  bottom: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

/** How far (in cells) a swept mark slides past its cell as it leaves - just
 *  enough to clear the edge while it fades and shrinks, not across the board. */
const DEPART_CELLS = 1.15;

// Physics-based spring configs (tension/friction) rather than fixed durations,
// so motion eases in and settles naturally instead of reading as a linear
// tween. Tuned per phase: a snappy pop-in for a placed mark, a firm glide for
// the grid slide, and a slightly springier straighten/shrink as a swept mark
// drops away off-board. The slide and depart `clamp` so they stop dead at their
// target instead of overshooting and bouncing - a mark must land squarely in
// its cell.
const ENTER_SPRING = { tension: 320, friction: 20 };
const SLIDE_SPRING = { tension: 260, friction: 26, clamp: true };
const DEPART_SPRING = { tension: 300, friction: 22, clamp: true };

// ─── Shift-sway tuning knobs ────────────────────────────────────────────────
// As the grid shifts, every mark leans into its travel - a tilt going sideways,
// a squish going up/down - then springs back upright as it settles. A single
// board-level spring pulses 0 -> 1 -> 0 once per shift and each mark scales the
// peaks below by it, so the whole grid sways as one. Tweak these freely:

/** Peak tilt for a horizontal (left/right) sweep, in degrees. 0 = no tilt. */
const LEAN_TILT_DEG = 8;

/** Peak squish for a vertical (up/down) sweep, as a fraction of the mark's
 *  height (0.18 = squished to 82% tall). Affects scaleY only. 0 = no squish. */
const LEAN_SQUASH = 0.18;

/** How the lean springs *out* into its tilt/squish as the shift starts - a
 *  spring, not a fixed duration, for fluid motion. Raise `tension` for a
 *  snappier whip into the lean, raise `friction` to ease it in more slowly;
 *  `clamp` stops it cleanly at the peak with no overshoot. */
const LEAN_SPRING = { tension: 700, friction: 26, clamp: true };

/** How long the lean holds before it springs back upright, in ms, timed from the
 *  start of the shift. The departing marks also begin to fade and shrink at this
 *  point, so raising it holds the lean (and the full-size marks) longer before
 *  the release. The springiness of the release itself is `DEPART_SPRING`. */
const LEAN_RELEASE_DELAY_MS = 160;
// ────────────────────────────────────────────────────────────────────────────

/**
 * Peak lean per travel direction, scaled by the shared lean spring. Horizontal
 * sweeps tilt (a leftward sweep tips clockwise, rightward counter-clockwise,
 * mirroring the "How to play" illustration in ShiftAnimation); vertical sweeps
 * squish instead, since a z-rotation reads as nothing for straight up/down
 * travel. Flip a sign to reverse which way a direction leans.
 */
const DEPART_LEAN: Record<Direction, { rotate: number; squash: number }> = {
  left: { rotate: LEAN_TILT_DEG, squash: 0 },
  right: { rotate: -LEAN_TILT_DEG, squash: 0 },
  top: { rotate: 0, squash: LEAN_SQUASH },
  bottom: { rotate: 0, squash: LEAN_SQUASH },
};

/** Marks for `board`, reusing the prior sprite at each cell so ids stay stable
 *  (a cell whose mark is unchanged keeps its id and therefore does not animate). */
function snapSprites(
  prev: Sprite[],
  board: BoardState,
  nextId: () => number,
): Sprite[] {
  const byCell = new Map(prev.map((s) => [s.row * SIZE + s.col, s]));
  const out: Sprite[] = [];
  for (let i = 0; i < board.length; i++) {
    const player = board[i];
    if (player === null) continue;
    const existing = byCell.get(i);
    out.push(
      existing && existing.player === player
        ? existing
        : { id: nextId(), player, row: Math.floor(i / SIZE), col: i % SIZE },
    );
  }
  return out;
}

/** Sprites after a shift: survivors keep their id and move to their settled
 *  cell; swept marks are dropped here and animate off the grid via `leave`. */
function shiftSprites(
  prev: Sprite[],
  from: BoardState,
  direction: Direction,
  mode: ShiftMode,
  nextId: () => number,
): Sprite[] {
  const byCell = new Map(prev.map((s) => [s.row * SIZE + s.col, s]));
  const survivors: Sprite[] = [];
  for (const motion of shiftPlan(from, direction, mode)) {
    if (motion.departs) continue;
    const existing = byCell.get(motion.from.row * SIZE + motion.from.col);
    survivors.push(
      existing
        ? { ...existing, row: motion.to.row, col: motion.to.col }
        : {
            id: nextId(),
            player: motion.player,
            row: motion.to.row,
            col: motion.to.col,
          },
    );
  }
  return survivors;
}

type Props = {
  board: BoardState;
  winningLine: readonly number[] | null;
  onSquareClick: (index: number) => void;
  disabled: boolean;
  /** How the board reached its current state, for animation; null at rest. */
  transition?: BoardTransition | null;
};

const Board = (props: Props) => {
  const { board, transition } = props;

  // Live cell size in px so the marks layer can position by pixel offset, which
  // is what react-spring animates. Measured from the overlay, which is inset to
  // the cells, and kept current on resize.
  const layerRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(0);
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    const measure = () => setCell((el.clientWidth - (SIZE - 1) * GAP) / SIZE);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Reconcile the sprite list during render (a derived-state pattern): a fresh
  // transition animates the change, any other board change snaps. Guarded by the
  // transition identity and the board contents so it runs once per real change.
  const spritesRef = useRef<Sprite[]>([]);
  const idRef = useRef(0);
  const nextId = () => (idRef.current += 1);
  const lastTransitionRef = useRef<BoardTransition | null>(null);
  const lastBoardKeyRef = useRef<string | null>(null);
  const immediateRef = useRef(true); // first mount snaps; transitions set false
  const departDirRef = useRef<Direction>("left");

  const boardKey = board.map((c) => c ?? ".").join("");
  if (transition && transition !== lastTransitionRef.current) {
    lastTransitionRef.current = transition;
    lastBoardKeyRef.current = boardKey;
    immediateRef.current = false;
    spritesRef.current =
      transition.kind === "shift"
        ? ((departDirRef.current = transition.direction),
          shiftSprites(
            spritesRef.current,
            transition.from,
            transition.direction,
            transition.mode,
            nextId,
          ))
        : snapSprites(spritesRef.current, board, nextId); // place: new cell enters
  } else if (boardKey !== lastBoardKeyRef.current) {
    lastBoardKeyRef.current = boardKey;
    immediateRef.current = true;
    spritesRef.current = snapSprites(spritesRef.current, board, nextId);
  }
  const sprites = spritesRef.current;

  const point = (row: number, col: number) => ({
    x: col * (cell + GAP),
    y: row * (cell + GAP),
  });

  // One board-level "lean" spring shared by every mark: it pulses 0 -> 1 -> 0
  // once per shift (see the effect below) and each mark's transform scales the
  // direction's peak tilt/squash by it. Lifting the lean here - rather than
  // driving it per sprite through useTransition's `update`, which re-runs every
  // render and would replay the sway on unrelated re-renders - lets survivors
  // and departing marks sway together off one source of truth.
  const [leanStyle, leanApi] = useSpring(() => ({ lean: 0 }));
  useEffect(() => {
    if (!transition || transition.kind !== "shift" || reducedMotion) return;
    // Spring into the lean as the grid starts moving, hold, then - nearing the
    // settle - spring it back to neutral. The unawaited lean-out lets the
    // delayed release overlap the tail of the slide rather than waiting for it.
    leanApi.start({
      to: async (next) => {
        void next({ lean: 1, config: LEAN_SPRING });
        await next({ lean: 0, delay: LEAN_RELEASE_DELAY_MS, config: DEPART_SPRING });
      },
    });
  }, [transition, reducedMotion, leanApi]);

  const transitions = useTransition(sprites, {
    keys: (s) => s.id,
    from: (s) => ({ ...point(s.row, s.col), opacity: 0, scale: 0.4 }),
    enter: (s) => ({ ...point(s.row, s.col), opacity: 1, scale: 1 }),
    update: (s) => ({ ...point(s.row, s.col), opacity: 1, scale: 1 }),
    leave: (s) => {
      // Only a shift sweeps a mark off the grid; every other removal (reset,
      // replay jump, reduced motion) snaps - the same `immediate` cases the
      // enter/update springs honor. The async leave below drives its own
      // springs, so the transition-wide `immediate` flag doesn't reach it; we
      // branch on it here instead, or a reset would slide every mark away. The
      // sway itself rides the shared lean spring above; here the mark just
      // slides off and, nearing its off-board resting spot, fades and shrinks.
      const snap = immediateRef.current || reducedMotion;
      const [dr, dc] = STEP[departDirRef.current];
      return async (next: (props: object) => Promise<void>) => {
        if (snap) {
          await next({ opacity: 0, immediate: true });
          return;
        }
        void next({
          ...point(s.row + dr * DEPART_CELLS, s.col + dc * DEPART_CELLS),
          config: SLIDE_SPRING,
        });
        await next({
          opacity: 0,
          scale: 0.2,
          delay: LEAN_RELEASE_DELAY_MS,
          config: DEPART_SPRING,
        });
      };
    },
    immediate: immediateRef.current || reducedMotion,
    config: (_s, _i, phase) =>
      phase === "enter" ? ENTER_SPRING : SLIDE_SPRING,
  });

  // Peak tilt/squish for the in-flight shift's direction; the shared lean spring
  // scales between 0 (upright) and these values. Harmless at rest - lean is 0,
  // so the direction left over from the last shift contributes nothing.
  const leanPeak = DEPART_LEAN[departDirRef.current];

  return (
    <div
      className={styles.root}
      role="grid"
      aria-label="Tic-tac-toe board"
      style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
    >
      {board.map((value, index) => (
        <Square
          key={index}
          index={index}
          value={value}
          isWinning={props.winningLine?.includes(index) ?? false}
          onClick={() => props.onSquareClick(index)}
          disabled={props.disabled}
        />
      ))}

      <div ref={layerRef} className={styles.marks} aria-hidden="true">
        {cell > 0 &&
          transitions((style, sprite) => (
            <animated.div
              className={classNames(
                styles.mark,
                sprite.player === "X" ? styles.x : styles.o,
              )}
              style={{
                width: cell,
                height: cell,
                fontSize: cell * 0.56,
                opacity: style.opacity,
                transform: to(
                  [style.x, style.y, style.scale, leanStyle.lean],
                  (x, y, s, l) => {
                    // The shared lean spring (l: 0..1) scales the direction's
                    // peak sway. scaleY alone carries the squash, so a vertical
                    // sweep just squishes the mark; scaleX stays at the scale.
                    const r = leanPeak.rotate * l;
                    const sy = s * (1 - leanPeak.squash * l);
                    return `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s}, ${sy})`;
                  },
                ),
              }}
            >
              {sprite.player}
            </animated.div>
          ))}
      </div>

      {props.winningLine && <WinningLine line={props.winningLine} />}
    </div>
  );
};

export default Board;
