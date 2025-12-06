import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chill-outs Beheer",
  description: "Applicatie voor het beheren van chill-outs voor studenten",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

