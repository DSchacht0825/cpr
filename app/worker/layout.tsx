import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "CPR Field Worker",
  description: "Community Property Rescue - Field Worker App",
  manifest: "/worker-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CPR Field",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0891b2",
};

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
