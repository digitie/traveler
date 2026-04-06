"use client";

import dynamic from "next/dynamic";
import { use } from "react";

const PlanMap = dynamic(() => import("@/components/PlanMap"), {
  ssr: false,
  loading: () => <div className="page-loading">지도를 불러오는 중...</div>,
});

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PlanMap planId={parseInt(id, 10)} />;
}
