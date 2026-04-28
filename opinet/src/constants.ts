/**
 * 유종 코드 (연료 종류)
 * @see https://www.opinet.co.kr
 */
export enum ProductCode {
  /** 휘발유 */
  GASOLINE = "B027",
  /** 고급휘발유 */
  PREMIUM_GASOLINE = "K015",
  /** 자동차용경유 */
  DIESEL = "D047",
  /** 실내등유 */
  KEROSENE = "C004",
  /** E85 */
  E85 = "E001",
}

/**
 * 정렬 기준 (aroundAll 전용)
 */
export enum SortOrder {
  /** 가격순 */
  PRICE = 1,
  /** 거리순 */
  DISTANCE = 2,
  /** 상호명순 */
  NAME = 3,
  /** 브랜드순 */
  BRAND = 4,
}

/**
 * 브랜드(폴) 코드
 */
export enum BrandCode {
  SK = "SKE",
  GS = "GSC",
  HYUNDAI_OIL_BANK = "HDO",
  S_OIL = "SOL",
  INDEPENDENT = "RTO",
  SELF_INDEPENDENT = "RTX",
  NONGHYUP = "NHO",
  OTHER = "ETC",
}

/**
 * 시도 코드 (광역시/도)
 */
export enum SidoCode {
  SEOUL = "01",
  BUSAN = "06",
  DAEGU = "07",
  INCHEON = "12",
  GWANGJU = "16",
  DAEJEON = "17",
  ULSAN = "18",
  SEJONG = "19",
  GYEONGGI = "41",
  GANGWON = "42",
  CHUNGBUK = "43",
  CHUNGNAM = "44",
  JEONBUK = "45",
  JEONNAM = "46",
  GYEONGBUK = "47",
  GYEONGNAM = "48",
  JEJU = "50",
}

export const BASE_URL = "https://www.opinet.co.kr/api";
