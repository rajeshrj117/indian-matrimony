import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth-context";
import { I18nProvider } from "@/lib/i18n";
import AppRealtime from "@/components/AppRealtime";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "Indian Shaadi Matrimony — Better Matches, Brighter Futures",
  description: "Real people, real connections. Find your life partner.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Indian Shaadi Matrimony",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF3B6E",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-dvh overflow-hidden">
      <body className="h-dvh overflow-hidden">
        <ThemeProvider>
          <AuthProvider>
            <I18nProvider>
              <div id="recaptcha-container" />
              <AppRealtime />
              <PwaRegister />
              <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
                {children}
              </div>
            </I18nProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}