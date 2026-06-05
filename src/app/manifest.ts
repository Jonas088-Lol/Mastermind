import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MasterMind — Eine Plattform für Schule",
    short_name: "MasterMind",
    description:
      "Lernen, Verwaltung und KI in einer Plattform. DSGVO-konform aus Deutschland.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d1117",
    theme_color: "#0d1117",
    lang: "de-DE",
    dir: "ltr",
    categories: ["education", "productivity"],
    icons: [
      // Maskable icon (fills the full icon shape on Android)
      { src: "/icon?size=512", sizes: "512x512", type: "image/png", purpose: "maskable" },
      // Any purpose (transparent background, used in splash)
      { src: "/icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon?size=180", sizes: "180x180", type: "image/png", purpose: "any" },
      { src: "/icon?size=152", sizes: "152x152", type: "image/png", purpose: "any" },
      { src: "/icon?size=144", sizes: "144x144", type: "image/png", purpose: "any" },
      { src: "/icon?size=128", sizes: "128x128", type: "image/png", purpose: "any" },
      { src: "/icon?size=96",  sizes: "96x96",   type: "image/png", purpose: "any" },
      { src: "/icon?size=72",  sizes: "72x72",   type: "image/png", purpose: "any" },
      // Apple touch icon
      { src: "/apple-icon",   sizes: "180x180", type: "image/png" },
    ],
    // Related apps — for Play Store / App Store banners
    related_applications: [],
    prefer_related_applications: false,
    // Protocol handlers for deep links (mastermind://app/...)
    protocol_handlers: [
      { protocol: "web+mastermind", url: "/app/%s" },
    ],
    // Share target — "Teilen mit MasterMind" in Android share sheet
    share_target: {
      action: "/app/community/notizen/neu",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
    shortcuts: [
      {
        name: "Aufgaben",
        short_name: "Aufgaben",
        description: "Offene Aufgaben ansehen",
        url: "/app/aufgaben",
      },
      {
        name: "Karteikarten",
        short_name: "Karten",
        description: "Heute fällige Karten lernen",
        url: "/app/karteikarten",
      },
      {
        name: "Quests",
        short_name: "Quests",
        description: "Tägliche Quests ansehen",
        url: "/app/quests",
      },
      {
        name: "Shop",
        short_name: "Shop",
        description: "Münzen im Shop ausgeben",
        url: "/app/shop",
      },
      {
        name: "KI-Tutor",
        short_name: "Tutor",
        description: "Frage stellen",
        url: "/app/tutor",
      },
    ],
  };
}
