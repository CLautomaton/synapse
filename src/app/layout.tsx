import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react"
import Head from "next/head";


export const metadata: Metadata = {
  title: "CL Synapse",
  description: "Synapse by Curious Learning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Head>
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
