import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ختم گروهی قرآن",
    short_name: "ختم قرآن",
    description: "هر آیه، یک سهم از یک نیت مشترک",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f2e8",
    theme_color: "#123f35",
    lang: "fa",
    dir: "rtl",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }]
  };
}
