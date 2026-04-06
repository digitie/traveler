const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

// ============ Types ============

export interface User {
  id: number;
  email: string;
  name: string | null;
  is_active: boolean;
  is_admin: boolean;
  telegram_chat_id: string | null;
  telegram_enabled: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

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

export interface TravelPlan {
  id: number;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface TravelPlanSpot {
  id: number;
  plan_date: string | null;
  order: number;
  name: string;
  description: string | null;
  category: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  source: string | null;
  source_id: string | null;
}

export interface Accommodation {
  id: number;
  accommodation_name: string;
  category: string | null;
  sido: string | null;
  sigungu: string | null;
  road_address: string | null;
  jibun_address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  room_count: string | null;
  homepage: string | null;
  operating_hours: string | null;
  parking: string | null;
}

export interface AccommodationPlanRef {
  plan_id: number;
  plan_title: string;
  spot_id: number;
}

export interface AccommodationDetail extends Accommodation {
  public_memo: string;
  public_memo_updated_at: string | null;
  my_memo: string;
  my_plans: AccommodationPlanRef[];
}

export interface TravelPlanDetail extends TravelPlan {
  user_id: number;
  spots: TravelPlanSpot[];
}

// ============ Auth helpers ============

const TOKEN_KEY = "traveler_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ============ Auth API ============

export async function signup(
  email: string,
  password: string,
  name?: string
): Promise<TokenResponse> {
  return request<TokenResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function login(
  email: string,
  password: string
): Promise<TokenResponse> {
  // OAuth2 password form requires form-urlencoded
  const body = new URLSearchParams();
  body.append("username", email);
  body.append("password", password);
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Login failed");
  }
  return res.json();
}

export async function fetchMe(): Promise<User> {
  return request<User>("/api/auth/me");
}

export async function updateMe(data: {
  name?: string;
  telegram_chat_id?: string;
  telegram_enabled?: boolean;
}): Promise<User> {
  return request<User>("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function changePassword(data: {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}): Promise<void> {
  return request<void>("/api/auth/me/password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ============ Travel plans API ============

export async function fetchPlans(): Promise<TravelPlan[]> {
  return request<TravelPlan[]>("/api/plans/");
}

export async function fetchPlan(id: number): Promise<TravelPlanDetail> {
  return request<TravelPlanDetail>(`/api/plans/${id}`);
}

export async function createPlan(data: {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
}): Promise<TravelPlanDetail> {
  return request<TravelPlanDetail>("/api/plans/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePlan(
  id: number,
  data: Partial<{
    title: string;
    description: string;
    start_date: string;
    end_date: string;
  }>
): Promise<TravelPlanDetail> {
  return request<TravelPlanDetail>(`/api/plans/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePlan(id: number): Promise<void> {
  return request<void>(`/api/plans/${id}`, { method: "DELETE" });
}

export async function addSpot(
  planId: number,
  spot: {
    name: string;
    latitude: number;
    longitude: number;
    description?: string;
    category?: string;
    address?: string;
    plan_date?: string;
    order?: number;
  }
): Promise<TravelPlanSpot> {
  return request<TravelPlanSpot>(`/api/plans/${planId}/spots`, {
    method: "POST",
    body: JSON.stringify(spot),
  });
}

export async function deleteSpot(
  planId: number,
  spotId: number
): Promise<void> {
  return request<void>(`/api/plans/${planId}/spots/${spotId}`, {
    method: "DELETE",
  });
}

// ============ Admin API ============

export async function fetchUsers(): Promise<User[]> {
  return request<User[]>("/api/admin/users");
}

export async function updateUser(
  id: number,
  data: { is_active?: boolean; is_admin?: boolean }
): Promise<User> {
  return request<User>(`/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: number): Promise<void> {
  return request<void>(`/api/admin/users/${id}`, { method: "DELETE" });
}

// ============ Tourism (accommodations) API ============

export async function fetchAccommodationsInBounds(bounds: {
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
  limit?: number;
}): Promise<Accommodation[]> {
  const params = new URLSearchParams({
    sw_lat: String(bounds.sw_lat),
    sw_lng: String(bounds.sw_lng),
    ne_lat: String(bounds.ne_lat),
    ne_lng: String(bounds.ne_lng),
    limit: String(bounds.limit ?? 500),
  });
  return request<Accommodation[]>(`/api/tourism/accommodations?${params}`);
}

export async function fetchAccommodationDetail(
  id: number
): Promise<AccommodationDetail> {
  return request<AccommodationDetail>(`/api/tourism/accommodations/${id}`);
}

export async function updateAccommodationPublicMemo(
  id: number,
  content: string
): Promise<void> {
  return request<void>(`/api/tourism/accommodations/${id}/memo`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

export async function updateAccommodationMyMemo(
  id: number,
  content: string
): Promise<void> {
  return request<void>(`/api/tourism/accommodations/${id}/my-memo`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

// ============ Weather points API ============

export interface WeatherCurrent {
  temperature?: number | null;
  humidity?: number | null;
  wind_speed?: number | null;
  rain_1h?: number | null;
  pty?: string | null;
  pty_label?: string | null;
  sky?: string | null;
  sky_label?: string | null;
}

export interface WeatherHourly {
  fcst_date: string;
  fcst_time: string;
  temperature?: number | null;
  sky?: string | null;
  sky_label?: string | null;
  pty?: string | null;
  pty_label?: string | null;
  humidity?: number | null;
  wind_speed?: number | null;
  rain_1h?: string | null;
  rain_prob?: number | null;
  rain_amount?: string | null;
  temp_min?: number | null;
  temp_max?: number | null;
}

export interface WeatherPoint {
  name: string;
  lat: number;
  lng: number;
  nx: number;
  ny: number;
  current: WeatherCurrent | null;
  next_hours: WeatherHourly[];
  fetched_at: string;
}

export interface WeatherPointDetail extends WeatherPoint {
  ultra_short_forecast: WeatherHourly[];
  short_forecast: WeatherHourly[];
}

export async function fetchWeatherPoints(): Promise<WeatherPoint[]> {
  return request<WeatherPoint[]>("/api/weather/points");
}

export async function fetchWeatherPointDetail(
  nx: number,
  ny: number
): Promise<WeatherPointDetail> {
  return request<WeatherPointDetail>(`/api/weather/points/${nx}/${ny}/detail`);
}

// ============ Weather API ============

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
