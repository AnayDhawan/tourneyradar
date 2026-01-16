import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/AuthContext";
import { ToastProvider } from "../components/Toast";
import { GoogleAnalytics } from '@next/third-parties/google';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.tourneyradar.com'),
  title: {
    default: "TourneyRadar | Find Chess Tournaments Worldwide",
    template: "%s | TourneyRadar"
  },
  description: "Discover over-the-board chess tournaments worldwide. Free, open-source platform aggregating 200+ FIDE-rated tournaments from Chess-Results. Interactive map, filters by country, date, and format.",
  keywords: [
    "chess tournaments",
    "FIDE tournaments", 
    "chess events",
    "over the board chess",
    "OTB chess",
    "chess competitions",
    "chess tournament finder",
    "chess tournament map",
    "classical chess",
    "rapid chess tournaments",
    "blitz chess tournaments",
    "chess-results",
    "find chess tournaments near me",
    "international chess tournaments",
    "chess tournament calendar"
  ],
  authors: [{ name: "TourneyRadar", url: "https://www.tourneyradar.com" }],
  creator: "TourneyRadar",
  publisher: "TourneyRadar",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.tourneyradar.com",
    siteName: "TourneyRadar",
    title: "TourneyRadar | Find Chess Tournaments Worldwide",
    description: "Discover over-the-board chess tournaments worldwide. Interactive map with 200+ tournaments from 40+ countries. Free and open-source.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TourneyRadar - Chess Tournament Finder"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "TourneyRadar | Find Chess Tournaments Worldwide",
    description: "Discover over-the-board chess tournaments worldwide. Interactive map with 200+ tournaments.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: 'https://www.tourneyradar.com',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        {/* Favicon links for maximum browser compatibility */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-96x96.png" type="image/png" sizes="96x96" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
