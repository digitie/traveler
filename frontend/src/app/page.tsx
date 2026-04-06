"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/plans");
    else router.replace("/login");
  }, [user, loading, router]);

  return (
    <div className="page-loading">로딩 중...</div>
  );
}
