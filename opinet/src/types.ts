import type { ProductCode, BrandCode, SidoCode, SortOrder } from "./constants";

// ---------------------------------------------------------------------------
// Raw API response shapes (ALL_CAPS field names, all strings)
// ---------------------------------------------------------------------------

/** @internal */
export interface RawEnvelope<T> {
  RESULT: { OIL: T[] };
}

/** @internal */
export interface RawAvgAllPriceItem {
  TRADE_DT: string;
  PRODCD: string;
  PRODNM: string;
  PRICE: string;
  DIFF: string;
}

/** @internal */
export interface RawSidoPriceItem {
  SIDOCD: string;
  SIDONM: string;
  PRODCD: string;
  PRICE: string;
  DIFF: string;
}

/** @internal */
export interface RawSigunPriceItem {
  SIGUNCD: string;
  SIGUNNM: string;
  PRODCD: string;
  PRICE: string;
  DIFF: string;
}

/** @internal */
export interface RawAvgRecentPriceItem {
  DATE: string;
  PRODCD: string;
  PRICE: string;
}

/** @internal */
export interface RawPollAvgRecentPriceItem {
  DATE: string;
  PRODCD: string;
  POLL_DIV_CD: string;
  PRICE: string;
}

/** @internal */
export interface RawAreaAvgRecentPriceItem {
  DATE: string;
  AREA_CD: string;
  AREA_NM: string;
  PRODCD: string;
  PRICE: string;
}

/** @internal */
export interface RawAvgLastWeekItem {
  WEEK: string;
  STA_DT: string;
  END_DT: string;
  AREA_CD: string;
  PRODCD: string;
  PRICE: string;
}

/** @internal */
export interface RawLowTopItem {
  UNI_ID: string;
  PRICE: string;
  POLL_DIV_CD: string;
  OS_NM: string;
  VAN_ADR: string;
  NEW_ADR: string;
  GIS_X_COOR: string;
  GIS_Y_COOR: string;
}

/** @internal */
export interface RawAroundAllItem {
  UNI_ID: string;
  POLL_DIV_CD: string;
  OS_NM: string;
  PRICE: string;
  DISTANCE: string;
  GIS_X_COOR: string;
  GIS_Y_COOR: string;
}

/** @internal */
export interface RawOilPriceItem {
  PRODCD: string;
  PRICE: string;
  TRADE_DT: string;
  TRADE_TM: string;
}

/** @internal */
export interface RawDetailByIdItem {
  UNI_ID: string;
  POLL_DIV_CD: string;
  OS_NM: string;
  VAN_ADR: string;
  NEW_ADR: string;
  TEL: string;
  SIGUNCD: string;
  LPG_YN: string;
  MAINT_YN: string;
  CAR_WASH_YN: string;
  KPETRO_YN: string;
  CVS_YN: string;
  GIS_X_COOR: string;
  GIS_Y_COOR: string;
  OIL_PRICE: RawOilPriceItem[];
}

/** @internal */
export interface RawSearchByNameItem {
  UNI_ID: string;
  POLL_DIV_CD: string;
  OS_NM: string;
  NEW_ADR: string;
  SIGUNCD: string;
  GIS_X_COOR: string;
  GIS_Y_COOR: string;
}

/** @internal */
export interface RawUreaPriceItem {
  UNI_ID: string;
  OS_NM: string;
  ADRESS: string;
  TEL: string;
  GIS_X_COOR: string;
  GIS_Y_COOR: string;
  STOCK_YN: string;
  PRICE: string;
  TRADE_DT: string;
  TRADE_TM: string;
}

/** @internal */
export interface RawAreaCodeItem {
  AREA_CD: string;
  AREA_NM: string;
}

// ---------------------------------------------------------------------------
// User-facing types (camelCase, numbers parsed)
// ---------------------------------------------------------------------------

/** 전국 평균 유가 */
export interface AvgAllPriceItem {
  /** 거래일 (YYYYMMDD) */
  tradeDate: string;
  /** 유종 코드 */
  productCode: string;
  /** 유종명 */
  productName: string;
  /** 가격 (원/ℓ) */
  price: number;
  /** 전일 대비 가격 변동 */
  diff: number;
}

/** 시도별 평균 유가 */
export interface SidoPriceItem {
  /** 시도 코드 */
  sidoCode: string;
  /** 시도명 */
  sidoName: string;
  /** 유종 코드 */
  productCode: string;
  /** 가격 (원/ℓ) */
  price: number;
  /** 전일 대비 가격 변동 */
  diff: number;
}

/** 시군구별 평균 유가 */
export interface SigunPriceItem {
  /** 시군구 코드 */
  sigunCode: string;
  /** 시군구명 */
  sigunName: string;
  /** 유종 코드 */
  productCode: string;
  /** 가격 (원/ℓ) */
  price: number;
  /** 전일 대비 가격 변동 */
  diff: number;
}

/** 최근 7일 전국 일별 평균 유가 */
export interface AvgRecentPriceItem {
  /** 날짜 (YYYYMMDD) */
  date: string;
  /** 유종 코드 */
  productCode: string;
  /** 가격 (원/ℓ) */
  price: number;
}

/** 최근 7일 브랜드별 평균 유가 */
export interface PollAvgRecentPriceItem {
  /** 날짜 (YYYYMMDD) */
  date: string;
  /** 유종 코드 */
  productCode: string;
  /** 브랜드 코드 */
  brandCode: string;
  /** 가격 (원/ℓ) */
  price: number;
}

/** 최근 7일 지역별 평균 유가 */
export interface AreaAvgRecentPriceItem {
  /** 날짜 (YYYYMMDD) */
  date: string;
  /** 지역 코드 */
  areaCode: string;
  /** 지역명 */
  areaName: string;
  /** 유종 코드 */
  productCode: string;
  /** 가격 (원/ℓ) */
  price: number;
}

/** 주간 평균 유가 */
export interface AvgLastWeekItem {
  /** 주차 */
  week: string;
  /** 시작일 (YYYYMMDD) */
  startDate: string;
  /** 종료일 (YYYYMMDD) */
  endDate: string;
  /** 지역 코드 */
  areaCode: string;
  /** 유종 코드 */
  productCode: string;
  /** 가격 (원/ℓ) */
  price: number;
}

/** 최저가 주유소 */
export interface LowTopItem {
  /** 주유소 ID */
  stationId: string;
  /** 가격 (원/ℓ) */
  price: number;
  /** 브랜드 코드 */
  brandCode: string;
  /** 상호명 */
  name: string;
  /** 지번 주소 */
  address: string;
  /** 도로명 주소 */
  roadAddress: string;
  /** GIS X 좌표 (KATEC) */
  gisX: number;
  /** GIS Y 좌표 (KATEC) */
  gisY: number;
}

/** 반경 내 주유소 */
export interface AroundAllItem {
  /** 주유소 ID */
  stationId: string;
  /** 브랜드 코드 */
  brandCode: string;
  /** 상호명 */
  name: string;
  /** 가격 (원/ℓ) */
  price: number;
  /** 거리 (m) */
  distance: number;
  /** GIS X 좌표 (KATEC) */
  gisX: number;
  /** GIS Y 좌표 (KATEC) */
  gisY: number;
}

/** 개별 주유소의 유종별 현재 가격 */
export interface OilPriceItem {
  /** 유종 코드 */
  productCode: string;
  /** 가격 (원/ℓ) */
  price: number;
  /** 거래일 (YYYYMMDD) */
  tradeDate: string;
  /** 거래시각 (HHmm) */
  tradeTime: string;
}

/** 주유소 상세 정보 */
export interface StationDetail {
  /** 주유소 ID */
  stationId: string;
  /** 브랜드 코드 */
  brandCode: string;
  /** 상호명 */
  name: string;
  /** 지번 주소 */
  address: string;
  /** 도로명 주소 */
  roadAddress: string;
  /** 전화번호 */
  tel: string;
  /** 시군구 코드 */
  sigunCode: string;
  /** LPG 판매 여부 */
  hasLpg: boolean;
  /** 경정비 여부 */
  hasMaintenance: boolean;
  /** 세차장 여부 */
  hasCarWash: boolean;
  /** 한국석유관리원 품질인증 여부 */
  isKpetro: boolean;
  /** 편의점 여부 */
  hasConvenience: boolean;
  /** GIS X 좌표 (KATEC) */
  gisX: number;
  /** GIS Y 좌표 (KATEC) */
  gisY: number;
  /** 현재 판매 유종별 가격 */
  oilPrices: OilPriceItem[];
}

/** 주유소 검색 결과 */
export interface SearchByNameItem {
  /** 주유소 ID */
  stationId: string;
  /** 브랜드 코드 */
  brandCode: string;
  /** 상호명 */
  name: string;
  /** 도로명 주소 */
  roadAddress: string;
  /** 시군구 코드 */
  sigunCode: string;
  /** GIS X 좌표 (KATEC) */
  gisX: number;
  /** GIS Y 좌표 (KATEC) */
  gisY: number;
}

/** 요소수 판매 주유소 */
export interface UreaPriceItem {
  /** 주유소 ID */
  stationId: string;
  /** 상호명 */
  name: string;
  /** 주소 */
  address: string;
  /** 전화번호 */
  tel: string;
  /** GIS X 좌표 (KATEC) */
  gisX: number;
  /** GIS Y 좌표 (KATEC) */
  gisY: number;
  /** 재고 여부 */
  inStock: boolean;
  /** 가격 (원/ℓ) */
  price: number;
  /** 거래일 (YYYYMMDD) */
  tradeDate: string;
  /** 거래시각 (HHmm) */
  tradeTime: string;
}

/** 지역 코드 */
export interface AreaCodeItem {
  /** 지역 코드 */
  code: string;
  /** 지역명 */
  name: string;
}

// ---------------------------------------------------------------------------
// Request parameter types
// ---------------------------------------------------------------------------

export interface GetAvgSidoPriceParams {
  /** 시도 코드 (생략 시 전체) */
  sido?: SidoCode | string;
  /** 유종 코드 (생략 시 전체) */
  prodcd?: ProductCode | string;
}

export interface GetAvgSigunPriceParams {
  /** 시도 코드 (필수) */
  sido: SidoCode | string;
  /** 시군구 코드 (생략 시 시도 전체) */
  sigun?: string;
  /** 유종 코드 (생략 시 전체) */
  prodcd?: ProductCode | string;
}

export interface GetAvgRecentPriceParams {
  /** 기준일 YYYYMMDD (생략 시 오늘) */
  date?: string;
  /** 유종 코드 (생략 시 전체) */
  prodcd?: ProductCode | string;
}

export interface GetPollAvgRecentPriceParams {
  /** 유종 코드 (생략 시 전체) */
  prodcd?: ProductCode | string;
  /** 브랜드 코드 (생략 시 전체) */
  pollcd?: BrandCode | string;
}

export interface GetAreaAvgRecentPriceParams {
  /** 지역 코드 (필수) */
  area: string;
  /** 기준일 YYYYMMDD (생략 시 오늘) */
  date?: string;
  /** 유종 코드 (생략 시 전체) */
  prodcd?: ProductCode | string;
}

export interface GetAvgLastWeekParams {
  /** 유종 코드 (생략 시 전체) */
  prodcd?: ProductCode | string;
  /** 시도 코드 (생략 시 전국) */
  sido?: SidoCode | string;
}

export interface GetLowTop10Params {
  /** 유종 코드 (필수) */
  prodcd: ProductCode | string;
  /** 지역 코드 (생략 시 전국) */
  area?: string;
  /** 결과 수 (기본값 10, 최대 100) */
  cnt?: number;
}

export interface GetAroundAllParams {
  /** KATEC X 좌표 (경도 방향) */
  x: number;
  /** KATEC Y 좌표 (위도 방향) */
  y: number;
  /** 검색 반경 (단위: m, 최대 5000) */
  radius: number;
  /** 유종 코드 (필수) */
  prodcd: ProductCode | string;
  /** 정렬 기준 */
  sort?: SortOrder | number;
}

export interface GetDetailByIdParams {
  /** 주유소 ID */
  id: string;
}

export interface GetSearchByNameParams {
  /** 상호명 (부분 일치) */
  osnm: string;
  /** 지역 코드 (생략 시 전국) */
  area?: string;
}

export interface GetUreaPriceParams {
  /** 지역 코드 */
  area: string;
}

export interface GetAreaCodeParams {
  /** 상위 지역 코드 (생략 시 전체) */
  area?: string;
}
