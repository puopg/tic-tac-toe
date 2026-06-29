import PlayScene from "../PlayScene";

type Props = {
  searchParams: Promise<{ name?: string }>;
};

/** Local same-device pass-and-play game - runs entirely in the browser. */
const LocalPlayPage = async (props: Props) => {
  const { name } = await props.searchParams;
  return <PlayScene mode="local" name={name} />;
};

export default LocalPlayPage;
