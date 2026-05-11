import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
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
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
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
        name: "Stundenplan",
        short_name: "Plan",
        description: "Wochenstundenplan ansehen",
        url: "/app/plan",
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
