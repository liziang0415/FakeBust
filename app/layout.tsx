import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FakeBuster",
  description: "Multilingual AI-powered fake news detector",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
