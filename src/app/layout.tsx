/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AppInit } from "@/components/AppInit";
import { DisplayPrefsApplier } from "@/components/app/DisplayPrefsApplier";
import { GateClearer } from "@/components/GateClearer";
import "./globals.css";
import { SpeedBoost } from "@/components/SpeedBoost";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MasterMind — Eine Plattform für Schule",
    template: "%s · MasterMind",
  },
  description:
    "Lernen, Verwaltung und KI in einer Plattform. DSGVO-konform aus Deutschland. Für Schulen, Lehrer, Schüler und Eltern.",
  metadataBase: new URL("https://mastermind.app"),
  openGraph: {
    title: "MasterMind — Eine Plattform für Schule",
    description:
      "Lernen, Verwaltung und KI in einer Plattform. DSGVO-konform aus Deutschland.",
    locale: "de_DE",
    type: "website",
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="darkreader-lock" />
        {/* Viewport — viewport-fit=cover for iPhone notch/Dynamic Island */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

        {/* ── iOS PWA ────────────────────────────────────────────────── */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MasterMind" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* apple-touch-icon — used when user taps "Zum Home-Bildschirm" in Safari */}
        <link rel="apple-touch-icon" href="/apple-icon" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon?size=152" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icon?size=144" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icon?size=120" />
        <link rel="apple-touch-icon" sizes="114x114" href="/icon?size=114" />
        <link rel="apple-touch-icon" sizes="76x76"   href="/icon?size=76" />
        <link rel="apple-touch-icon" sizes="72x72"   href="/icon?size=72" />

        {/* iOS Splash Screens — shown while app loads after install */}
        {/* iPhone 16 Pro Max (430 × 932 pt → 1320×2868 px) */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/api/splash?w=1320&h=2868" />
        {/* iPhone 16 / 15 Pro (393 × 852 pt → 1179×2556 px) */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/api/splash?w=1179&h=2556" />
        {/* iPhone 14 Pro Max / 15 Plus (430 × 932 pt → 1290×2796 px) */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/api/splash?w=1290&h=2796" />
        {/* iPhone 14 Pro (393 × 852 → 1179×2556) — same as 16 line */}
        {/* iPhone SE 3rd gen (375 × 667 pt → 750×1334 px) */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/api/splash?w=750&h=1334" />
        {/* iPhone X / XS / 11 Pro (375 × 812 pt → 1125×2436 px) */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/api/splash?w=1125&h=2436" />
        {/* iPhone XR / 11 (414 × 896 pt → 828×1792 px) */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/api/splash?w=828&h=1792" />
        {/* iPhone 12/13/14 (390 × 844 pt → 1170×2532 px) */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="/api/splash?w=1170&h=2532" />
        {/* iPad Air / Pro 11" */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/api/splash?w=1640&h=2360" />
        {/* iPad Pro 12.9" */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" href="/api/splash?w=2048&h=2732" />
      </head>
      <body className="min-h-screen bg-bg text-fg antialiased" suppressHydrationWarning>
        <ThemeProvider>{children}<SpeedBoost /></ThemeProvider>
        <ServiceWorkerRegister />
        <AppInit />
        <DisplayPrefsApplier />
        <GateClearer />
      </body>
    </html>
  );
}
