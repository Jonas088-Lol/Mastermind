import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AppInit } from "@/components/AppInit";
import "./globals.css";

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
        {/* iOS PWA / native app meta */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MasterMind" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Capacitor safe-area support */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="min-h-screen bg-bg text-fg antialiased" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
        <ServiceWorkerRegister />
        <AppInit />
      </body>
    </html>
  );
}
