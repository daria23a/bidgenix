import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BidGenix — draft RFP responses from your answer library",
  description:
    "Upload an RFP, get a source-grounded response drafted from your own answers with semantic search. Review, approve, export.",
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
