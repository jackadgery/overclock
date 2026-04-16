import type { Metadata, Viewport } from "next";
import { NavBar } from "@/components/nav-bar";
import { SWRegister } from "@/components/sw-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "OVERCLOCK",
  description: "Access your mainframe. Life RPG system.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen">
        {children}
        <NavBar />
        <SWRegister />
      </body>
    </html>
  );
}
