"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AccommodationDetail,
  fetchAccommodationDetail,
  updateAccommodationMyMemo,
  updateAccommodationPublicMemo,
} from "@/lib/api";

interface Props {
  accommodationId: number;
  onClose: () => void;
}

export default function AccommodationDetailModal({
  accommodationId,
  onClose,
}: Props) {
  const [data, setData] = useState<AccommodationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publicMemo, setPublicMemo] = useState("");
  const [myMemo, setMyMemo] = useState("");
  const [savingPub, setSavingPub] = useState(false);
  const [savingMine, setSavingMine] = useState(false);
  const [pubSaved, setPubSaved] = useState(false);
  const [mineSaved, setMineSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchAccommodationDetail(accommodationId);
      setData(d);
      setPublicMemo(d.public_memo || "");
      setMyMemo(d.my_memo || "");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accommodationId]);

  const handleSavePublic = async () => {
    setSavingPub(true);
    setPubSaved(false);
    try {
      await updateAccommodationPublicMemo(accommodationId, publicMemo);
      setPubSaved(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingPub(false);
    }
  };

  const handleSaveMine = async () => {
    setSavingMine(true);
    setMineSaved(false);
    try {
      await updateAccommodationMyMemo(accommodationId, myMemo);
      setMineSaved(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingMine(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal accommodation-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="loading">불러오는 중...</div>
        ) : !data ? (
          <div className="error">{error || "데이터를 불러올 수 없습니다"}</div>
        ) : (
          <>
            <h3>{data.accommodation_name}</h3>
            <div className="acc-meta">
              {data.category && <span className="badge">{data.category}</span>}
              {data.sido && (
                <span className="badge">
                  {data.sido} {data.sigungu || ""}
                </span>
              )}
            </div>

            <dl className="acc-info">
              {data.road_address && (
                <>
                  <dt>도로명</dt>
                  <dd>{data.road_address}</dd>
                </>
              )}
              {data.jibun_address && (
                <>
                  <dt>지번</dt>
                  <dd>{data.jibun_address}</dd>
                </>
              )}
              {data.phone && (
                <>
                  <dt>전화</dt>
                  <dd>{data.phone}</dd>
                </>
              )}
              {data.room_count && (
                <>
                  <dt>객실수</dt>
                  <dd>{data.room_count}</dd>
                </>
              )}
              {data.operating_hours && (
                <>
                  <dt>운영시간</dt>
                  <dd>{data.operating_hours}</dd>
                </>
              )}
              {data.parking && (
                <>
                  <dt>주차</dt>
                  <dd>{data.parking}</dd>
                </>
              )}
              {data.homepage && (
                <>
                  <dt>홈페이지</dt>
                  <dd>
                    <a
                      href={data.homepage}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {data.homepage}
                    </a>
                  </dd>
                </>
              )}
            </dl>

            {data.my_plans.length > 0 && (
              <div className="acc-section">
                <h4>내 여행계획에 포함됨</h4>
                <ul className="acc-plan-list">
                  {data.my_plans.map((p) => (
                    <li key={p.spot_id}>
                      <Link href={`/plans/${p.plan_id}`} onClick={onClose}>
                        🧳 {p.plan_title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="acc-section">
              <h4>공용 메모 (모두에게 공개)</h4>
              <textarea
                value={publicMemo}
                onChange={(e) => setPublicMemo(e.target.value)}
                rows={3}
                placeholder="다른 사용자에게도 보이는 메모입니다"
              />
              {data.public_memo_updated_at && (
                <div className="memo-meta">
                  최종 수정: {data.public_memo_updated_at.slice(0, 16).replace("T", " ")}
                </div>
              )}
              <div className="memo-actions">
                {pubSaved && <span className="success-inline">저장됨</span>}
                <button
                  className="primary-btn"
                  onClick={handleSavePublic}
                  disabled={savingPub}
                >
                  {savingPub ? "저장 중..." : "공용 메모 저장"}
                </button>
              </div>
            </div>

            <div className="acc-section">
              <h4>내 메모 (나만 보임)</h4>
              <textarea
                value={myMemo}
                onChange={(e) => setMyMemo(e.target.value)}
                rows={3}
                placeholder="개인 메모"
              />
              <div className="memo-actions">
                {mineSaved && <span className="success-inline">저장됨</span>}
                <button
                  className="primary-btn"
                  onClick={handleSaveMine}
                  disabled={savingMine}
                >
                  {savingMine ? "저장 중..." : "내 메모 저장"}
                </button>
              </div>
            </div>

            {error && <div className="error">{error}</div>}
          </>
        )}

        <div className="modal-actions" style={{ marginTop: 14 }}>
          <button type="button" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
