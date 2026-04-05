import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Traveler - 여행 계획",
  description: "나만의 여행 계획을 세워보세요",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const kakaoApiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;
  return (
    <html lang="ko">
      <head>
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&autoload=false`}
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
