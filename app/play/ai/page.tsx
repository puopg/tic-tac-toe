import PlayScene from "../PlayScene";

type Props = {
  searchParams: Promise<{ name?: string }>;
};

/** Single-player game against the computer - runs entirely in the browser. */
const AiPlayPage = async (props: Props) => {
  const { name } = await props.searchParams;
  return <PlayScene mode="ai" name={name} />;
};

export default AiPlayPage;
