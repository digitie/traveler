"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { changePassword, updateMe } from "@/lib/api";

interface Props {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: Props) {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [chatId, setChatId] = useState(user?.telegram_chat_id || "");
  const [tgEnabled, setTgEnabled] = useState(user?.telegram_enabled ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // password change state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  if (!user) return null;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const updated = await updateMe({
        name,
        telegram_chat_id: chatId,
        telegram_enabled: tgEnabled,
      });
      setUser(updated);
      setSaved(true);
    } catch (err: any) {
      setError(err.message || "저장 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSaved(false);
    if (newPw !== newPwConfirm) {
      setPwError("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (newPw.length < 6) {
      setPwError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }
    setPwSubmitting(true);
    try {
      await changePassword({
        current_password: currentPw,
        new_password: newPw,
        new_password_confirm: newPwConfirm,
      });
      setPwSaved(true);
      setCurrentPw("");
      setNewPw("");
      setNewPwConfirm("");
    } catch (err: any) {
      setPwError(err.message || "비밀번호 변경 실패");
    } finally {
      setPwSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal profile-modal" onClick={(e) => e.stopPropagation()}>
        <h3>프로필 설정</h3>

        <form onSubmit={handleProfileSubmit}>
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

          <fieldset className="profile-section">
            <legend>텔레그램 알림</legend>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={tgEnabled}
                onChange={(e) => setTgEnabled(e.target.checked)}
              />
              <span>텔레그램 알림 받기</span>
            </label>
            <label>
              텔레그램 chat_id
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="예: 123456789"
                disabled={!tgEnabled}
              />
            </label>
            <div className="hint-text">
              텔레그램에서 알림 봇에게 아무 메시지나 보내면 본인의 chat_id가
              회신됩니다. 그 값을 입력하면 여행 일정 알림 (D-7 ~ D-2) 과
              날씨 예보 (D-1 ~ 종료일) 를 받아볼 수 있어요.
            </div>
          </fieldset>

          {error && <div className="error">{error}</div>}
          {saved && <div className="success">저장되었습니다.</div>}
          <div className="modal-actions">
            <button
              type="submit"
              className="primary-btn"
              disabled={submitting}
            >
              {submitting ? "저장 중..." : "프로필 저장"}
            </button>
          </div>
        </form>

        <hr className="profile-divider" />

        <form onSubmit={handlePasswordSubmit}>
          <fieldset className="profile-section">
            <legend>비밀번호 변경</legend>
            <label>
              현재 비밀번호
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <label>
              새 비밀번호
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
            </label>
            <label>
              새 비밀번호 확인
              <input
                type="password"
                value={newPwConfirm}
                onChange={(e) => setNewPwConfirm(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
            </label>
          </fieldset>
          {pwError && <div className="error">{pwError}</div>}
          {pwSaved && <div className="success">비밀번호가 변경되었습니다.</div>}
          <div className="modal-actions">
            <button
              type="submit"
              className="primary-btn"
              disabled={pwSubmitting}
            >
              {pwSubmitting ? "변경 중..." : "비밀번호 변경"}
            </button>
          </div>
        </form>

        <div className="modal-actions" style={{ marginTop: 14 }}>
          <button type="button" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
