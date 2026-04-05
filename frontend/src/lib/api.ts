const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

export interface WeatherForecast {
  id: number;
  base_date: string;
  base_time: string;
  fcst_date: string;
  fcst_time: string;
  nx: number;
  ny: number;
  category: string;
  fcst_value: string;
}

export interface RestAreaWeather {
  id: number;
  unit_code: string;
  unit_name: string;
  route_name: string | null;
  direction: string | null;
  weather: string | null;
  temperature: number | null;
  wind_speed: number | null;
  humidity: number | null;
  latitude: number | null;
  longitude: number | null;
  fetched_at: string;
}

export async function fetchWeatherForecast(
  nx: number,
  ny: number
): Promise<WeatherForecast[]> {
  const res = await fetch(`${API_BASE}/api/weather/forecast?nx=${nx}&ny=${ny}`);
  if (!res.ok) throw new Error("Failed to fetch weather forecast");
  return res.json();
}

export async function fetchRestAreaWeather(): Promise<RestAreaWeather[]> {
  const res = await fetch(`${API_BASE}/api/weather/rest-area`);
  if (!res.ok) throw new Error("Failed to fetch rest area weather");
  return res.json();
}

// 기상청 격자 좌표 변환 (위경도 -> 격자)
export function latLngToGrid(lat: number, lng: number) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;

  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn =
    Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
    Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx: x, ny: y };
}

// 카테고리 코드 한글 변환
export function getCategoryName(category: string): string {
  const map: Record<string, string> = {
    POP: "강수확률",
    PTY: "강수형태",
    PCP: "1시간 강수량",
    REH: "습도",
    SNO: "1시간 신적설",
    SKY: "하늘상태",
    TMP: "1시간 기온",
    TMN: "일 최저기온",
    TMX: "일 최고기온",
    UUU: "풍속(동서)",
    VVV: "풍속(남북)",
    WAV: "파고",
    VEC: "풍향",
    WSD: "풍속",
    T1H: "기온",
    RN1: "1시간 강수량",
    UUU_: "동서바람성분",
    VVV_: "남북바람성분",
  };
  return map[category] || category;
}

export function getSkyStatus(value: string): string {
  const map: Record<string, string> = {
    "1": "맑음",
    "3": "구름많음",
    "4": "흐림",
  };
  return map[value] || value;
}

export function getPtyStatus(value: string): string {
  const map: Record<string, string> = {
    "0": "없음",
    "1": "비",
    "2": "비/눈",
    "3": "눈",
    "4": "소나기",
  };
  return map[value] || value;
}
