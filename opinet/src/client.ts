import axios, { type AxiosInstance } from "axios";
import { BASE_URL } from "./constants";
import * as T from "./transform";
import type {
  RawEnvelope,
  RawAvgAllPriceItem, RawSidoPriceItem, RawSigunPriceItem,
  RawAvgRecentPriceItem, RawPollAvgRecentPriceItem, RawAreaAvgRecentPriceItem,
  RawAvgLastWeekItem, RawLowTopItem, RawAroundAllItem, RawDetailByIdItem,
  RawSearchByNameItem, RawUreaPriceItem, RawAreaCodeItem,
  AvgAllPriceItem, SidoPriceItem, SigunPriceItem, AvgRecentPriceItem,
  PollAvgRecentPriceItem, AreaAvgRecentPriceItem, AvgLastWeekItem,
  LowTopItem, AroundAllItem, StationDetail, SearchByNameItem,
  UreaPriceItem, AreaCodeItem,
  GetAvgSidoPriceParams, GetAvgSigunPriceParams, GetAvgRecentPriceParams,
  GetPollAvgRecentPriceParams, GetAreaAvgRecentPriceParams, GetAvgLastWeekParams,
  GetLowTop10Params, GetAroundAllParams, GetDetailByIdParams,
  GetSearchByNameParams, GetUreaPriceParams, GetAreaCodeParams,
} from "./types";

export interface OpinetClientOptions {
  /** Opinet API 인증키 */
  apiKey: string;
  /** HTTP 타임아웃 (ms, 기본값: 10000) */
  timeout?: number;
  /** 베이스 URL 오버라이드 (테스트용) */
  baseURL?: string;
}

/**
 * Opinet(오피넷) 유가정보 OpenAPI 클라이언트
 *
 * @example
 * ```ts
 * const client = new OpinetClient({ apiKey: 'YOUR_API_KEY' });
 *
 * // 전국 평균 유가 조회
 * const prices = await client.getAvgAllPrice();
 *
 * // 반경 2km 내 휘발유 최저가 주유소 검색
 * const stations = await client.getAroundAll({
 *   x: 314681.8, y: 544837, radius: 2000,
 *   prodcd: ProductCode.GASOLINE,
 *   sort: SortOrder.PRICE,
 * });
 * ```
 */
export class OpinetClient {
  private readonly http: AxiosInstance;
  private readonly apiKey: string;

  constructor({ apiKey, timeout = 10_000, baseURL = BASE_URL }: OpinetClientOptions) {
    this.apiKey = apiKey;
    this.http = axios.create({ baseURL, timeout });
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  private async get<Raw>(
    path: string,
    params: object = {}
  ): Promise<Raw[]> {
    const { data } = await this.http.get<RawEnvelope<Raw>>(path, {
      params: { code: this.apiKey, out: "json", ...params },
    });
    return data?.RESULT?.OIL ?? [];
  }

  private async getOne<Raw>(
    path: string,
    params: object = {}
  ): Promise<Raw | null> {
    const items = await this.get<Raw>(path, params);
    return items[0] ?? null;
  }

  // --------------------------------------------------------------------------
  // Price APIs
  // --------------------------------------------------------------------------

  /**
   * 전국 평균 유가를 유종별로 조회합니다.
   *
   * @returns 유종별 전국 평균가 목록
   *
   * @example
   * ```ts
   * const prices = await client.getAvgAllPrice();
   * // [{ productName: '휘발유', price: 1780, diff: -5, ... }, ...]
   * ```
   */
  async getAvgAllPrice(): Promise<AvgAllPriceItem[]> {
    const raw = await this.get<RawAvgAllPriceItem>("/avgAllPrice.do");
    return raw.map(T.toAvgAllPrice);
  }

  /**
   * 시도별 평균 유가를 조회합니다.
   *
   * @param params.sido - 시도 코드 (`SidoCode` 열거형 또는 문자열). 생략 시 전체
   * @param params.prodcd - 유종 코드 (`ProductCode` 열거형 또는 문자열). 생략 시 전체
   *
   * @example
   * ```ts
   * // 경기도 휘발유 가격
   * const prices = await client.getAvgSidoPrice({
   *   sido: SidoCode.GYEONGGI,
   *   prodcd: ProductCode.GASOLINE,
   * });
   * ```
   */
  async getAvgSidoPrice(params: GetAvgSidoPriceParams = {}): Promise<SidoPriceItem[]> {
    const raw = await this.get<RawSidoPriceItem>("/avgSidoPrice.do", params);
    return raw.map(T.toSidoPrice);
  }

  /**
   * 시군구별 평균 유가를 조회합니다.
   *
   * @param params.sido - 시도 코드 (필수)
   * @param params.sigun - 시군구 코드. 생략 시 해당 시도 전체
   * @param params.prodcd - 유종 코드. 생략 시 전체
   *
   * @example
   * ```ts
   * const prices = await client.getAvgSigunPrice({
   *   sido: SidoCode.SEOUL,
   *   prodcd: ProductCode.DIESEL,
   * });
   * ```
   */
  async getAvgSigunPrice(params: GetAvgSigunPriceParams): Promise<SigunPriceItem[]> {
    const raw = await this.get<RawSigunPriceItem>("/avgSigunPrice.do", params);
    return raw.map(T.toSigunPrice);
  }

  /**
   * 최근 7일간의 전국 일별 평균 유가를 조회합니다.
   *
   * @param params.date - 기준일 (YYYYMMDD). 생략 시 오늘
   * @param params.prodcd - 유종 코드. 생략 시 전체
   *
   * @example
   * ```ts
   * const history = await client.getAvgRecentPrice({
   *   prodcd: ProductCode.GASOLINE,
   * });
   * ```
   */
  async getAvgRecentPrice(params: GetAvgRecentPriceParams = {}): Promise<AvgRecentPriceItem[]> {
    const raw = await this.get<RawAvgRecentPriceItem>("/avgRecentPrice.do", params);
    return raw.map(T.toAvgRecentPrice);
  }

  /**
   * 최근 7일간의 브랜드별 평균 유가를 조회합니다.
   *
   * @param params.prodcd - 유종 코드. 생략 시 전체
   * @param params.pollcd - 브랜드 코드 (`BrandCode` 열거형). 생략 시 전체
   *
   * @example
   * ```ts
   * const prices = await client.getPollAvgRecentPrice({
   *   prodcd: ProductCode.GASOLINE,
   *   pollcd: BrandCode.SK,
   * });
   * ```
   */
  async getPollAvgRecentPrice(
    params: GetPollAvgRecentPriceParams = {}
  ): Promise<PollAvgRecentPriceItem[]> {
    const raw = await this.get<RawPollAvgRecentPriceItem>("/pollAvgRecentPrice.do", params);
    return raw.map(T.toPollAvgRecentPrice);
  }

  /**
   * 최근 7일간의 지역별 평균 유가를 조회합니다.
   *
   * @param params.area - 지역 코드 (필수). `getAreaCode()`로 확인
   * @param params.date - 기준일 (YYYYMMDD). 생략 시 오늘
   * @param params.prodcd - 유종 코드. 생략 시 전체
   *
   * @example
   * ```ts
   * const prices = await client.getAreaAvgRecentPrice({ area: '01' });
   * ```
   */
  async getAreaAvgRecentPrice(
    params: GetAreaAvgRecentPriceParams
  ): Promise<AreaAvgRecentPriceItem[]> {
    const raw = await this.get<RawAreaAvgRecentPriceItem>("/areaAvgRecentPrice.do", params);
    return raw.map(T.toAreaAvgRecentPrice);
  }

  /**
   * 전주 기준 주간 평균 유가를 조회합니다.
   *
   * @param params.prodcd - 유종 코드. 생략 시 전체
   * @param params.sido - 시도 코드. 생략 시 전국
   *
   * @example
   * ```ts
   * const weekly = await client.getAvgLastWeek({ prodcd: ProductCode.GASOLINE });
   * ```
   */
  async getAvgLastWeek(params: GetAvgLastWeekParams = {}): Promise<AvgLastWeekItem[]> {
    const raw = await this.get<RawAvgLastWeekItem>("/avgLastWeek.do", params);
    return raw.map(T.toAvgLastWeek);
  }

  // --------------------------------------------------------------------------
  // Station APIs
  // --------------------------------------------------------------------------

  /**
   * 유종별 최저가 주유소 목록을 조회합니다.
   *
   * @param params.prodcd - 유종 코드 (필수)
   * @param params.area - 지역 코드. 생략 시 전국
   * @param params.cnt - 결과 수 (기본값: 10, 최대: 100)
   *
   * @example
   * ```ts
   * // 서울 경유 최저가 20개 주유소
   * const stations = await client.getLowTop10({
   *   prodcd: ProductCode.DIESEL,
   *   area: SidoCode.SEOUL,
   *   cnt: 20,
   * });
   * ```
   */
  async getLowTop10(params: GetLowTop10Params): Promise<LowTopItem[]> {
    const raw = await this.get<RawLowTopItem>("/lowTop10.do", params);
    return raw.map(T.toLowTop);
  }

  /**
   * 특정 좌표 반경 내 주유소 목록을 조회합니다.
   *
   * 좌표는 **KATEC(한국 횡메르카토르)** 투영 좌표계를 사용합니다.
   * WGS84 → KATEC 변환이 필요한 경우 별도 라이브러리를 사용하세요.
   *
   * @param params.x - KATEC X 좌표 (경도 방향)
   * @param params.y - KATEC Y 좌표 (위도 방향)
   * @param params.radius - 검색 반경 (m, 최대 5000)
   * @param params.prodcd - 유종 코드 (필수)
   * @param params.sort - 정렬 기준 (`SortOrder` 열거형, 기본값: 가격순)
   *
   * @example
   * ```ts
   * const nearby = await client.getAroundAll({
   *   x: 314681.8,
   *   y: 544837,
   *   radius: 3000,
   *   prodcd: ProductCode.GASOLINE,
   *   sort: SortOrder.DISTANCE,
   * });
   * ```
   */
  async getAroundAll(params: GetAroundAllParams): Promise<AroundAllItem[]> {
    const raw = await this.get<RawAroundAllItem>("/aroundAll.do", {
      ...params,
      sort: params.sort ?? 1,
    });
    return raw.map(T.toAroundAll);
  }

  /**
   * 주유소 ID로 상세 정보를 조회합니다.
   *
   * @param params.id - 주유소 고유 ID (예: `"A0000001"`)
   * @returns 주유소 상세 정보. ID가 없으면 `null`
   *
   * @example
   * ```ts
   * const detail = await client.getDetailById({ id: 'A0000001' });
   * if (detail) {
   *   console.log(detail.name, detail.oilPrices);
   * }
   * ```
   */
  async getDetailById(params: GetDetailByIdParams): Promise<StationDetail | null> {
    const raw = await this.getOne<RawDetailByIdItem>("/detailById.do", params);
    return raw ? T.toStationDetail(raw) : null;
  }

  /**
   * 상호명으로 주유소를 검색합니다.
   *
   * @param params.osnm - 상호명 (부분 일치)
   * @param params.area - 지역 코드. 생략 시 전국
   *
   * @example
   * ```ts
   * const results = await client.searchByName({ osnm: 'SK주유소' });
   * ```
   */
  async searchByName(params: GetSearchByNameParams): Promise<SearchByNameItem[]> {
    const raw = await this.get<RawSearchByNameItem>("/searchByName.do", params);
    return raw.map(T.toSearchByName);
  }

  // --------------------------------------------------------------------------
  // Utility APIs
  // --------------------------------------------------------------------------

  /**
   * 요소수 판매 주유소 목록을 지역 코드로 조회합니다.
   *
   * @param params.area - 지역 코드 (필수)
   *
   * @example
   * ```ts
   * const stores = await client.getUreaPrice({ area: '01' }); // 서울
   * ```
   */
  async getUreaPrice(params: GetUreaPriceParams): Promise<UreaPriceItem[]> {
    const raw = await this.get<RawUreaPriceItem>("/ureaPrice.do", params);
    return raw.map(T.toUreaPrice);
  }

  /**
   * 지역 코드 목록을 조회합니다.
   *
   * @param params.area - 상위 지역 코드. 생략 시 최상위(시도) 코드 전체
   *
   * @example
   * ```ts
   * const sidoCodes = await client.getAreaCode();            // 시도 전체
   * const sigunCodes = await client.getAreaCode({ area: '01' }); // 서울 시군구
   * ```
   */
  async getAreaCode(params: GetAreaCodeParams = {}): Promise<AreaCodeItem[]> {
    const raw = await this.get<RawAreaCodeItem>("/areaCode.do", params);
    return raw.map(T.toAreaCode);
  }
}
