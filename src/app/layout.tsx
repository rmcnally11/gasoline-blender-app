import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MobileTabsProvider } from "@/components/blender/mobile-workspace";
import { PlantProvider } from "@/components/blender/plant-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gasoline blender",
  description:
    "Gulf Coast component valuation: price naphtha and blendstocks in $/gal against fungible and export destinations.",
  appleWebApp: {
    capable: true,
    title: "Gasoline blender",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f8fb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider delay={200}>
          <PlantProvider>
            <MobileTabsProvider>{children}</MobileTabsProvider>
          </PlantProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
