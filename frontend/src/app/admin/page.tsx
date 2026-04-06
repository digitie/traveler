"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/lib/auth-context";
import { User, fetchUsers, updateUser, deleteUser } from "@/lib/api";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login");
      } else if (!user.is_admin) {
        router.replace("/plans");
      } else {
        load();
      }
    }
  }, [user, authLoading, router]);

  const handleToggleActive = async (u: User) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleToggleAdmin = async (u: User) => {
    try {
      await updateUser(u.id, { is_admin: !u.is_admin });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`사용자 ${u.email}을(를) 삭제하시겠습니까?`)) return;
    try {
      await deleteUser(u.id);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (authLoading || !user || !user.is_admin) {
    return <div className="page-loading">로딩 중...</div>;
  }

  return (
    <div className="container">
      <AppHeader />
      <main className="plans-main">
        <div className="plans-toolbar">
          <h2>사용자 관리</h2>
        </div>
        {error && <div className="error">{error}</div>}
        {loading ? (
          <div className="loading">불러오는 중...</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>이메일</th>
                  <th>이름</th>
                  <th>가입일</th>
                  <th>활성</th>
                  <th>관리자</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.email}</td>
                    <td>{u.name || "-"}</td>
                    <td>{u.created_at?.slice(0, 10)}</td>
                    <td>
                      <button
                        className={u.is_active ? "badge-on" : "badge-off"}
                        onClick={() => handleToggleActive(u)}
                        disabled={u.id === user.id}
                      >
                        {u.is_active ? "활성" : "비활성"}
                      </button>
                    </td>
                    <td>
                      <button
                        className={u.is_admin ? "badge-on" : "badge-off"}
                        onClick={() => handleToggleAdmin(u)}
                        disabled={u.id === user.id}
                      >
                        {u.is_admin ? "관리자" : "일반"}
                      </button>
                    </td>
                    <td>
                      <button
                        className="danger-btn"
                        onClick={() => handleDelete(u)}
                        disabled={u.id === user.id}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
