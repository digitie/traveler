# Traveler - 여행 계획 앱

구글 내지도와 유사한 여행 계획 웹 앱입니다.

## 기술 스택

- **Frontend**: Next.js 14 + React 18 + react-kakao-maps-sdk
- **Backend**: FastAPI + SQLAlchemy 2.0 + GeoAlchemy2 + Shapely
- **Database**: PostgreSQL 16 + PostGIS
- **ETL**: Apache Airflow 2.10 (SQLAlchemy 2.0 지원)
- **Infra**: Docker Compose (WSL2 / ODROID M1S ARM64 호환)

## 주요 기능

- 카카오 지도 기반 여행 계획 관리 (날짜별 장소 저장)
- 기상청 단기예보 API 실시간 날씨 표시
- 한국도로공사 휴게소별 날씨 마커 표시
- data.go.kr 표준데이터 자동 수집 (관광지, 식당, 숙박)
- PgAdmin 웹 기반 DB 관리

## 빠른 시작

```bash
# 1. 환경 변수 설정
cp .env.example .env
# .env 파일에서 API 키 설정

# 2. Docker 실행
docker compose up -d

# 3. 접속
# Frontend:  http://localhost:3000
# Backend:   http://localhost:8000/docs
# Airflow:   http://localhost:8080 (admin/admin)
# PgAdmin:   http://localhost:5050 (admin@traveler.local/admin_secret)
```

## 환경 변수

| 변수 | 설명 |
|------|------|
| `DATA_GO_KR_API_KEY` | data.go.kr API 인증키 |
| `DATA_EX_API_KEY` | data.ex.co.kr API 인증키 |
| `NEXT_PUBLIC_KAKAO_MAP_API_KEY` | 카카오 지도 JavaScript 앱키 |
| `POSTGRES_PASSWORD` | PostgreSQL 비밀번호 |

## 프로젝트 구조

```
traveler/
├── backend/          # FastAPI 백엔드
│   ├── app/
│   │   ├── models/   # SQLAlchemy 모델
│   │   ├── routers/  # API 라우터
│   │   ├── schemas/  # Pydantic 스키마
│   │   └── services/ # 외부 API 연동
│   └── alembic/      # DB 마이그레이션
├── frontend/         # Next.js 프론트엔드
│   └── src/
│       ├── app/       # 페이지
│       ├── components/# 컴포넌트
│       └── lib/       # 유틸리티
├── airflow/          # Airflow ETL
│   └── dags/         # DAG 정의
├── db/               # DB 초기화 스크립트
└── docker-compose.yml
```

## Airflow ETL DAGs

| DAG | 스케줄 | 데이터 |
|-----|--------|--------|
| `etl_tourist_spots` | 매일 03:00 | 전국관광지정보 |
| `etl_tourist_restaurants` | 매일 04:00 | 전국관광식당정보 |
| `etl_tourist_accommodations` | 매일 05:00 | 전국숙박정보 |

> data.go.kr 일일 트래픽 한도(1,000건)를 고려하여 DAG별 300건으로 분산 실행합니다.

## ARM64 지원 (ODROID M1S)

모든 Docker 이미지가 linux/arm64를 지원합니다:
- `postgis/postgis:16-3.4`
- `apache/airflow:2.10.4-python3.12`
- `node:20-slim`
- `python:3.12-slim`
- `dpage/pgadmin4`
