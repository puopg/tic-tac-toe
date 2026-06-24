import Lobby from "@/common/components/Lobby";
import styles from "./page.module.scss";

const Home = () => {
  return (
    <main className={styles.main}>
      <Lobby />
    </main>
  );
};

export default Home;
