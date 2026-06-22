import Game from "@/components/Game/Game";
import styles from "./page.module.scss";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Tic-Tac-Toe</h1>
      <Game />
      <footer className={styles.footer}>
        Built with Next.js. The AI plays a perfect game - the best you can do is
        draw.
      </footer>
    </main>
  );
}
