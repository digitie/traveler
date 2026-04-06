"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <Link href="/plans" className="brand">
        <h1>Traveler</h1>
      </Link>
      <nav className="header-controls">
        <Link href="/plans">여행계획</Link>
        {user?.is_admin && <Link href="/admin">관리자</Link>}
        {user && (
          <>
            <span className="user-email">{user.email}</span>
            <button onClick={logout}>로그아웃</button>
          </>
        )}
      </nav>
    </header>
  );
}
