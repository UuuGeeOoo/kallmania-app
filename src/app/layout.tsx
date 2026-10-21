import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kallmania — SBTS Group Task Management & Reporting",
  description:
    "Multi-team task management, KPI tracking & intelligent report consolidation for SBTS Group Global.",
  keywords: ["Kallmania", "SBTS Group", "BPO", "task management", "KPI", "reporting"],
  authors: [{ name: "SBTS Group" }],
  openGraph: {
    title: "Kallmania — SBTS Group",
    description: "Multi-team task management, KPI tracking & intelligent report consolidation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
