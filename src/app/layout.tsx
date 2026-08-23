import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          <PlantProvider>{children}</PlantProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
