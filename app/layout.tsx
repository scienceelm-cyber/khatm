import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ختم گروهی قرآن",
  description: "ختم جمعی قرآن؛ هر نفر یک آیه، برای یک نیت مشترک.",
  robots: { index: false, follow: false },
  applicationName: "ختم گروهی قرآن"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#123f35"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>;
}
