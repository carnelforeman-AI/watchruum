import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Watchruum — Never get spoiled again",
  description:
    "A spoiler-safe social platform for TV and movie fans. Track what you watch, rate every episode, and join fan rooms that unlock only when you're ready.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
