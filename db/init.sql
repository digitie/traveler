-- Airflow용 DB 생성
SELECT 'CREATE DATABASE airflow_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'airflow_db')\gexec

-- traveler_db에 PostGIS 확장 설치
\c traveler_db
CREATE EXTENSION IF NOT EXISTS postgis;
