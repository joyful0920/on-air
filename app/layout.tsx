import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n";
import Header from "./components/Header";
import BroadcastGuard from "./components/BroadcastGuard";

export const metadata: Metadata = {
  title: "OnAir",
  description: "あなたの締切を、ライブで / 당신의 마감, 라이브로",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen">
        <LocaleProvider>
          <Header />
          <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
          <BroadcastGuard />
        </LocaleProvider>
      </body>
    </html>
  );
}
