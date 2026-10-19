import type { Metadata } from "next";
import "./globals.css";
import { ToasterProvider } from "@/components/ui/toaster";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Tailor Pro",
  description: "Modern tailor shop management system"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale}>
          <ToasterProvider>{children}</ToasterProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
