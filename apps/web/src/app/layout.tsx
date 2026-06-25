import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Termopane App",
  description: "Aplicație mobilă pentru oferte de termopane.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className="h-full antialiased">
      <body className="min-h-full bg-stone-50 text-zinc-950">{children}</body>
    </html>
  );
}
