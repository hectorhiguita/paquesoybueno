import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toast } from "@/components/ui/Toast";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Santa Elena Platform",
  description: "Marketplace comunitario para Santa Elena, Medellín",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <OfflineBanner />
        <Navbar />
        {children}
        <Toast />
      </body>
    </html>
  );
}
