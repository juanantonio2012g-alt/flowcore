import type { Metadata } from "next";
import { Bodoni_Moda, Manrope } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

const fontSans = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
});

const fontSerif = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "OpenCore | Panel operativo",
  description: "Panel operativo claro y minimalista construido sobre OpenCore",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${fontSans.variable} ${fontSerif.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
