import { publicMetadata } from '@/lib/seo';
import type { Metadata } from "next";
import { Gaegu, Geist, Geist_Mono, Nanum_Pen_Script } from "next/font/google";
import PerformanceDiagnostics from "../performance-diagnostics";
import WebAnalytics from "../web-analytics";
import KakaoBrowserEscape from "../kakao-browser-escape";
import "../globals.css";
import "../brand.css";
import "../workspace-split.css";
import "../workspace-motion.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Handwriting faces for themed albums. Korean glyphs arrive by unicode-range, so skip the latin-only preload.
const handFont = Gaegu({
  variable: "--font-hand",
  weight: ["400", "700"],
  subsets: ["latin"],
  preload: false,
});

const penFont = Nanum_Pen_Script({
  variable: "--font-pen",
  weight: "400",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  ...publicMetadata("en"),
  alternates: undefined,
  title: "Memonestia — A shelf for our days.",
  description: "Keep your photos and stories in memory books on a shared shelf. Invite someone to add their memories.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${handFont.variable} ${penFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <KakaoBrowserEscape />
        {children}
        <WebAnalytics /><PerformanceDiagnostics />
      </body>
    </html>
  );
}

