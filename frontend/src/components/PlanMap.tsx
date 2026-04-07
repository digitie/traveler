"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Map, MapMarker, CustomOverlayMap } from "react-kakao-maps-sdk";
import {
  Accommodation,
  TravelPlanDetail,
  TravelPlanSpot,
  WeatherPoint,
  addSpot,
  deleteSpot,
  fetchAccommodationsInBounds,
  fetchPlan,
  fetchWeatherPoints,
  updateSpot,
} from "@/lib/api";
import AppHeader from "./AppHeader";
import AccommodationDetailModal from "./AccommodationDetailModal";
import WeatherDetailModal from "./WeatherDetailModal";
import LayerPanel from "./LayerPanel";

interface Props {
  planId: number;
}

interface PendingPoi {
  lat: number;
  lng: number;
}

export default function PlanMap({ planId }: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState<TravelPlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingPoi, setPendingPoi] = useState<PendingPoi | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<TravelPlanSpot | null>(null);
  const [poiForm, setPoiForm] = useState({
    name: "",
    description: "",
    category: "",
    plan_date: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [mobileLayerOpen, setMobileLayerOpen] = useState(false);

  // accommodation overlay state
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [showAccommodations, setShowAccommodations] = useState(true);
  const [selectedAcc, setSelectedAcc] = useState<Accommodation | null>(null);
  const [detailAccId, setDetailAccId] = useState<number | null>(null);

  // weather marker state
  const [weatherPoints, setWeatherPoints] = useState<WeatherPoint[]>([]);
  const [weatherDetail, setWeatherDetail] = useState<{
    nx: number;
    ny: number;
  } | null>(null);

  useEffect(() => {
    fetchWeatherPoints()
      .then(setWeatherPoints)
      .catch((e) => console.warn("weather points load failed", e));
    // 30분마다 갱신
    const id = setInterval(() => {
      fetchWeatherPoints()
        .then(setWeatherPoints)
        .catch(() => {});
    }, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const load = async (initial: boolean = false) => {
    if (initial) setLoading(true);
    try {
      const data = await fetchPlan(planId);
      setPlan(data);
      if (!poiForm.plan_date) {
        setPoiForm((f) => ({ ...f, plan_date: data.start_date }));
      }
      if (!selectedDate) {
        setSelectedDate(data.start_date);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (initial) setLoading(false);
    }
  };

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  // 어떤 숙소가 현재 plan 의 spot 으로 추가되어 있는지 빠른 조회용 map
  const accSpotByAccId = useMemo(() => {
    const m = new Map<string, TravelPlanSpot>();
    if (!plan) return m;
    for (const s of plan.spots) {
      if (s.source === "accommodation" && s.source_id) {
        m.set(s.source_id, s);
      }
    }
    return m;
  }, [plan]);

  const loadAccommodationsForBounds = async (map: kakao.maps.Map) => {
    if (!showAccommodations) return;
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    try {
      const data = await fetchAccommodationsInBounds({
        sw_lat: sw.getLat(),
        sw_lng: sw.getLng(),
        ne_lat: ne.getLat(),
        ne_lng: ne.getLng(),
        limit: 500,
      });
      setAccommodations(data);
    } catch (e: any) {
      // 조용히 무시 (지도 이동 중 오류 가능)
      console.warn("accommodation load failed", e);
    }
  };

  const handleRightClick = (
    _map: kakao.maps.Map,
    mouseEvent: kakao.maps.event.MouseEvent
  ) => {
    const latlng = mouseEvent.latLng;
    setPendingPoi({ lat: latlng.getLat(), lng: latlng.getLng() });
    setSelectedSpot(null);
    setSelectedAcc(null);
  };

  const handleAddPoi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPoi || !plan) return;
    if (!poiForm.name.trim()) {
      setError("장소명을 입력해주세요");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await addSpot(plan.id, {
        name: poiForm.name,
        latitude: pendingPoi.lat,
        longitude: pendingPoi.lng,
        description: poiForm.description || undefined,
        category: poiForm.category || undefined,
        plan_date: poiForm.plan_date || selectedDate || undefined,
      });
      setPendingPoi(null);
      setPoiForm({
        name: "",
        description: "",
        category: "",
        plan_date: selectedDate || plan.start_date,
      });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSpot = async (spotId: number) => {
    if (!plan) return;
    if (!confirm("이 장소를 삭제하시겠습니까?")) return;
    try {
      await deleteSpot(plan.id, spotId);
      setSelectedSpot(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRenameSpot = async (spotId: number, name: string) => {
    if (!plan) return;
    await updateSpot(plan.id, spotId, { name });
    await load();
  };

  const handleMoveSpot = async (
    spotId: number,
    targetDate: string | null,
    targetOrder: number
  ) => {
    if (!plan) return;
    await updateSpot(plan.id, spotId, {
      plan_date: targetDate,
      order: targetOrder,
    });
    await load();
  };

  const handleCopySpot = async (spotId: number, targetDate: string | null) => {
    if (!plan) return;
    const src = plan.spots.find((s) => s.id === spotId);
    if (!src) return;
    await addSpot(plan.id, {
      name: src.name,
      latitude: src.latitude,
      longitude: src.longitude,
      description: src.description || undefined,
      category: src.category || undefined,
      address: src.address || undefined,
      plan_date: targetDate || undefined,
    });
    await load();
  };

  const handleLayerDeleteSpot = async (spotId: number) => {
    if (!plan) return;
    await deleteSpot(plan.id, spotId);
    await load();
  };

  const handleAddAccommodationToPlan = async (acc: Accommodation) => {
    if (!plan || acc.latitude == null || acc.longitude == null) return;
    try {
      await addSpot(plan.id, {
        name: acc.accommodation_name,
        latitude: acc.latitude,
        longitude: acc.longitude,
        category: acc.category || "숙박",
        address: acc.road_address || acc.jibun_address || undefined,
        source: "accommodation",
        source_id: String(acc.id),
        plan_date: poiForm.plan_date || plan.start_date,
      });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRemoveAccommodationFromPlan = async (acc: Accommodation) => {
    if (!plan) return;
    const existing = accSpotByAccId.get(String(acc.id));
    if (!existing) return;
    if (!confirm(`${acc.accommodation_name} 을(를) 일정에서 삭제할까요?`)) return;
    try {
      await deleteSpot(plan.id, existing.id);
      setSelectedAcc(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <div className="page-loading">불러오는 중...</div>;
  if (!plan) return <div className="page-loading">계획을 찾을 수 없습니다</div>;

  // 지도 중심: 첫 spot 또는 한국 중심
  const center =
    plan.spots.length > 0
      ? { lat: plan.spots[0].latitude, lng: plan.spots[0].longitude }
      : { lat: 36.5, lng: 127.5 };

  // 날짜 옵션
  const dateOptions: string[] = [];
  const start = new Date(plan.start_date);
  const end = new Date(plan.end_date);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dateOptions.push(d.toISOString().slice(0, 10));
  }

  return (
    <div className="container">
      <AppHeader />
      <div className="plan-detail-bar">
        <button
          className="layer-toggle-mobile"
          onClick={() => setMobileLayerOpen(true)}
          aria-label="레이어 열기"
        >
          ☰
        </button>
        <button onClick={() => router.push("/plans")}>← 목록</button>
        <div className="plan-detail-title">
          <strong>{plan.title}</strong>
          <span className="plan-detail-dates">
            {plan.start_date} ~ {plan.end_date}
          </span>
        </div>
        <label className="toggle-inline">
          <input
            type="checkbox"
            checked={showAccommodations}
            onChange={(e) => setShowAccommodations(e.target.checked)}
          />
          숙소 표시
        </label>
        <div className="plan-detail-hint">
          지도 우클릭 → 장소 추가 ({plan.spots.length}개 장소)
        </div>
      </div>

      <div className="map-container">
        {/* 좌측 레이어 패널 (PC: 항상, 모바일: 드로어) */}
        <aside
          className={`layer-sidebar ${mobileLayerOpen ? "mobile-open" : ""}`}
        >
          <LayerPanel
            plan={plan}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onSpotClick={(s) => {
              setSelectedSpot(s);
              setSelectedAcc(null);
            }}
            onRenameSpot={handleRenameSpot}
            onMoveSpot={handleMoveSpot}
            onCopySpot={handleCopySpot}
            onDeleteSpot={handleLayerDeleteSpot}
            onLayerWeatherChanged={load}
            closeMobile={() => setMobileLayerOpen(false)}
          />
        </aside>
        {mobileLayerOpen && (
          <div
            className="layer-backdrop"
            onClick={() => setMobileLayerOpen(false)}
          />
        )}

        <div className="map-area">
          <Map
            center={center}
            level={9}
            style={{ width: "100%", height: "100%" }}
            onRightClick={handleRightClick}
            onCreate={loadAccommodationsForBounds}
            onIdle={loadAccommodationsForBounds}
          >
            {/* 사용자 spot 마커 */}
            {plan.spots.map((s) => (
              <MapMarker
                key={`spot-${s.id}`}
                position={{ lat: s.latitude, lng: s.longitude }}
                onClick={() => {
                  setSelectedSpot(s);
                  setSelectedAcc(null);
                }}
              />
            ))}

            {/* 숙박 데이터셋 마커 */}
            {showAccommodations &&
              accommodations.map((a) =>
                a.latitude != null && a.longitude != null ? (
                  <MapMarker
                    key={`acc-${a.id}`}
                    position={{ lat: a.latitude, lng: a.longitude }}
                    image={{
                      src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
                      size: { width: 24, height: 35 },
                    }}
                    onClick={() => {
                      setSelectedAcc(a);
                      setSelectedSpot(null);
                    }}
                  />
                ) : null
              )}

            {/* 날씨 마커 (항상 표시) */}
            {weatherPoints.map((wp) => {
              const cur = wp.current;
              const next = wp.next_hours[0];
              const pty = cur?.pty || next?.pty || "0";
              const sky = cur?.sky || next?.sky || "1";
              const emoji =
                pty && pty !== "0"
                  ? pty === "3"
                    ? "🌨"
                    : "🌧"
                  : sky === "1"
                    ? "☀️"
                    : sky === "3"
                      ? "⛅"
                      : sky === "4"
                        ? "☁️"
                        : "🌤";
              return (
                <CustomOverlayMap
                  key={`wx-${wp.nx}-${wp.ny}`}
                  position={{ lat: wp.lat, lng: wp.lng }}
                  yAnchor={1}
                  zIndex={10}
                >
                  <div
                    className="weather-marker"
                    onClick={() =>
                      setWeatherDetail({ nx: wp.nx, ny: wp.ny })
                    }
                  >
                    <div className="wx-emoji">{emoji}</div>
                    <div className="wx-text">
                      <div className="wx-name">{wp.name}</div>
                      <div className="wx-temp">
                        {cur?.temperature != null
                          ? `${cur.temperature.toFixed(0)}°`
                          : next?.temperature != null
                            ? `${next.temperature.toFixed(0)}°`
                            : "—"}
                      </div>
                      {wp.next_hours.length > 0 && (
                        <div className="wx-next">
                          1h{" "}
                          {wp.next_hours[0]?.temperature != null
                            ? `${wp.next_hours[0].temperature.toFixed(0)}°`
                            : "—"}
                        </div>
                      )}
                    </div>
                  </div>
                </CustomOverlayMap>
              );
            })}

            {selectedSpot && (
              <CustomOverlayMap
                position={{
                  lat: selectedSpot.latitude,
                  lng: selectedSpot.longitude,
                }}
                yAnchor={1.3}
              >
                <div className="info-overlay">
                  <div className="info-title">{selectedSpot.name}</div>
                  {selectedSpot.plan_date && (
                    <div className="info-meta">📅 {selectedSpot.plan_date}</div>
                  )}
                  {selectedSpot.category && (
                    <div className="info-meta">🏷 {selectedSpot.category}</div>
                  )}
                  {selectedSpot.description && (
                    <div className="info-desc">{selectedSpot.description}</div>
                  )}
                  <div className="info-actions">
                    <button onClick={() => handleDeleteSpot(selectedSpot.id)}>
                      삭제
                    </button>
                    <button onClick={() => setSelectedSpot(null)}>닫기</button>
                  </div>
                </div>
              </CustomOverlayMap>
            )}

            {selectedAcc &&
              selectedAcc.latitude != null &&
              selectedAcc.longitude != null && (
                <CustomOverlayMap
                  position={{
                    lat: selectedAcc.latitude,
                    lng: selectedAcc.longitude,
                  }}
                  yAnchor={1.3}
                >
                  <div className="info-overlay">
                    <div className="info-title">
                      🏨 {selectedAcc.accommodation_name}
                    </div>
                    {selectedAcc.category && (
                      <div className="info-meta">🏷 {selectedAcc.category}</div>
                    )}
                    {(selectedAcc.road_address ||
                      selectedAcc.jibun_address) && (
                      <div className="info-meta">
                        📍{" "}
                        {selectedAcc.road_address || selectedAcc.jibun_address}
                      </div>
                    )}
                    {selectedAcc.phone && (
                      <div className="info-meta">📞 {selectedAcc.phone}</div>
                    )}
                    <div className="info-actions">
                      {accSpotByAccId.has(String(selectedAcc.id)) ? (
                        <button
                          onClick={() =>
                            handleRemoveAccommodationFromPlan(selectedAcc)
                          }
                        >
                          일정에서 삭제
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            handleAddAccommodationToPlan(selectedAcc)
                          }
                        >
                          여행목록에 추가
                        </button>
                      )}
                      <button onClick={() => setDetailAccId(selectedAcc.id)}>
                        상세보기
                      </button>
                      <button onClick={() => setSelectedAcc(null)}>닫기</button>
                    </div>
                  </div>
                </CustomOverlayMap>
              )}

            {pendingPoi && (
              <CustomOverlayMap
                position={{ lat: pendingPoi.lat, lng: pendingPoi.lng }}
                yAnchor={1.3}
              >
                <div className="poi-form">
                  <div className="info-title">새 장소 추가</div>
                  <form onSubmit={handleAddPoi}>
                    <input
                      type="text"
                      placeholder="장소명 *"
                      value={poiForm.name}
                      onChange={(e) =>
                        setPoiForm({ ...poiForm, name: e.target.value })
                      }
                      required
                      autoFocus
                    />
                    <select
                      value={poiForm.plan_date}
                      onChange={(e) =>
                        setPoiForm({ ...poiForm, plan_date: e.target.value })
                      }
                    >
                      <option value="">날짜 선택</option>
                      {dateOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="카테고리 (예: 식당, 관광)"
                      value={poiForm.category}
                      onChange={(e) =>
                        setPoiForm({ ...poiForm, category: e.target.value })
                      }
                    />
                    <textarea
                      placeholder="설명"
                      value={poiForm.description}
                      onChange={(e) =>
                        setPoiForm({
                          ...poiForm,
                          description: e.target.value,
                        })
                      }
                      rows={2}
                    />
                    {error && <div className="error">{error}</div>}
                    <div className="info-actions">
                      <button type="submit" disabled={submitting}>
                        {submitting ? "저장 중..." : "추가"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingPoi(null)}
                      >
                        취소
                      </button>
                    </div>
                  </form>
                </div>
              </CustomOverlayMap>
            )}
          </Map>
        </div>
      </div>

      {detailAccId !== null && (
        <AccommodationDetailModal
          accommodationId={detailAccId}
          onClose={() => setDetailAccId(null)}
        />
      )}

      {weatherDetail && (
        <WeatherDetailModal
          nx={weatherDetail.nx}
          ny={weatherDetail.ny}
          onClose={() => setWeatherDetail(null)}
        />
      )}
    </div>
  );
}
