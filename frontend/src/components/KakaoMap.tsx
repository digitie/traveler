"use client";

import { useEffect, useState, useCallback } from "react";
import { Map, MapMarker, CustomOverlayMap } from "react-kakao-maps-sdk";
import {
  RestAreaWeather,
  WeatherForecast,
  fetchWeatherForecast,
  fetchRestAreaWeather,
  latLngToGrid,
  getCategoryName,
  getSkyStatus,
  getPtyStatus,
} from "@/lib/api";

interface WeatherSummary {
  temp?: string;
  sky?: string;
  pty?: string;
  pop?: string;
  reh?: string;
  wsd?: string;
}

function summarizeWeather(items: WeatherForecast[]): WeatherSummary {
  const summary: WeatherSummary = {};
  // 가장 가까운 시간의 데이터 사용
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}00`;
  const currentDate = now.toISOString().slice(0, 10).replace(/-/g, "");

  const relevant = items.filter(
    (i) => i.fcst_date >= currentDate
  );

  for (const item of relevant) {
    switch (item.category) {
      case "TMP":
      case "T1H":
        if (!summary.temp) summary.temp = item.fcst_value;
        break;
      case "SKY":
        if (!summary.sky) summary.sky = getSkyStatus(item.fcst_value);
        break;
      case "PTY":
        if (!summary.pty) summary.pty = getPtyStatus(item.fcst_value);
        break;
      case "POP":
        if (!summary.pop) summary.pop = item.fcst_value;
        break;
      case "REH":
        if (!summary.reh) summary.reh = item.fcst_value;
        break;
      case "WSD":
        if (!summary.wsd) summary.wsd = item.fcst_value;
        break;
    }
  }
  return summary;
}

export default function KakaoMap() {
  const [center, setCenter] = useState({ lat: 36.5, lng: 127.0 });
  const [level, setLevel] = useState(13);
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [restAreaWeather, setRestAreaWeather] = useState<RestAreaWeather[]>([]);
  const [restAreaLoading, setRestAreaLoading] = useState(false);
  const [selectedRestArea, setSelectedRestArea] =
    useState<RestAreaWeather | null>(null);
  const [showWeatherPanel, setShowWeatherPanel] = useState(false);
  const [showRestAreas, setShowRestAreas] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 36.5, lng: 127.0 });
  const [error, setError] = useState<string | null>(null);

  // 지도 중심 날씨 조회
  const loadCenterWeather = useCallback(async (lat: number, lng: number) => {
    setWeatherLoading(true);
    setError(null);
    try {
      const grid = latLngToGrid(lat, lng);
      const items = await fetchWeatherForecast(grid.nx, grid.ny);
      const summary = summarizeWeather(items);
      setWeather(summary);
      setShowWeatherPanel(true);
    } catch (e: any) {
      setError("날씨 정보를 불러오는데 실패했습니다.");
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // 휴게소 날씨 로드
  const loadRestAreaWeather = useCallback(async () => {
    setRestAreaLoading(true);
    try {
      const data = await fetchRestAreaWeather();
      setRestAreaWeather(data);
    } catch (e) {
      console.error("휴게소 날씨 로드 실패:", e);
    } finally {
      setRestAreaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRestAreaWeather();
  }, [loadRestAreaWeather]);

  return (
    <div className="container">
      <header className="header">
        <h1>Traveler</h1>
        <div className="header-controls">
          <button
            className={showRestAreas ? "active" : ""}
            onClick={() => setShowRestAreas(!showRestAreas)}
          >
            휴게소 날씨
          </button>
          <button onClick={() => loadCenterWeather(mapCenter.lat, mapCenter.lng)}>
            현재 위치 날씨
          </button>
        </div>
      </header>

      <div className="map-container">
        {showWeatherPanel && weather && (
          <div className="info-panel">
            <h3>날씨 정보</h3>
            {weatherLoading ? (
              <div className="loading">로딩 중...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : (
              <div>
                {weather.temp && (
                  <div className="weather-item">
                    <span className="label">기온</span>{" "}
                    <span className="value">{weather.temp}°C</span>
                  </div>
                )}
                {weather.sky && (
                  <div className="weather-item">
                    <span className="label">하늘</span>{" "}
                    <span className="value">{weather.sky}</span>
                  </div>
                )}
                {weather.pty && weather.pty !== "없음" && (
                  <div className="weather-item">
                    <span className="label">강수</span>{" "}
                    <span className="value">{weather.pty}</span>
                  </div>
                )}
                {weather.pop && (
                  <div className="weather-item">
                    <span className="label">강수확률</span>{" "}
                    <span className="value">{weather.pop}%</span>
                  </div>
                )}
                {weather.reh && (
                  <div className="weather-item">
                    <span className="label">습도</span>{" "}
                    <span className="value">{weather.reh}%</span>
                  </div>
                )}
                {weather.wsd && (
                  <div className="weather-item">
                    <span className="label">풍속</span>{" "}
                    <span className="value">{weather.wsd}m/s</span>
                  </div>
                )}
              </div>
            )}
            <button
              style={{
                marginTop: "10px",
                padding: "4px 10px",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
              onClick={() => setShowWeatherPanel(false)}
            >
              닫기
            </button>
          </div>
        )}

        <Map
          center={center}
          level={level}
          style={{ width: "100%", height: "100%" }}
          onCenterChanged={(map) => {
            const latlng = map.getCenter();
            setMapCenter({ lat: latlng.getLat(), lng: latlng.getLng() });
          }}
          onZoomChanged={(map) => setLevel(map.getLevel())}
        >
          {/* 휴게소 날씨 마커 */}
          {showRestAreas &&
            restAreaWeather
              .filter((ra) => ra.latitude && ra.longitude)
              .map((ra) => (
                <MapMarker
                  key={ra.id || ra.unit_code}
                  position={{ lat: ra.latitude!, lng: ra.longitude! }}
                  onClick={() => setSelectedRestArea(ra)}
                />
              ))}

          {/* 선택된 휴게소 인포윈도우 */}
          {selectedRestArea &&
            selectedRestArea.latitude &&
            selectedRestArea.longitude && (
              <CustomOverlayMap
                position={{
                  lat: selectedRestArea.latitude,
                  lng: selectedRestArea.longitude,
                }}
                yAnchor={1.3}
              >
                <div
                  style={{
                    background: "white",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    fontSize: "0.85rem",
                    minWidth: "180px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      marginBottom: "6px",
                      fontSize: "0.9rem",
                    }}
                  >
                    {selectedRestArea.unit_name}
                  </div>
                  {selectedRestArea.route_name && (
                    <div style={{ color: "#666", marginBottom: "4px" }}>
                      {selectedRestArea.route_name}{" "}
                      {selectedRestArea.direction}
                    </div>
                  )}
                  {selectedRestArea.weather && (
                    <div>날씨: {selectedRestArea.weather}</div>
                  )}
                  {selectedRestArea.temperature != null && (
                    <div>기온: {selectedRestArea.temperature}°C</div>
                  )}
                  {selectedRestArea.humidity != null && (
                    <div>습도: {selectedRestArea.humidity}%</div>
                  )}
                  {selectedRestArea.wind_speed != null && (
                    <div>풍속: {selectedRestArea.wind_speed}m/s</div>
                  )}
                  <button
                    style={{
                      marginTop: "6px",
                      padding: "2px 8px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      border: "1px solid #ccc",
                      borderRadius: "3px",
                      background: "#f5f5f5",
                    }}
                    onClick={() => setSelectedRestArea(null)}
                  >
                    닫기
                  </button>
                </div>
              </CustomOverlayMap>
            )}
        </Map>
      </div>
    </div>
  );
}
