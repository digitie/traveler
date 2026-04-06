"""공통 유틸리티 및 DB 연결"""

import os
import time
import math
import logging

import requests
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get(
    "DATABASE_URL_SYNC",
    "postgresql://traveler:traveler_secret@db:5432/traveler_db",
)
DATA_GO_KR_API_KEY = os.environ.get("DATA_GO_KR_API_KEY", "")

# 일일 트래픽 한도
DAILY_API_LIMIT = 1000
# DAG 3개가 나눠서 사용 (여유 두고 300씩)
PER_DAG_DAILY_LIMIT = 300
# 한 번 요청 시 최대 행 수
MAX_PER_PAGE = 500


def get_engine():
    return create_engine(DATABASE_URL)


def fetch_standard_data_page(
    api_url: str, page: int, per_page: int = MAX_PER_PAGE
) -> dict:
    """data.go.kr 표준데이터 API 1페이지 조회"""
    params = {
        "page": page,
        "perPage": per_page,
        "serviceKey": DATA_GO_KR_API_KEY,
        "returnType": "JSON",
    }
    resp = requests.get(api_url, params=params, timeout=60)
    resp.raise_for_status()
    return resp.json()


def fetch_all_pages(
    api_url: str,
    max_requests: int = PER_DAG_DAILY_LIMIT,
    per_page: int = MAX_PER_PAGE,
) -> list[dict]:
    """
    표준데이터를 페이지네이션하며 전부 가져오기.
    max_requests 제한을 두어 트래픽 한도 초과 방지.
    per_page 로 페이지당 행 수를 조정 가능 (최대 1000).
    """
    all_data = []
    page = 1

    # 첫 페이지로 전체 건수 파악
    result = fetch_standard_data_page(api_url, page=1, per_page=per_page)
    total_count = result.get("totalCount", result.get("matchCount", 0))
    items = result.get("data", [])
    all_data.extend(items)

    total_pages = math.ceil(total_count / per_page) if per_page else 1
    logger.info(f"Total records: {total_count}, Total pages: {total_pages}")

    # 남은 페이지 (최대 요청 수 제한)
    remaining_requests = min(total_pages - 1, max_requests - 1)
    for i in range(remaining_requests):
        page += 1
        time.sleep(0.5)  # rate limiting
        try:
            result = fetch_standard_data_page(api_url, page=page, per_page=per_page)
            items = result.get("data", [])
            if not items:
                break
            all_data.extend(items)
            logger.info(f"Page {page}/{total_pages}: fetched {len(items)} records")
        except Exception as e:
            logger.error(f"Error fetching page {page}: {e}")
            break

    logger.info(f"Total fetched: {len(all_data)} records")
    return all_data
