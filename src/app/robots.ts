import type { MetadataRoute } from "next";

const BASE_URL = "https://mastermind.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/legal/agb", "/legal/datenschutz", "/legal/impressum"],
        disallow: [
          "/app",
          "/app/",
          "/teach",
          "/teach/",
          "/admin",
          "/admin/",
          "/eltern",
          "/eltern/",
          "/plattform",
          "/plattform/",
          "/login",
          "/api/",
          "/offline",
          "/search",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
