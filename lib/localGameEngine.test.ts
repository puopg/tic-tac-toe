import { describe, expect, it } from "vitest";
import { AI_SEAT } from "@/constants/game";
import {
  aiReply,
  canShift,
  claim,
  createLocalGame,
  currentTurn,
  isOver,
  leave,
  LOCAL_PLAYER,
  place,
  shift,
  startNextRound,
  type LocalGameState,
} from "./localGameEngine";

const CONFIG = { size: 3, winLength: 3, shiftMode: "classic" as const };

/** Count placed marks on the board. */
const marks = (state: LocalGameState) =>
  state.board.filter((cell) => cell !== null).length;

/** Apply a sequence of placements in order, returning the final state. */
const playMoves = (start: LocalGameState, indices: number[]): LocalGameState =>
  indices.reduce((state, index) => place(state, index), start);

describe("createLocalGame", () => {
  it("starts unseated, empty, and zeroed", () => {
    const state = createLocalGame("local", CONFIG);
    expect(state.seats).toEqual({ X: null, O: null });
    expect(marks(state)).toBe(0);
    expect(state.scores).toEqual({ X: 0, O: 0, draws: 0 });
    expect(state.xIsNext).toBe(true);
    expect(isOver(state)).toBe(false);
  });
});

describe("claim", () => {
  it("local: one player holds both seats", () => {
    const state = claim(createLocalGame("local", CONFIG), "X");
    expect(state.seats).toEqual({ X: LOCAL_PLAYER, O: LOCAL_PLAYER });
    expect(marks(state)).toBe(0); // human opens
  });

  it("ai, human as X: human opens, AI waits", () => {
    const state = claim(createLocalGame("ai", CONFIG), "X");
    expect(state.seats).toEqual({ X: LOCAL_PLAYER, O: AI_SEAT });
    expect(marks(state)).toBe(0);
    expect(currentTurn(state)).toBe("X");
  });

  it("ai, human as O: AI opens immediately as X", () => {
    const state = claim(createLocalGame("ai", CONFIG), "O");
    expect(state.seats).toEqual({ X: AI_SEAT, O: LOCAL_PLAYER });
    expect(marks(state)).toBe(1); // AI placed the opening mark
    expect(currentTurn(state)).toBe("O"); // now the human's turn
  });

  it("is a no-op once seated", () => {
    const seated = claim(createLocalGame("local", CONFIG), "X");
    expect(claim(seated, "O")).toBe(seated);
  });
});

describe("place", () => {
  it("places the on-turn mark and hands over the turn", () => {
    const state = place(claim(createLocalGame("local", CONFIG), "X"), 0);
    expect(state.board[0]).toBe("X");
    expect(currentTurn(state)).toBe("O");
  });

  it("ignores a taken cell and a finished game", () => {
    const afterX = place(claim(createLocalGame("local", CONFIG), "X"), 0);
    expect(place(afterX, 0)).toBe(afterX); // cell taken
  });

  it("scores a win once and ends the game without flipping the turn", () => {
    // X: 0,1,2 (top row) interleaved with O: 3,4.
    const state = playMoves(claim(createLocalGame("local", CONFIG), "X"), [
      0, 3, 1, 4, 2,
    ]);
    expect(isOver(state)).toBe(true);
    expect(state.scores).toEqual({ X: 1, O: 0, draws: 0 });
    expect(currentTurn(state)).toBe("X"); // turn not advanced past the win
    expect(place(state, 5)).toBe(state); // no moves after game over
  });

  it("scores a draw", () => {
    const state = playMoves(claim(createLocalGame("local", CONFIG), "X"), [
      0, 2, 1, 3, 5, 4, 6, 8, 7,
    ]);
    expect(isOver(state)).toBe(true);
    expect(state.scores).toEqual({ X: 0, O: 0, draws: 1 });
  });

  it("does not mutate the input state", () => {
    const before = claim(createLocalGame("local", CONFIG), "X");
    const snapshot = JSON.stringify(before);
    place(before, 0);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe("aiReply", () => {
  it("local game: no-op", () => {
    const state = place(claim(createLocalGame("local", CONFIG), "X"), 0);
    expect(aiReply(state)).toBe(state);
  });

  it("vs-AI: responds to the human's move with a placement", () => {
    const afterHuman = place(claim(createLocalGame("ai", CONFIG), "X"), 4);
    expect(currentTurn(afterHuman)).toBe("O"); // AI (O) to move
    const afterAi = aiReply(afterHuman);
    expect(marks(afterAi)).toBe(2); // AI placed its reply
    expect(currentTurn(afterAi)).toBe("X"); // back to the human
  });

  it("vs-AI: no-op while it is still the human's turn", () => {
    const seated = claim(createLocalGame("ai", CONFIG), "X");
    expect(aiReply(seated)).toBe(seated); // human (X) hasn't moved yet
  });
});

describe("shift", () => {
  it("O may shift; X may not on a 3x3 board", () => {
    const afterX = place(claim(createLocalGame("local", CONFIG), "X"), 0);
    expect(canShift(afterX, "O")).toBe(true);
    const xToMove = place(afterX, 3); // back to X
    expect(canShift(xToMove, "X")).toBe(false);
  });

  it("spends O's shift, advances the turn, and is then unavailable", () => {
    const afterX = place(claim(createLocalGame("local", CONFIG), "X"), 0);
    const shifted = shift(afterX, "left");
    expect(shifted.oShiftUsed).toBe(true);
    expect(currentTurn(shifted)).toBe("X");
    expect(canShift(shifted, "O")).toBe(false);
  });

  it("is a no-op when the seat cannot shift", () => {
    const xToMove = claim(createLocalGame("local", CONFIG), "X");
    expect(shift(xToMove, "left")).toBe(xToMove); // X can't shift on 3x3
  });
});

describe("startNextRound", () => {
  it("clears the board and shift flags but keeps the scores", () => {
    const won = playMoves(claim(createLocalGame("local", CONFIG), "X"), [
      0, 3, 1, 4, 2,
    ]);
    const next = startNextRound(won);
    expect(marks(next)).toBe(0);
    expect(next.oShiftUsed).toBe(false);
    expect(next.xIsNext).toBe(true);
    expect(next.scores).toEqual({ X: 1, O: 0, draws: 0 }); // carried over
    expect(next.seats).toEqual(won.seats); // no side swap
  });

  it("vs-AI with the AI on X opens the new round", () => {
    const game = claim(createLocalGame("ai", CONFIG), "O"); // AI is X
    const next = startNextRound(game);
    expect(marks(next)).toBe(1); // AI opened again
    expect(currentTurn(next)).toBe("O");
  });
});

describe("leave", () => {
  it("returns to the unseated starting state", () => {
    const mid = playMoves(claim(createLocalGame("ai", CONFIG), "X"), [4]);
    const reset = leave(mid);
    expect(reset.seats).toEqual({ X: null, O: null });
    expect(marks(reset)).toBe(0);
    expect(reset.mode).toBe("ai");
  });
});
