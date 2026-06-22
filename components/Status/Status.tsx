import styles from "./styles.module.scss";

interface StatusProps {
  message: string;
  tone: "x" | "o" | "draw" | "neutral";
}

export default function Status({ message, tone }: StatusProps) {
  const toneClass =
    tone === "x"
      ? styles.x
      : tone === "o"
        ? styles.o
        : tone === "draw"
          ? styles.draw
          : "";

  return (
    <div className={`${styles.status} ${toneClass}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
