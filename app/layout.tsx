import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/AuthContext";
import { ToastProvider } from "../components/Toast";

export const metadata: Metadata = {
  title: "TourneyRadar | Chess Tournaments across India",
  description: "Find and register for chess tournaments across India. Connect with organizers, track your registrations, and never miss a tournament.",
  keywords: "chess tournaments, chess india, fide tournaments, chess events, tournament registration, indian chess, chess competition",
  authors: [{ name: "TourneyRadar" }],
  creator: "TourneyRadar",
  publisher: "TourneyRadar",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://tourneyradar.com",
    siteName: "TourneyRadar",
    title: "TourneyRadar",
    description: "Discover 500+ chess tournaments across India. Find FIDE-rated events, register online, and connect with organizers.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TourneyRadar - Chess Tournaments India",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tourney Radar - Chess Tournaments across India",
    description: "Find chess tournaments across India",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/logo.jpg",
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
  manifest: "/manifest.json",
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
        <meta name="theme-color" content="#6366f1" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
