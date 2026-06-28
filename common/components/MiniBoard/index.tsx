import classNames from "classnames";
import { boardSize, calculateWinner, type Board } from "@/utils/gameLogic";
import WinningLine from "@/common/components/WinningLine";
import styles from "./styles.module.scss";

type Props = {
  board: Board;
  /** Win run length, if known, so the highlighted line matches the game's rule.
   *  Previews that don't know it fall back to the classic 3-in-a-row. */
  winLength?: number;
};

/** A small, read-only board preview used in lobby room cards. */
const MiniBoard = (props: Props) => {
  const size = boardSize(props.board);
  const winningLine =
    calculateWinner(props.board, props.winLength)?.line ?? null;

  return (
    <div
      className={styles.root}
      aria-hidden="true"
      style={{
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gridTemplateRows: `repeat(${size}, 1fr)`,
      }}
    >
      {props.board.map((value, index) => (
        <div
          key={index}
          className={classNames(styles.cell, {
            [styles.x]: value === "X",
            [styles.o]: value === "O",
          })}
        >
          {value}
        </div>
      ))}
      {winningLine && <WinningLine line={winningLine} size={size} />}
    </div>
  );
};

export default MiniBoard;
