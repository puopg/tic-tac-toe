import { AI_SEAT } from "@/constants/game";
import {
  calculateWinner,
  canXShift,
  chooseAiAction,
  isGameOver,
  shiftBoard,
  type Board,
  type Direction,
  type GameAction,
  type Player,
  type ShiftMode,
} from "@/utils/gameLogic";
import type { Scores, Seats } from "@/lib/roomTypes";

/**
 * Sentinel seat holder for the human in a client-only game. Local and vs-AI
 * games never touch the server, so there is no real playerId - one constant
 * stands in for "the person at this device" so the same `mySeat` derivation the
 * online room uses (holds X / holds O / holds both) works unchanged.
 */
export const LOCAL_PLAYER = "__LOCAL__";

/** The two single-device modes this engine drives. */
export type LocalMode = "local" | "ai";

/**
 * The full state of a client-only game. A deliberate subset of the server
 * {@link import("@/lib/roomTypes").Room} - the seat/turn/score/shift fields the
 * rules act on - so the engine mirrors `roomStore`'s pure helpers (settle,
 * runAiTurn, clearRound) one-for-one without the server's persistence,
 * heartbeat, or TTL machinery. Every transition returns a fresh state; inputs
 * are never mutated.
 */
export interface LocalGameState {
  mode: LocalMode;
  board: Board;
  size: number;
  winLength: number;
  actions: GameAction[];
  xIsNext: boolean;
  scores: Scores;
  seats: Seats;
  oShiftUsed: boolean;
  xShiftUsed: boolean;
  /** The shift variant O's grid shift uses, fixed at creation (config-driven). */
  shiftMode: ShiftMode;
}

const emptyBoard = (size: number): Board => Array(size * size).fill(null);

/** A fresh, unseated game: empty board, open seats, zeroed scores. */
export function createLocalGame(
  mode: LocalMode,
  config: { size: number; winLength: number; shiftMode: ShiftMode },
): LocalGameState {
  return {
    mode,
    board: emptyBoard(config.size),
    size: config.size,
    winLength: config.winLength,
    actions: [],
    xIsNext: true,
    scores: { X: 0, O: 0, draws: 0 },
    seats: { X: null, O: null },
    oShiftUsed: false,
    xShiftUsed: false,
    shiftMode: config.shiftMode,
  };
}

/** The seat about to move. */
export function currentTurn(state: LocalGameState): Player {
  return state.xIsNext ? "X" : "O";
}

/** Whether the game has reached a terminal position (win or full board). */
export function isOver(state: LocalGameState): boolean {
  return isGameOver(state.board, state.winLength);
}

/** Which seat the AI holds in a vs-AI game, or null (no AI / local game). */
export function aiSeat(state: LocalGameState): Player | null {
  if (state.mode !== "ai") return null;
  if (state.seats.X === AI_SEAT) return "X";
  if (state.seats.O === AI_SEAT) return "O";
  return null;
}

/**
 * Whether the on-turn seat may use its grid shift right now. O's is always
 * available once per game; X's is classic-only and gated by {@link canXShift}.
 * Mirrors the same predicate the online room and AI use.
 */
export function canShift(state: LocalGameState, seat: Player): boolean {
  if (isOver(state)) return false;
  return seat === "O"
    ? !state.oShiftUsed
    : !state.xShiftUsed &&
        canXShift({ size: state.size, turn: state.actions.length });
}

/** Record a finished round in the scores exactly once (mutates `scores`). */
function applyOutcome(state: LocalGameState): void {
  const result = calculateWinner(state.board, state.winLength);
  if (result) state.scores[result.winner] += 1;
  else state.scores.draws += 1;
}

/**
 * If the board is now terminal, score the round once and report that the game
 * ended. The single point every placement and shift funnels through, so a game
 * is scored exactly once however it ends. Does not advance the turn.
 */
function settle(state: LocalGameState): boolean {
  if (isOver(state)) {
    applyOutcome(state);
    return true;
  }
  return false;
}

/**
 * Take the AI's single action in place when it is the AI's turn in a vs-AI
 * game: place its best move or spend its seat's once-per-game shift, whichever
 * the lookahead prefers. A no-op otherwise. Leaves it as the human's turn unless
 * the AI's action ended the game. Mirrors `roomStore.runAiTurn`.
 */
function runAiTurn(state: LocalGameState): void {
  const seat = aiSeat(state);
  if (seat === null || isOver(state)) return;
  if (currentTurn(state) !== seat) return;

  const isO = seat === "O";
  const mode: ShiftMode = isO ? state.shiftMode : "classic";
  const action = chooseAiAction(
    state.board,
    seat,
    canShift(state, seat),
    mode,
    state.winLength,
  );
  if (!action) return;

  if (action.kind === "shift") {
    state.board = shiftBoard(state.board, action.dir, action.mode ?? mode);
    state.actions.push({ kind: "shift", dir: action.dir, mode: action.mode ?? mode });
    if (isO) state.oShiftUsed = true;
    else state.xShiftUsed = true;
  } else {
    state.board[action.index] = seat;
    state.actions.push(action);
  }
  if (settle(state)) return; // the AI's action ended the game
  state.xIsNext = seat !== "X"; // hand the turn back to the human
}

/** A shallow-but-sufficient clone so transitions never mutate the caller's state. */
function clone(state: LocalGameState): LocalGameState {
  return {
    ...state,
    board: state.board.slice(),
    actions: state.actions.slice(),
    scores: { ...state.scores },
    seats: { ...state.seats },
  };
}

/**
 * Seat the player (and, in vs-AI, the AI) and open the game. In a local game one
 * person holds both seats; in vs-AI the human takes `seat` and the AI fills the
 * other, then opens immediately if it now holds X. A no-op once seated.
 */
export function claim(state: LocalGameState, seat: Player): LocalGameState {
  if (state.seats.X !== null || state.seats.O !== null) return state;
  const next = clone(state);
  if (next.mode === "local") {
    next.seats = { X: LOCAL_PLAYER, O: LOCAL_PLAYER };
    return next;
  }
  next.seats = {
    X: seat === "X" ? LOCAL_PLAYER : AI_SEAT,
    O: seat === "O" ? LOCAL_PLAYER : AI_SEAT,
  };
  runAiTurn(next); // an AI that holds X opens the game
  return next;
}

/**
 * Place the on-turn seat's mark, score the round if it ended, and hand over the
 * turn. Does not run the AI's reply - the caller schedules that separately so
 * the human's move can render before the AI responds. A no-op if the game is
 * over or the cell is taken.
 */
export function place(state: LocalGameState, index: number): LocalGameState {
  if (isOver(state)) return state;
  if (index < 0 || index >= state.board.length || state.board[index] !== null) {
    return state;
  }
  const next = clone(state);
  const seat = currentTurn(next);
  next.board[index] = seat;
  next.actions.push({ kind: "place", index });
  if (!settle(next)) next.xIsNext = !next.xIsNext;
  return next;
}

/**
 * Spend the on-turn seat's grid shift: slide the grid, mark the shift used,
 * score the round if a collapse shift completed a line, and hand over the turn.
 * Does not run the AI's reply (see {@link place}). A no-op if the seat cannot
 * shift now.
 */
export function shift(state: LocalGameState, direction: Direction): LocalGameState {
  const seat = currentTurn(state);
  if (!canShift(state, seat)) return state;
  const next = clone(state);
  const mode = seat === "O" ? next.shiftMode : "classic";
  next.board = shiftBoard(next.board, direction, mode);
  next.actions.push({ kind: "shift", dir: direction, mode });
  if (seat === "O") next.oShiftUsed = true;
  else next.xShiftUsed = true;
  if (!settle(next)) next.xIsNext = !next.xIsNext;
  return next;
}

/**
 * Run the AI's reply in vs-AI when it is now the AI's turn. Returns the state
 * unchanged in a local game or when it is not the AI's move, so the caller can
 * apply it unconditionally after a human action.
 */
export function aiReply(state: LocalGameState): LocalGameState {
  const seat = aiSeat(state);
  // Return the same reference (not a clone) when there is nothing to do - a
  // local game, the human's turn, or a finished game - so callers can apply it
  // unconditionally without triggering a redundant state update.
  if (seat === null || isOver(state) || currentTurn(state) !== seat) {
    return state;
  }
  const next = clone(state);
  runAiTurn(next);
  return next;
}

/**
 * Begin a fresh round: clear the board and shift flags, hand the opening turn to
 * X, and keep the seats and accumulated scores. Single-device games never swap
 * sides (one player is both seats in local; the human keeps their side vs the
 * AI), so there is no alternation. An AI that holds X opens the new game.
 */
export function startNextRound(state: LocalGameState): LocalGameState {
  const next = clone(state);
  next.board = emptyBoard(next.size);
  next.actions = [];
  next.xIsNext = true;
  next.oShiftUsed = false;
  next.xShiftUsed = false;
  runAiTurn(next); // an AI that holds X opens the fresh game
  return next;
}

/** Abandon the game and return to the unseated, zeroed starting state. */
export function leave(state: LocalGameState): LocalGameState {
  return createLocalGame(state.mode, {
    size: state.size,
    winLength: state.winLength,
    shiftMode: state.shiftMode,
  });
}
