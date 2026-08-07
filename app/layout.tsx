import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/shared/session-provider";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "I-CARe — IEP Review Assistant",
  description: "IEP Review Assistant for the CARe Program at Holy Child Jesus Montessori School of Dasmariñas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable}`}>
      <body className="antialiased bg-background text-foreground">
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </body>
    </html>
  );
}
