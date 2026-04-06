"""
전국숙박정보 표준데이터 ETL DAG
https://www.data.go.kr/data/15021141/standard.do

- 월 트래픽 1000회 제한 (data.go.kr)
- 페이지당 최대 1000건 → 통상 1~3 호출로 전체 수집 가능
- 데이터셋이 월 1회 업데이트되므로 매월 1일 실행
"""

from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator
from sqlalchemy import text

from common import get_engine, fetch_all_pages, logger

API_URL = "https://api.odcloud.kr/api/15021141/v1/uddi:a0a0bea7-83a4-4b6e-8557-e4e7c8897fa3"

# 페이지당 최대치 (data.go.kr 허용 상한)
PER_PAGE = 1000
# 월 1000회 한도 — 한 달에 한 번만 실행하므로 여유있게 50회까지 허용
MONTHLY_REQUEST_BUDGET = 50

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS tourist_accommodations (
    id SERIAL PRIMARY KEY,
    management_number VARCHAR(100) UNIQUE,
    accommodation_name VARCHAR(200),
    category VARCHAR(100),
    sido VARCHAR(50),
    sigungu VARCHAR(50),
    road_address VARCHAR(500),
    jibun_address VARCHAR(500),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location GEOMETRY(POINT, 4326),
    phone VARCHAR(50),
    room_count VARCHAR(50),
    homepage VARCHAR(500),
    operating_hours VARCHAR(200),
    parking VARCHAR(200),
    data_reference_date VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tourist_accommodations_sido ON tourist_accommodations(sido);
CREATE INDEX IF NOT EXISTS idx_tourist_accommodations_name ON tourist_accommodations(accommodation_name);
"""

FIELD_MAP = {
    "관리번호": "management_number",
    "숙박시설명": "accommodation_name",
    "숙박시설구분": "category",
    "소재지도로명주소": "road_address",
    "소재지지번주소": "jibun_address",
    "위도": "latitude",
    "경도": "longitude",
    "숙박시설전화번호": "phone",
    "객실수": "room_count",
    "홈페이지주소": "homepage",
    "운영시간": "operating_hours",
    "주차시설": "parking",
    "데이터기준일자": "data_reference_date",
}


def _extract_sido(address: str | None) -> str | None:
    if not address:
        return None
    parts = address.strip().split()
    return parts[0] if parts else None


def _extract_sigungu(address: str | None) -> str | None:
    if not address:
        return None
    parts = address.strip().split()
    return parts[1] if len(parts) > 1 else None


def extract(**kwargs):
    data = fetch_all_pages(
        API_URL, max_requests=MONTHLY_REQUEST_BUDGET, per_page=PER_PAGE
    )
    kwargs["ti"].xcom_push(key="raw_data", value=data)
    logger.info(f"Extracted {len(data)} tourist accommodations")


def transform(**kwargs):
    raw_data = kwargs["ti"].xcom_pull(key="raw_data", task_ids="extract")
    transformed = []

    for row in raw_data:
        record = {}
        for api_field, db_field in FIELD_MAP.items():
            record[db_field] = row.get(api_field)

        addr = record.get("road_address") or record.get("jibun_address")
        record["sido"] = _extract_sido(addr)
        record["sigungu"] = _extract_sigungu(addr)

        try:
            if record.get("latitude"):
                record["latitude"] = float(record["latitude"])
            if record.get("longitude"):
                record["longitude"] = float(record["longitude"])
        except (ValueError, TypeError):
            record["latitude"] = None
            record["longitude"] = None

        transformed.append(record)

    kwargs["ti"].xcom_push(key="transformed_data", value=transformed)
    logger.info(f"Transformed {len(transformed)} tourist accommodations")


def load(**kwargs):
    transformed = kwargs["ti"].xcom_pull(
        key="transformed_data", task_ids="transform"
    )
    engine = get_engine()

    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        conn.execute(text(CREATE_TABLE_SQL))

        upsert_count = 0
        for record in transformed:
            mgmt_num = record.get("management_number")
            if not mgmt_num:
                continue

            lat = record.get("latitude")
            lng = record.get("longitude")
            location_wkt = (
                f"SRID=4326;POINT({lng} {lat})" if lat and lng else None
            )

            conn.execute(
                text("""
                    INSERT INTO tourist_accommodations
                        (management_number, accommodation_name, category, sido, sigungu,
                         road_address, jibun_address, latitude, longitude, location,
                         phone, room_count, homepage, operating_hours, parking,
                         data_reference_date, updated_at)
                    VALUES
                        (:management_number, :accommodation_name, :category, :sido, :sigungu,
                         :road_address, :jibun_address, :latitude, :longitude,
                         ST_GeomFromEWKT(:location),
                         :phone, :room_count, :homepage, :operating_hours, :parking,
                         :data_reference_date, NOW())
                    ON CONFLICT (management_number) DO UPDATE SET
                        accommodation_name = EXCLUDED.accommodation_name,
                        category = EXCLUDED.category,
                        sido = EXCLUDED.sido,
                        sigungu = EXCLUDED.sigungu,
                        road_address = EXCLUDED.road_address,
                        jibun_address = EXCLUDED.jibun_address,
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
                        location = EXCLUDED.location,
                        phone = EXCLUDED.phone,
                        room_count = EXCLUDED.room_count,
                        homepage = EXCLUDED.homepage,
                        operating_hours = EXCLUDED.operating_hours,
                        parking = EXCLUDED.parking,
                        data_reference_date = EXCLUDED.data_reference_date,
                        updated_at = NOW()
                """),
                {**record, "location": location_wkt},
            )
            upsert_count += 1

    logger.info(f"Loaded {upsert_count} tourist accommodations")


default_args = {
    "owner": "traveler",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    dag_id="etl_tourist_accommodations",
    default_args=default_args,
    description="전국숙박정보 표준데이터 ETL (월 1회)",
    schedule="0 4 1 * *",  # 매월 1일 새벽 4시
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["tourism", "etl", "data.go.kr", "monthly"],
) as dag:
    t_extract = PythonOperator(task_id="extract", python_callable=extract)
    t_transform = PythonOperator(task_id="transform", python_callable=transform)
    t_load = PythonOperator(task_id="load", python_callable=load)

    t_extract >> t_transform >> t_load
