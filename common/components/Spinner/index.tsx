import styles from "./styles.module.scss";

type Props = {
  label?: string;
};

/**
 * Centered loading indicator: an accent-colored spinning ring with an optional
 * caption. Used wherever a list or view is still fetching its first data.
 */
const Spinner = (props: Props) => (
  <div className={styles.root} role="status" aria-live="polite">
    <span className={styles.ring} aria-hidden="true" />
    {props.label && <span className={styles.label}>{props.label}</span>}
  </div>
);

export default Spinner;
