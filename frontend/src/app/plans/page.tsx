"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/lib/auth-context";
import {
  TravelPlan,
  fetchPlans,
  createPlan,
  updatePlan,
  deletePlan,
} from "@/lib/api";

interface PlanFormData {
  title: string;
  start_date: string;
  end_date: string;
  description: string;
}

const emptyForm: PlanFormData = {
  title: "",
  start_date: "",
  end_date: "",
  description: "",
};

export default function PlansPage() {
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PlanFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchPlans();
      setPlans(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (authLoading || !user) return <div className="page-loading">로딩 중...</div>;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (plan: TravelPlan) => {
    setEditingId(plan.id);
    setForm({
      title: plan.title,
      start_date: plan.start_date,
      end_date: plan.end_date,
      description: plan.description || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError("여행명은 필수입니다");
      return;
    }
    if (!form.start_date || !form.end_date) {
      setError("날짜는 필수입니다");
      return;
    }
    if (form.end_date < form.start_date) {
      setError("종료일은 시작일 이후여야 합니다");
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await updatePlan(editingId, {
          title: form.title,
          start_date: form.start_date,
          end_date: form.end_date,
          description: form.description,
        });
      } else {
        await createPlan({
          title: form.title,
          start_date: form.start_date,
          end_date: form.end_date,
          description: form.description || undefined,
        });
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 여행 계획을 삭제하시겠습니까?")) return;
    try {
      await deletePlan(id);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="container">
      <AppHeader />
      <main className="plans-main">
        <div className="plans-toolbar">
          <h2>내 여행계획</h2>
          <button className="primary-btn" onClick={openCreate}>
            + 새 여행계획
          </button>
        </div>

        {showForm && (
          <div className="modal-backdrop" onClick={() => setShowForm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>{editingId ? "여행계획 수정" : "새 여행계획"}</h3>
              <form onSubmit={handleSubmit}>
                <label>
                  여행명 *
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    required
                  />
                </label>
                <div className="form-row">
                  <label>
                    시작일 *
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) =>
                        setForm({ ...form, start_date: e.target.value })
                      }
                      required
                    />
                  </label>
                  <label>
                    종료일 *
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) =>
                        setForm({ ...form, end_date: e.target.value })
                      }
                      required
                    />
                  </label>
                </div>
                <label>
                  설명 (선택)
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={3}
                  />
                </label>
                {error && <div className="error">{error}</div>}
                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    disabled={submitting}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={submitting}
                  >
                    {submitting ? "저장 중..." : "저장"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading">불러오는 중...</div>
        ) : plans.length === 0 ? (
          <div className="empty">
            아직 여행계획이 없습니다. 새로 만들어보세요!
          </div>
        ) : (
          <ul className="plans-list">
            {plans.map((plan) => (
              <li key={plan.id} className="plan-card">
                <Link href={`/plans/${plan.id}`} className="plan-card-main">
                  <div className="plan-card-title">{plan.title}</div>
                  <div className="plan-card-dates">
                    {plan.start_date} ~ {plan.end_date}
                  </div>
                  {plan.description && (
                    <div className="plan-card-desc">{plan.description}</div>
                  )}
                </Link>
                <div className="plan-card-actions">
                  <button onClick={() => openEdit(plan)}>수정</button>
                  <button
                    className="danger-btn"
                    onClick={() => handleDelete(plan.id)}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
