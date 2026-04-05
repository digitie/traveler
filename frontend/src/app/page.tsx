"use client";

import dynamic from "next/dynamic";

const KakaoMap = dynamic(() => import("@/components/KakaoMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontSize: "1.1rem",
        color: "#666",
      }}
    >
      지도를 불러오는 중...
    </div>
  ),
});

export default function Home() {
  return <KakaoMap />;
}
