import type { Metadata } from "next";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "Chill-outs Beheer",
  description: "Applicatie voor het beheren van chill-outs voor studenten",
  manifest: "/manifest.json",
  themeColor: "#2a2a3a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Chill-outs Beheer",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="nl" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#2a2a3a" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Chill-outs Beheer" />
        </head>
        <body className="antialiased font-sans" suppressHydrationWarning>
          <PWARegister />
          <AuthGuard>{children}</AuthGuard>
        </body>
      </html>
  );
}

