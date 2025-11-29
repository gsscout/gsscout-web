import "./globals.css";
import { Inter, Roboto_Mono } from "next/font/google";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "GsScout",
  description: "Galatasaray taraftar scout platformu",
  icons: {
    icon: "/favicon.ico", // public/favicon.ico
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body
        className={`${inter.variable} ${robotoMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
