import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WanderLedger — Zero-Login Collaborative Travel Ledger",
  description:
    "Mobile-first, zero-login collaborative travel coordination and automated debt minimization ledger for seamless group trips.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FFEBAF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-vanilla text-ink selection:bg-moonstone/20 selection:text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
