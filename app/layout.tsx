import type { Metadata } from "next";
import "./globals.css";
import { AudioProvider } from "@/context/AudioContext";
import StarfieldCanvas from "@/components/StarfieldCanvas";

export const metadata: Metadata = {
  title: "Harmonify - Listen to your dreams",
  description:
    "Harmonify — Listen to your dreams. A modern, Spotify-inspired music player with synchronized lyrics, animated waveform timeline, 8 dynamic themes, and offline ID3 metadata.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="dark antialiased">
        <AudioProvider>
          <StarfieldCanvas />
          {children}
        </AudioProvider>
      </body>
    </html>
  );
}
