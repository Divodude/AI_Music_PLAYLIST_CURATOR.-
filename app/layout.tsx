import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AI Music Playlist Generator | Create Custom Playlists with AI",
  description:
    "Generate personalized music playlists using AI. Simply describe your mood or activity, and get a curated playlist instantly. Discover new music tailored to your taste.",
  keywords:
    "AI music, playlist generator, custom playlists, music discovery, personalized music, AI DJ, music curation",
  authors: [{ name: "AI Playlist Generator" }],
  creator: "AI Playlist Generator",
  publisher: "AI Playlist Generator",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://your-domain.com",
    title: "AI Music Playlist Generator - Create Perfect Playlists",
    description:
      "Generate personalized music playlists using AI. Describe your mood and get instant curated playlists.",
    siteName: "AI Music Playlist Generator",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Music Playlist Generator",
    description:
      "Generate personalized music playlists using AI. Describe your mood and get instant curated playlists.",
    creator: "@yourhandle",
  },
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#9333ea",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1839917873699847"
          crossOrigin="anonymous"
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
