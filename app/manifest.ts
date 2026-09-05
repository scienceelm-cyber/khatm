import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ختم جمعی قرآن، صلوات و هدیه‌های معنوی",
    short_name: "ختم جمعی",
    description: "ختم قرآن، صلوات و هدیه‌های معنوی با نیت و شمارنده مشترک",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f0e4",
    theme_color: "#123f35",
    lang: "fa",
    dir: "rtl",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
