import Link from "next/link";
import { modeLabel, type RoomMode } from "@/lib/roomTypes";
import styles from "./styles.module.scss";

type Props = {
  name: string;
  mode: RoomMode;
  /** Board side length and the run needed to win, both fixed for the game's
   *  life at creation. Shown as a rules tag so a returning player can tell the
   *  win condition at a glance; omitted (no tag) when not supplied. */
  size?: number;
  winLength?: number;
};

/**
 * The shared top bar for the room and replay views: a back-to-lobby link, the
 * game name, a tag for the locked-in win condition (board size + run length),
 * and a mode tag. Both views render an identical header, so it lives here as one
 * component owning the markup and styles.
 */
const RoomHeader = (props: Props) => {
  const showRules = props.size != null && props.winLength != null;
  return (
    <header className={styles.topBar}>
      <Link href="/" className={styles.back}>
        ← Lobby
      </Link>
      <h1 className={styles.title}>{props.name}</h1>
      {showRules && (
        <span className={styles.rulesTag}>
          {props.size} × {props.size} · {props.winLength} in a row
        </span>
      )}
      <span className={styles.modeTag}>{modeLabel(props.mode)}</span>
    </header>
  );
};

export default RoomHeader;
