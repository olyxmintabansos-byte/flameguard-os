import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FLAMEGUARD - GitHub Streak Guardian",
  description: "Biar Kotak-Kotak Hijau Lu Gak Bolong, Api TikTok Lu Gak Pernah Padam.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-[var(--primary)] text-white">
        {children}
      </body>
    </html>
  );
}
