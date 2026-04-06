"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import ProfileModal from "./ProfileModal";

export default function AppHeader() {
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

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
            <button
              className="link-button"
              onClick={() => setShowProfile(true)}
            >
              {user.email}
            </button>
            <button onClick={logout}>로그아웃</button>
          </>
        )}
      </nav>
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </header>
  );
}
