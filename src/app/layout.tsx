import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Playfair_Display,
  Cormorant_Garamond,
  Dancing_Script,
} from "next/font/google";
import "./globals.css";
import Navbar from "@/components/shared/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
});

const dancing = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ryan & Marsha | Wedding",
  description:
    "Our wedding website with photos, details, and RSVP management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${cormorant.variable} ${dancing.variable} antialiased`}
      >
        <Navbar />
        <div className="pt-16 min-h-screen bg-gradient-to-br from-rose-50 via-emerald-50 to-sky-50">
          <div className="mx-auto w-full max-w-3xl px-2 sm:px-4 md:px-6 lg:px-8">{children}</div>
        </div>
      </body>
    </html>
  );
}
