"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import FloatingChatbot from "@/components/chatbot/FloatingChatbot";
import { usePathname } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Allow chatbot only on dashboard, operations, or admin routes
  const showChatbot =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/operations") ||
    pathname?.startsWith("/admin");

  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
        {showChatbot && <FloatingChatbot />}
      </body>
    </html>
  );
}