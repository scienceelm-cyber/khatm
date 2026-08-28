import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ختم جمعی قرآن و صلوات",
    short_name: "ختم جمعی",
    description: "هر آیه و هر صلوات، سهمی کوچک در یک نیت مشترک",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f0e4",
    theme_color: "#123f35",
    lang: "fa",
    dir: "rtl",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
