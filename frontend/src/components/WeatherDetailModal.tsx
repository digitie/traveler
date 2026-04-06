"use client";

import { useEffect, useState } from "react";
import {
  WeatherHourly,
  WeatherPointDetail,
  fetchWeatherPointDetail,
} from "@/lib/api";

interface Props {
  nx: number;
  ny: number;
  onClose: () => void;
}

function fmtTime(t: string): string {
  if (!t || t.length < 4) return t;
  return `${t.slice(0, 2)}:${t.slice(2, 4)}`;
}

function fmtDate(d: string): string {
  if (!d || d.length < 8) return d;
  return `${d.slice(4, 6)}/${d.slice(6, 8)}`;
}

function skyEmoji(h: WeatherHourly): string {
  if (h.pty && h.pty !== "0") {
    if (h.pty === "3") return "🌨";
    return "🌧";
  }
  if (h.sky === "1") return "☀️";
  if (h.sky === "3") return "⛅";
  if (h.sky === "4") return "☁️";
  return "🌤";
}

export default function WeatherDetailModal({ nx, ny, onClose }: Props) {
  const [data, setData] = useState<WeatherPointDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchWeatherPointDetail(nx, ny)
      .then(setData)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [nx, ny]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal weather-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="loading">불러오는 중...</div>
        ) : error || !data ? (
          <div className="error">{error || "데이터를 불러올 수 없습니다"}</div>
        ) : (
          <>
            <h3>🌤 {data.name} 날씨</h3>

            {data.current && (
              <div className="weather-current">
                <div className="weather-current-temp">
                  {data.current.temperature != null
                    ? `${data.current.temperature.toFixed(0)}°C`
                    : "—"}
                </div>
                <div className="weather-current-meta">
                  <div>
                    {skyEmoji(data.current as WeatherHourly)}{" "}
                    {data.current.sky_label || "—"}
                  </div>
                  <div>
                    💧 습도{" "}
                    {data.current.humidity != null
                      ? `${data.current.humidity}%`
                      : "—"}
                  </div>
                  <div>
                    🌬 바람{" "}
                    {data.current.wind_speed != null
                      ? `${data.current.wind_speed}m/s`
                      : "—"}
                  </div>
                  {data.current.pty && data.current.pty !== "0" && (
                    <div>☔ {data.current.pty_label}</div>
                  )}
                </div>
              </div>
            )}

            {data.ultra_short_forecast.length > 0 && (
              <div className="weather-section">
                <h4>초단기 예보 (1시간 단위)</h4>
                <div className="weather-strip">
                  {data.ultra_short_forecast.slice(0, 6).map((h, i) => (
                    <div key={i} className="weather-strip-cell">
                      <div className="cell-time">{fmtTime(h.fcst_time)}</div>
                      <div className="cell-emoji">{skyEmoji(h)}</div>
                      <div className="cell-temp">
                        {h.temperature != null
                          ? `${h.temperature.toFixed(0)}°`
                          : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.short_forecast.length > 0 && (
              <div className="weather-section">
                <h4>단기 예보 (3일)</h4>
                <div className="weather-table-wrap">
                  <table className="weather-table">
                    <thead>
                      <tr>
                        <th>날짜</th>
                        <th>시각</th>
                        <th>날씨</th>
                        <th>기온</th>
                        <th>강수확률</th>
                        <th>습도</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.short_forecast.slice(0, 30).map((h, i) => (
                        <tr key={i}>
                          <td>{fmtDate(h.fcst_date)}</td>
                          <td>{fmtTime(h.fcst_time)}</td>
                          <td>
                            {skyEmoji(h)} {h.sky_label || ""}
                            {h.pty && h.pty !== "0" ? ` ${h.pty_label}` : ""}
                          </td>
                          <td>
                            {h.temperature != null
                              ? `${h.temperature.toFixed(0)}°`
                              : "—"}
                          </td>
                          <td>
                            {h.rain_prob != null ? `${h.rain_prob}%` : "—"}
                          </td>
                          <td>
                            {h.humidity != null ? `${h.humidity}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
