import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@next/third-parties/google"
import "./globals.css";
import Script from "next/script";
import localFont from 'next/font/local'

const Providers = dynamic(() => import("./providers"), {
  ssr: false,
});

const departureMono = localFont({
  src: './DepartureMono-Regular.woff2',
  display: 'swap',
  variable: "--departure-mono-font",
})

export const metadata: Metadata = {
  title: "ERPS - Wager your $MON on Encrypted RPS",
  description:
    "A provably fair version of Rock-Paper-Scissors built with Gateway's GVM architecture on Monad. Wager your $MON and climb the leaderboard!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={departureMono.className}>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
        <GoogleAnalytics gaId="G-X0FKGJF5VW" />
        <Script id="hotjar">
          {`(function(h,o,t,j,a,r){
              h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
              h._hjSettings={hjid:5328842,hjsv:6};
              a=o.getElementsByTagName('head')[0];
              r=o.createElement('script');r.async=1;
              r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
              a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`}
        </Script>
      </body>
    </html>
  );
}
