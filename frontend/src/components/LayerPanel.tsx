"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TravelPlanDetail,
  TravelPlanSpot,
  WeatherByCoord,
  fetchWeatherByCoord,
  setLayerWeatherSpot,
} from "@/lib/api";

interface Props {
  plan: TravelPlanDetail;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onSpotClick: (spot: TravelPlanSpot) => void;
  onRenameSpot: (spotId: number, name: string) => Promise<void>;
  onMoveSpot: (
    spotId: number,
    targetDate: string | null,
    targetOrder: number
  ) => Promise<void>;
  onCopySpot: (spotId: number, targetDate: string | null) => Promise<void>;
  onDeleteSpot: (spotId: number) => Promise<void>;
  onLayerWeatherChanged: () => void;
  closeMobile?: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  spot: TravelPlanSpot;
}

function skyEmoji(sky: string | null, pty: string | null): string {
  if (pty && pty !== "0") {
    if (pty === "3") return "🌨";
    return "🌧";
  }
  if (sky === "1") return "☀️";
  if (sky === "3") return "⛅";
  if (sky === "4") return "☁️";
  return "🌤";
}

function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export default function LayerPanel({
  plan,
  selectedDate,
  onSelectDate,
  onSpotClick,
  onRenameSpot,
  onMoveSpot,
  onCopySpot,
  onDeleteSpot,
  onLayerWeatherChanged,
  closeMobile,
}: Props) {
  const dates = useMemo(
    () => dateRange(plan.start_date, plan.end_date),
    [plan.start_date, plan.end_date]
  );

  // 그룹화: plan_date -> spots (order asc)
  const grouped = useMemo(() => {
    const map = new Map<string, TravelPlanSpot[]>();
    for (const d of dates) map.set(d, []);
    map.set("__none__", []);
    for (const s of plan.spots) {
      const k = s.plan_date || "__none__";
      const arr = map.get(k) || [];
      arr.push(s);
      map.set(k, arr);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => a.order - b.order || a.id - b.id);
    }
    return map;
  }, [plan.spots, dates]);

  const layerWeatherByDate = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const lw of plan.layer_weather) {
      m.set(lw.plan_date, lw.weather_spot_id);
    }
    return m;
  }, [plan.layer_weather]);

  // 각 날짜별 weather 캐시
  const [weatherByDate, setWeatherByDate] = useState<
    Map<string, WeatherByCoord | null>
  >(new Map());

  // 날씨 로드 (선택된 date 또는 펼쳐진 모든 date)
  useEffect(() => {
    const loadFor = async (d: string) => {
      const spots = grouped.get(d) || [];
      if (spots.length === 0) return;
      const refId = layerWeatherByDate.get(d);
      const refSpot = refId
        ? spots.find((s) => s.id === refId) || spots[0]
        : spots[0];
      if (!refSpot) return;
      try {
        const wx = await fetchWeatherByCoord(
          refSpot.latitude,
          refSpot.longitude,
          d
        );
        setWeatherByDate((prev) => {
          const next = new Map(prev);
          next.set(d, wx);
          return next;
        });
      } catch {
        // ignore
      }
    };
    for (const d of dates) {
      loadFor(d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, plan.layer_weather, plan.spots.length]);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<{
    date: string;
    index: number;
  } | null>(null);
  const [showCopySubmenu, setShowCopySubmenu] = useState(false);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);

  // 외부 클릭 시 컨텍스트 메뉴 닫기
  useEffect(() => {
    const close = () => {
      setContextMenu(null);
      setShowCopySubmenu(false);
      setShowMoveSubmenu(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const handleContextMenu = (
    e: React.MouseEvent,
    spot: TravelPlanSpot
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, spot });
    setShowCopySubmenu(false);
    setShowMoveSubmenu(false);
  };

  const startRename = (spot: TravelPlanSpot) => {
    setRenamingId(spot.id);
    setRenameValue(spot.name);
  };

  const commitRename = async () => {
    if (renamingId == null) return;
    const id = renamingId;
    const value = renameValue.trim();
    setRenamingId(null);
    if (!value) return;
    await onRenameSpot(id, value);
  };

  const handleSetWeatherRef = async (
    date: string,
    spotId: number
  ) => {
    try {
      await setLayerWeatherSpot(plan.id, date, spotId);
      onLayerWeatherChanged();
    } catch {
      // ignore
    }
  };

  // ----- Drag & Drop -----
  const handleDragStart = (e: React.DragEvent, spot: TravelPlanSpot) => {
    setDraggingId(spot.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(spot.id));
  };

  const handleDragOver = (
    e: React.DragEvent,
    date: string,
    index: number
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver({ date, index });
  };

  const handleDrop = async (
    e: React.DragEvent,
    date: string,
    index: number
  ) => {
    e.preventDefault();
    setDragOver(null);
    const id = Number(e.dataTransfer.getData("text/plain"));
    if (!id) return;
    setDraggingId(null);
    const targetDate = date === "__none__" ? null : date;
    await onMoveSpot(id, targetDate, index);
  };

  const handleListDrop = async (e: React.DragEvent, date: string) => {
    // 빈 영역에 드롭 -> 맨 끝에 추가
    if (dragOver?.date === date) return;
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("text/plain"));
    if (!id) return;
    setDraggingId(null);
    const targetDate = date === "__none__" ? null : date;
    const dest = grouped.get(date) || [];
    await onMoveSpot(id, targetDate, dest.length);
  };

  const renderLayer = (date: string, isNone: boolean = false) => {
    const spots = grouped.get(date) || [];
    const isSelected = selectedDate === date;
    const wx = weatherByDate.get(date) || null;
    const refId = layerWeatherByDate.get(date) ?? spots[0]?.id;
    const dayLabel = isNone
      ? "미지정"
      : `Day ${dates.indexOf(date) + 1}`;

    return (
      <div
        key={date}
        className={`layer-card ${isSelected ? "selected" : ""}`}
        onClick={() => {
          onSelectDate(date);
          closeMobile?.();
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleListDrop(e, date)}
      >
        <div className="layer-header">
          <div className="layer-title">
            <span className="layer-day">{dayLabel}</span>
            {!isNone && <span className="layer-date">{date}</span>}
          </div>
          <span className="layer-count">{spots.length}</span>
        </div>

        {!isNone && wx && (
          <div className="layer-weather">
            {wx.buckets.map((b) => (
              <div key={b.time} className="lwx-cell">
                <div className="lwx-label">{b.label}</div>
                <div className="lwx-emoji">
                  {skyEmoji(b.sky, b.pty)}
                </div>
                <div className="lwx-temp">
                  {b.temperature != null
                    ? `${b.temperature.toFixed(0)}°`
                    : "—"}
                </div>
              </div>
            ))}
          </div>
        )}

        {spots.length === 0 ? (
          <div className="empty-small">
            {isSelected
              ? "지도 우클릭으로 추가"
              : "이 레이어에 장소가 없음"}
          </div>
        ) : (
          <ul className="layer-spots">
            {spots.map((s, idx) => (
              <li
                key={s.id}
                className={`layer-spot ${draggingId === s.id ? "dragging" : ""} ${
                  dragOver?.date === date && dragOver.index === idx
                    ? "drag-over"
                    : ""
                }`}
                draggable={renamingId !== s.id}
                onDragStart={(e) => handleDragStart(e, s)}
                onDragOver={(e) => handleDragOver(e, date, idx)}
                onDrop={(e) => handleDrop(e, date, idx)}
                onContextMenu={(e) => handleContextMenu(e, s)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (renamingId !== s.id) onSpotClick(s);
                }}
              >
                <button
                  type="button"
                  className={`spot-wx-btn ${refId === s.id ? "active" : ""}`}
                  title="이 장소를 날씨 기준으로 설정"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetWeatherRef(date, s.id);
                  }}
                >
                  {refId === s.id ? "📍" : "🌤"}
                </button>
                {renamingId === s.id ? (
                  <input
                    className="spot-rename"
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="spot-name-text"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startRename(s);
                    }}
                  >
                    {s.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="layer-panel">
      <div className="layer-panel-header">
        <h3>여행 일정 레이어</h3>
        {closeMobile && (
          <button className="layer-close" onClick={closeMobile}>
            ✕
          </button>
        )}
      </div>
      <div className="layer-list">
        {dates.map((d) => renderLayer(d))}
        {(grouped.get("__none__") || []).length > 0 &&
          renderLayer("__none__", true)}
      </div>

      {contextMenu && (
        <div
          className="ctx-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              startRename(contextMenu.spot);
              setContextMenu(null);
            }}
          >
            ✏️ 이름 변경
          </button>
          <div className="ctx-menu-item-with-submenu">
            <button
              onClick={() => {
                setShowCopySubmenu((v) => !v);
                setShowMoveSubmenu(false);
              }}
            >
              📋 복사 ▶
            </button>
            {showCopySubmenu && (
              <div className="ctx-submenu">
                {dates.map((d) => (
                  <button
                    key={d}
                    onClick={async () => {
                      await onCopySpot(contextMenu.spot.id, d);
                      setContextMenu(null);
                    }}
                  >
                    Day {dates.indexOf(d) + 1} ({d})
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="ctx-menu-item-with-submenu">
            <button
              onClick={() => {
                setShowMoveSubmenu((v) => !v);
                setShowCopySubmenu(false);
              }}
            >
              ➡️ 이동 ▶
            </button>
            {showMoveSubmenu && (
              <div className="ctx-submenu">
                {dates.map((d) => (
                  <button
                    key={d}
                    onClick={async () => {
                      const target = grouped.get(d) || [];
                      await onMoveSpot(
                        contextMenu.spot.id,
                        d,
                        target.length
                      );
                      setContextMenu(null);
                    }}
                  >
                    Day {dates.indexOf(d) + 1} ({d})
                  </button>
                ))}
              </div>
            )}
          </div>
          <hr />
          <button
            className="danger"
            onClick={async () => {
              await onDeleteSpot(contextMenu.spot.id);
              setContextMenu(null);
            }}
          >
            🗑 삭제
          </button>
        </div>
      )}
    </div>
  );
}
