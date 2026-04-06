"""기상청 단기예보 및 한국도로공사 휴게소 날씨 데이터 서비스"""

from datetime import datetime, timedelta

import httpx
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.weather import WeatherForecast, RestAreaWeather

# 기상청 단기예보 API
VILAGE_FCST_URL = (
    "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
)
ULTRA_SRT_NCST_URL = (
    "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst"
)
ULTRA_SRT_FCST_URL = (
    "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst"
)

# 한국도로공사 휴게소 날씨
REST_AREA_WEATHER_URL = "https://data.ex.co.kr/openapi/restinfo/restWeatherList"


async def fetch_weather_forecast(
    nx: int, ny: int, base_date: str | None = None, base_time: str | None = None
) -> list[dict]:
    """기상청 단기예보 조회"""
    now = datetime.now()
    if base_date is None:
        base_date = now.strftime("%Y%m%d")
    if base_time is None:
        # 단기예보 발표 시각: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300
        hour = now.hour
        base_times = [2, 5, 8, 11, 14, 17, 20, 23]
        chosen = 23
        for bt in reversed(base_times):
            if hour >= bt:
                chosen = bt
                break
        base_time = f"{chosen:02d}00"

    params = {
        "serviceKey": settings.data_go_kr_api_key,
        "numOfRows": "1000",
        "pageNo": "1",
        "dataType": "JSON",
        "base_date": base_date,
        "base_time": base_time,
        "nx": str(nx),
        "ny": str(ny),
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(VILAGE_FCST_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    items = (
        data.get("response", {}).get("body", {}).get("items", {}).get("item", [])
    )
    return items


async def fetch_ultra_srt_ncst(
    nx: int, ny: int, base_date: str | None = None, base_time: str | None = None
) -> list[dict]:
    """기상청 초단기실황 조회"""
    now = datetime.now()
    if base_date is None:
        base_date = now.strftime("%Y%m%d")
    if base_time is None:
        base_time = f"{now.hour:02d}00"

    params = {
        "serviceKey": settings.data_go_kr_api_key,
        "numOfRows": "100",
        "pageNo": "1",
        "dataType": "JSON",
        "base_date": base_date,
        "base_time": base_time,
        "nx": str(nx),
        "ny": str(ny),
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(ULTRA_SRT_NCST_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    items = (
        data.get("response", {}).get("body", {}).get("items", {}).get("item", [])
    )
    return items


async def save_weather_forecasts(db: AsyncSession, items: list[dict]) -> int:
    """단기예보 데이터 DB 저장"""
    count = 0
    for item in items:
        forecast = WeatherForecast(
            base_date=item.get("baseDate", ""),
            base_time=item.get("baseTime", ""),
            fcst_date=item.get("fcstDate", ""),
            fcst_time=item.get("fcstTime", ""),
            nx=int(item.get("nx", 0)),
            ny=int(item.get("ny", 0)),
            category=item.get("category", ""),
            fcst_value=str(item.get("fcstValue", "")),
        )
        db.add(forecast)
        count += 1
    await db.commit()
    return count


async def fetch_ultra_srt_fcst(
    nx: int, ny: int, base_date: str | None = None, base_time: str | None = None
) -> list[dict]:
    """기상청 초단기예보 조회 (1시간 간격, 6시간 예보)."""
    now = datetime.now()
    # 매시 45분 이후 발표. 그 이전이면 직전 시각.
    if base_time is None or base_date is None:
        ref = now if now.minute >= 45 else now - timedelta(hours=1)
        base_date = ref.strftime("%Y%m%d")
        base_time = f"{ref.hour:02d}30"

    params = {
        "serviceKey": settings.data_go_kr_api_key,
        "numOfRows": "200",
        "pageNo": "1",
        "dataType": "JSON",
        "base_date": base_date,
        "base_time": base_time,
        "nx": str(nx),
        "ny": str(ny),
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(ULTRA_SRT_FCST_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    return data.get("response", {}).get("body", {}).get("items", {}).get("item", [])


# ----- 카테고리 라벨 -----

SKY_LABEL = {"1": "맑음", "3": "구름많음", "4": "흐림"}
PTY_LABEL = {
    "0": "없음",
    "1": "비",
    "2": "비/눈",
    "3": "눈",
    "4": "소나기",
    "5": "빗방울",
    "6": "빗방울눈날림",
    "7": "눈날림",
}


def parse_ncst(items: list[dict]) -> dict:
    """초단기실황 → 현재 날씨 dict."""
    out: dict = {}
    for it in items:
        cat = it.get("category")
        val = it.get("obsrValue")
        if cat == "T1H":
            out["temperature"] = _safe_float(val)
        elif cat == "REH":
            out["humidity"] = _safe_float(val)
        elif cat == "RN1":
            out["rain_1h"] = _safe_float(val)
        elif cat == "WSD":
            out["wind_speed"] = _safe_float(val)
        elif cat == "PTY":
            out["pty"] = str(val)
            out["pty_label"] = PTY_LABEL.get(str(val), str(val))
    return out


def parse_ultra_fcst(items: list[dict]) -> list[dict]:
    """초단기예보 → 시각별 예보 list (정렬됨)."""
    bucket: dict[str, dict] = {}
    for it in items:
        key = f"{it.get('fcstDate', '')}{it.get('fcstTime', '')}"
        b = bucket.setdefault(
            key,
            {
                "fcst_date": it.get("fcstDate"),
                "fcst_time": it.get("fcstTime"),
            },
        )
        cat = it.get("category")
        val = it.get("fcstValue")
        if cat == "T1H":
            b["temperature"] = _safe_float(val)
        elif cat == "SKY":
            b["sky"] = str(val)
            b["sky_label"] = SKY_LABEL.get(str(val), str(val))
        elif cat == "PTY":
            b["pty"] = str(val)
            b["pty_label"] = PTY_LABEL.get(str(val), str(val))
        elif cat == "RN1":
            b["rain_1h"] = val
        elif cat == "REH":
            b["humidity"] = _safe_float(val)
        elif cat == "WSD":
            b["wind_speed"] = _safe_float(val)
    return [bucket[k] for k in sorted(bucket.keys())]


def parse_vilage_fcst(items: list[dict]) -> list[dict]:
    """단기예보 → 시각별 예보 list (정렬됨)."""
    bucket: dict[str, dict] = {}
    for it in items:
        key = f"{it.get('fcstDate', '')}{it.get('fcstTime', '')}"
        b = bucket.setdefault(
            key,
            {
                "fcst_date": it.get("fcstDate"),
                "fcst_time": it.get("fcstTime"),
            },
        )
        cat = it.get("category")
        val = it.get("fcstValue")
        if cat == "TMP":
            b["temperature"] = _safe_float(val)
        elif cat == "SKY":
            b["sky"] = str(val)
            b["sky_label"] = SKY_LABEL.get(str(val), str(val))
        elif cat == "PTY":
            b["pty"] = str(val)
            b["pty_label"] = PTY_LABEL.get(str(val), str(val))
        elif cat == "POP":
            b["rain_prob"] = _safe_float(val)
        elif cat == "PCP":
            b["rain_amount"] = val
        elif cat == "REH":
            b["humidity"] = _safe_float(val)
        elif cat == "WSD":
            b["wind_speed"] = _safe_float(val)
        elif cat == "TMN":
            b["temp_min"] = _safe_float(val)
        elif cat == "TMX":
            b["temp_max"] = _safe_float(val)
    return [bucket[k] for k in sorted(bucket.keys())]


async def fetch_rest_area_weather() -> list[dict]:
    """한국도로공사 휴게소별 날씨정보 조회"""
    params = {
        "key": settings.data_ex_api_key,
        "type": "json",
        "numOfRows": "200",
        "pageNo": "1",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(REST_AREA_WEATHER_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    items = data.get("list", [])
    return items


async def save_rest_area_weather(db: AsyncSession, items: list[dict]) -> int:
    """휴게소 날씨 데이터 DB 저장 (기존 데이터 교체)"""
    await db.execute(delete(RestAreaWeather))

    count = 0
    for item in items:
        lat = _safe_float(item.get("latitude"))
        lng = _safe_float(item.get("longitude"))

        weather = RestAreaWeather(
            unit_code=item.get("unitCode", ""),
            unit_name=item.get("unitName", ""),
            route_name=item.get("routeName"),
            direction=item.get("direction"),
            weather=item.get("weatherContents"),
            temperature=_safe_float(item.get("temperature")),
            wind_speed=_safe_float(item.get("windSpeed")),
            wind_direction=item.get("windDirection"),
            humidity=_safe_float(item.get("humidity")),
            rain_type=item.get("rainType"),
            latitude=lat,
            longitude=lng,
            location=f"SRID=4326;POINT({lng} {lat})" if lat and lng else None,
        )
        db.add(weather)
        count += 1
    await db.commit()
    return count


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None
