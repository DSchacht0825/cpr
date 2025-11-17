import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Community Property Rescue",
  description: "Restoring hope & dignity in your housing crisis",
  manifest: "/manifest.json",
  themeColor: "#0891b2",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CPR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/cpr.png" />
        <link rel="apple-touch-icon" href="/cpr.png" />
      </head>
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
