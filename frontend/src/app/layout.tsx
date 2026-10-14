import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OBEMIC | Outcome-Based Education Management",
  description: "Next-generation Academic Performance & Outcome-Based Education Management System.",
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable}`}>
        <Toaster position="top-right" toastOptions={{ style: { background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontWeight: 500 } }} />
        {children}
      </body>
    </html>
  );
}
