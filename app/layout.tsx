import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Taym Shop — Collect. Trade. Connect.",
  description: "Trading cards in Beirut: Pokémon, FIFA, Yu-Gi-Oh!, One Piece and more.",
  openGraph: {
    title: "Taym Shop — Great cards. Better stories.",
    description: "Collect, trade, and connect with Taym Shop in Beirut.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Taym Shop trading cards" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Taym Shop — Great cards. Better stories.",
    description: "Collect, trade, and connect with Taym Shop in Beirut.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geist.variable} ${mono.variable}`}>{children}</body></html>;
}
