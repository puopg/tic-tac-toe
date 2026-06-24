/**
 * Cross-cutting game/room domain constants shared across utils, components, and
 * the server store. Module-internal tuning (minimax weights, store TTLs) and
 * component-local UI timings stay colocated with their owners.
 */

/** The board is a fixed square of this side length. */
export const INITIAL_SIZE = 3;

/** Sentinel playerId for the AI seat; no human can ever match it. */
export const AI_SEAT = "__AI__";
