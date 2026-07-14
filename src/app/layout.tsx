import type { Metadata } from "next";
import "./globals.css";
import { ToasterProvider } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Tailor Pro",
  description: "Modern tailor shop management system"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ToasterProvider>{children}</ToasterProvider>
      </body>
    </html>
  );
}
