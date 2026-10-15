import { publicMetadata } from '@/lib/seo';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import WebAnalytics from "../web-analytics";
import "../globals.css";
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <WebAnalytics />
      </body>
    </html>
  );
}

