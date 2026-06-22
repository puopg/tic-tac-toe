import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Tic-Tac-Toe",
  description: "Play tic-tac-toe against a friend or an unbeatable AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
