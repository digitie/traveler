"""
전국관광지정보 표준데이터 ETL DAG
https://www.data.go.kr/data/15013111/standard.do
"""

from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator
from sqlalchemy import text

from common import get_engine, fetch_all_pages, logger

API_URL = "https://api.odcloud.kr/api/15013111/v1/uddi:af564a01-cd73-4fb2-bc18-28e581b7272e"

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS tourist_spots (
    id SERIAL PRIMARY KEY,
    management_number VARCHAR(100) UNIQUE,
    spot_name VARCHAR(200),
    category VARCHAR(100),
    sido VARCHAR(50),
    sigungu VARCHAR(50),
    road_address VARCHAR(500),
    jibun_address VARCHAR(500),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location GEOMETRY(POINT, 4326),
    phone VARCHAR(50),
    homepage VARCHAR(500),
    description TEXT,
    operating_hours VARCHAR(200),
    parking VARCHAR(200),
    admission_fee VARCHAR(200),
    data_reference_date VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tourist_spots_sido ON tourist_spots(sido);
CREATE INDEX IF NOT EXISTS idx_tourist_spots_name ON tourist_spots(spot_name);
"""

# data.go.kr 표준데이터 필드 매핑 (API 응답 필드명 -> DB 컬럼명)
FIELD_MAP = {
    "관리번호": "management_number",
    "관광지명": "spot_name",
    "관광지구분": "category",
    "소재지도로명주소": "road_address",
    "소재지지번주소": "jibun_address",
    "위도": "latitude",
    "경도": "longitude",
    "관광지전화번호": "phone",
    "홈페이지주소": "homepage",
    "관광지소개": "description",
    "운영시간": "operating_hours",
    "주차시설": "parking",
    "입장료": "admission_fee",
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
    data = fetch_all_pages(API_URL)
    kwargs["ti"].xcom_push(key="raw_data", value=data)
    logger.info(f"Extracted {len(data)} tourist spots")


def transform(**kwargs):
    raw_data = kwargs["ti"].xcom_pull(key="raw_data", task_ids="extract")
    transformed = []

    for row in raw_data:
        record = {}
        for api_field, db_field in FIELD_MAP.items():
            record[db_field] = row.get(api_field)

        # 시도/시군구 추출
        addr = record.get("road_address") or record.get("jibun_address")
        record["sido"] = _extract_sido(addr)
        record["sigungu"] = _extract_sigungu(addr)

        # 위도/경도 변환
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
    logger.info(f"Transformed {len(transformed)} tourist spots")


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
                    INSERT INTO tourist_spots
                        (management_number, spot_name, category, sido, sigungu,
                         road_address, jibun_address, latitude, longitude, location,
                         phone, homepage, description, operating_hours, parking,
                         admission_fee, data_reference_date, updated_at)
                    VALUES
                        (:management_number, :spot_name, :category, :sido, :sigungu,
                         :road_address, :jibun_address, :latitude, :longitude,
                         ST_GeomFromEWKT(:location),
                         :phone, :homepage, :description, :operating_hours, :parking,
                         :admission_fee, :data_reference_date, NOW())
                    ON CONFLICT (management_number) DO UPDATE SET
                        spot_name = EXCLUDED.spot_name,
                        category = EXCLUDED.category,
                        sido = EXCLUDED.sido,
                        sigungu = EXCLUDED.sigungu,
                        road_address = EXCLUDED.road_address,
                        jibun_address = EXCLUDED.jibun_address,
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
                        location = EXCLUDED.location,
                        phone = EXCLUDED.phone,
                        homepage = EXCLUDED.homepage,
                        description = EXCLUDED.description,
                        operating_hours = EXCLUDED.operating_hours,
                        parking = EXCLUDED.parking,
                        admission_fee = EXCLUDED.admission_fee,
                        data_reference_date = EXCLUDED.data_reference_date,
                        updated_at = NOW()
                """),
                {**record, "location": location_wkt},
            )
            upsert_count += 1

    logger.info(f"Loaded {upsert_count} tourist spots")


default_args = {
    "owner": "traveler",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    dag_id="etl_tourist_spots",
    default_args=default_args,
    description="전국관광지정보 표준데이터 ETL",
    schedule="0 3 * * *",  # 매일 새벽 3시
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["tourism", "etl", "data.go.kr"],
) as dag:
    t_extract = PythonOperator(task_id="extract", python_callable=extract)
    t_transform = PythonOperator(task_id="transform", python_callable=transform)
    t_load = PythonOperator(task_id="load", python_callable=load)

    t_extract >> t_transform >> t_load
