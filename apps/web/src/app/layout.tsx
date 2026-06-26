import type { Metadata, Viewport } from "next";
import { PwaRegister } from "./pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Termopane App",
  title: {
    default: "Termopane App",
    template: "%s | Termopane App",
  },
  description: "Aplicație mobilă pentru oferte de termopane.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Termopane",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/termopane-icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/termopane-icon.svg", type: "image/svg+xml" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#fafaf9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className="h-full antialiased">
      <body className="min-h-full bg-stone-50 text-zinc-950">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
