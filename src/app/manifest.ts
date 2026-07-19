import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BetFree — Quit gambling for good",
    short_name: "BetFree",
    description:
      "Quit betting with BetFree: day counter, money saved live, panic button, daily motivation and a personal quit plan.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f2",
    theme_color: "#f4f6f2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
