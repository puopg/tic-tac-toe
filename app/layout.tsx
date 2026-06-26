import type { Metadata } from "next";
import "./globals.scss";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Tic-Tac-Toe",
  description: "Play tic-tac-toe against a friend or an unbeatable AI.",
};

type Props = {
  children: React.ReactNode;
};

const RootLayout = (props: Props) => {
  return (
    <html lang="en">
      <body>
        <Providers>{props.children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
