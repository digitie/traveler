"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { updateMe } from "@/lib/api";

interface Props {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: Props) {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [chatId, setChatId] = useState(user?.telegram_chat_id || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const updated = await updateMe({
        name,
        telegram_chat_id: chatId,
      });
      setUser(updated);
      setSaved(true);
    } catch (err: any) {
      setError(err.message || "저장 실패");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>프로필 설정</h3>
        <form onSubmit={handleSubmit}>
          <label>
            이메일
            <input type="email" value={user.email} disabled />
          </label>
          <label>
            이름
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            텔레그램 chat_id
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="예: 123456789"
            />
          </label>
          <div className="hint-text">
            텔레그램에서 <b>@traveler 알림 봇</b>에게 아무 메시지나 보내면
            본인의 chat_id가 회신됩니다. 그 값을 위에 입력하면 여행 일정 알림
            (D-7 ~ D-2) 과 날씨 예보 (D-1 ~ 종료일) 를 받아볼 수 있어요.
          </div>
          {error && <div className="error">{error}</div>}
          {saved && <div className="success">저장되었습니다.</div>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={submitting}>
              닫기
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
  );
}
