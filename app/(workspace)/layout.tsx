import { publicMetadata } from '@/lib/seo';
import type { Metadata } from "next";
import { Gaegu, Geist, Geist_Mono, Nanum_Pen_Script, Noto_Serif_KR } from "next/font/google";
import PerformanceDiagnostics from "../performance-diagnostics";
import WebAnalytics from "../web-analytics";
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

// Editorial serif for page headings, shared with the public pages.
const editorialFont = Noto_Serif_KR({
  variable: "--font-editorial",
  weight: ["500", "600", "700"],
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
  title: "Memonestia — Your moments. Together.",
  description: "Collect photos from your shared days. Keep photos private and choose the moments to share.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${handFont.variable} ${penFont.variable} ${editorialFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <WebAnalytics /><PerformanceDiagnostics />
      </body>
    </html>
  );
}

