# opinet-client

한국석유공사 오피넷(Opinet) 유가정보 OpenAPI를 위한 TypeScript 클라이언트 라이브러리입니다.

## 특징

- **완전한 타입 지원** — 모든 요청 파라미터와 응답이 TypeScript 타입으로 정의되어 있습니다
- **camelCase 응답** — API의 `ALL_CAPS` 필드를 자동으로 camelCase로 변환합니다
- **숫자 파싱** — 가격·좌표·거리 등 숫자 값을 문자열이 아닌 `number`로 반환합니다
- **열거형 상수** — 유종 코드, 정렬 기준, 브랜드 코드 등을 열거형으로 제공합니다

---

## 설치

```bash
npm install opinet-client axios
```

---

## 빠른 시작

```typescript
import {
  OpinetClient,
  ProductCode,
  SortOrder,
  SidoCode,
} from "opinet-client";

const client = new OpinetClient({ apiKey: "YOUR_API_KEY" });

// 전국 평균 유가
const prices = await client.getAvgAllPrice();
console.log(prices);
// [{ productName: '휘발유', price: 1780, diff: -5, tradeDate: '20260428' }, ...]

// 반경 3km 내 휘발유 최저가 주유소
const nearby = await client.getAroundAll({
  x: 314681.8,
  y: 544837,
  radius: 3000,
  prodcd: ProductCode.GASOLINE,
  sort: SortOrder.PRICE,
});
```

> **API 키 발급:** [오피넷 홈페이지](https://www.opinet.co.kr)에서 회원가입 후 무료 API 키를 신청하세요. 하루 1,500회 호출이 제공됩니다.

---

## API 레퍼런스

### `new OpinetClient(options)`

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `apiKey` | `string` | — | Opinet API 인증키 (필수) |
| `timeout` | `number` | `10000` | HTTP 타임아웃 (ms) |
| `baseURL` | `string` | Opinet 공식 URL | 베이스 URL (테스트 오버라이드용) |

---

### 가격 조회 API

#### `getAvgAllPrice()`

전국 유종별 평균 유가를 조회합니다.

```typescript
const prices = await client.getAvgAllPrice();
// AvgAllPriceItem[]
```

| 응답 필드 | 타입 | 설명 |
|-----------|------|------|
| `tradeDate` | `string` | 거래일 (YYYYMMDD) |
| `productCode` | `string` | 유종 코드 |
| `productName` | `string` | 유종명 |
| `price` | `number` | 가격 (원/ℓ) |
| `diff` | `number` | 전일 대비 변동 |

---

#### `getAvgSidoPrice(params?)`

시도별 평균 유가를 조회합니다.

```typescript
const prices = await client.getAvgSidoPrice({
  sido: SidoCode.GYEONGGI,    // 생략 시 전체
  prodcd: ProductCode.GASOLINE, // 생략 시 전체
});
// SidoPriceItem[]
```

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `sido` | `SidoCode \| string` | 선택 | 시도 코드 |
| `prodcd` | `ProductCode \| string` | 선택 | 유종 코드 |

---

#### `getAvgSigunPrice(params)`

시군구별 평균 유가를 조회합니다.

```typescript
const prices = await client.getAvgSigunPrice({
  sido: SidoCode.SEOUL,       // 필수
  sigun: "11110",              // 생략 시 시도 전체
  prodcd: ProductCode.DIESEL,
});
// SigunPriceItem[]
```

---

#### `getAvgRecentPrice(params?)`

최근 7일간 전국 일별 평균 유가를 조회합니다.

```typescript
const history = await client.getAvgRecentPrice({
  date: "20260428",            // 생략 시 오늘 (YYYYMMDD)
  prodcd: ProductCode.GASOLINE,
});
// AvgRecentPriceItem[]
```

---

#### `getPollAvgRecentPrice(params?)`

최근 7일간 브랜드별 평균 유가를 조회합니다.

```typescript
const prices = await client.getPollAvgRecentPrice({
  prodcd: ProductCode.GASOLINE,
  pollcd: BrandCode.SK,
});
// PollAvgRecentPriceItem[]
```

---

#### `getAreaAvgRecentPrice(params)`

최근 7일간 지역별 평균 유가를 조회합니다.

```typescript
const prices = await client.getAreaAvgRecentPrice({
  area: "01",                  // 지역 코드 (필수)
  prodcd: ProductCode.GASOLINE,
});
// AreaAvgRecentPriceItem[]
```

---

#### `getAvgLastWeek(params?)`

전주 기준 주간 평균 유가를 조회합니다.

```typescript
const weekly = await client.getAvgLastWeek({
  prodcd: ProductCode.GASOLINE,
  sido: SidoCode.SEOUL,
});
// AvgLastWeekItem[]
```

---

### 주유소 조회 API

#### `getLowTop10(params)`

유종별 최저가 주유소 목록을 조회합니다.

```typescript
const cheapest = await client.getLowTop10({
  prodcd: ProductCode.DIESEL,  // 필수
  area: SidoCode.SEOUL,        // 생략 시 전국
  cnt: 20,                     // 생략 시 10, 최대 100
});
// LowTopItem[]
```

| 응답 필드 | 타입 | 설명 |
|-----------|------|------|
| `stationId` | `string` | 주유소 ID |
| `name` | `string` | 상호명 |
| `price` | `number` | 가격 (원/ℓ) |
| `brandCode` | `string` | 브랜드 코드 |
| `address` | `string` | 지번 주소 |
| `roadAddress` | `string` | 도로명 주소 |
| `gisX` | `number` | KATEC X 좌표 |
| `gisY` | `number` | KATEC Y 좌표 |

---

#### `getAroundAll(params)`

특정 좌표 반경 내 주유소 목록을 조회합니다.

> 좌표는 **KATEC** 투영 좌표계를 사용합니다. WGS84(GPS 좌표) → KATEC 변환이 필요한 경우 별도 라이브러리를 사용하세요.

```typescript
const nearby = await client.getAroundAll({
  x: 314681.8,                 // KATEC X (필수)
  y: 544837,                   // KATEC Y (필수)
  radius: 5000,                // 반경 m, 최대 5000 (필수)
  prodcd: ProductCode.GASOLINE, // 유종 코드 (필수)
  sort: SortOrder.DISTANCE,    // 정렬 기준 (기본값: PRICE)
});
// AroundAllItem[]
```

| 응답 필드 | 타입 | 설명 |
|-----------|------|------|
| `stationId` | `string` | 주유소 ID |
| `name` | `string` | 상호명 |
| `price` | `number` | 가격 (원/ℓ) |
| `distance` | `number` | 거리 (m) |
| `brandCode` | `string` | 브랜드 코드 |
| `gisX` | `number` | KATEC X 좌표 |
| `gisY` | `number` | KATEC Y 좌표 |

---

#### `getDetailById(params)`

주유소 ID로 상세 정보를 조회합니다.

```typescript
const detail = await client.getDetailById({ id: "A0000001" });
if (detail) {
  console.log(detail.name, detail.oilPrices);
}
// StationDetail | null
```

| 응답 필드 | 타입 | 설명 |
|-----------|------|------|
| `stationId` | `string` | 주유소 ID |
| `name` | `string` | 상호명 |
| `address` | `string` | 지번 주소 |
| `roadAddress` | `string` | 도로명 주소 |
| `tel` | `string` | 전화번호 |
| `sigunCode` | `string` | 시군구 코드 |
| `hasLpg` | `boolean` | LPG 판매 여부 |
| `hasMaintenance` | `boolean` | 경정비 여부 |
| `hasCarWash` | `boolean` | 세차장 여부 |
| `isKpetro` | `boolean` | 한국석유관리원 품질인증 여부 |
| `hasConvenience` | `boolean` | 편의점 여부 |
| `gisX` | `number` | KATEC X 좌표 |
| `gisY` | `number` | KATEC Y 좌표 |
| `oilPrices` | `OilPriceItem[]` | 유종별 현재 가격 목록 |

---

#### `searchByName(params)`

상호명으로 주유소를 검색합니다.

```typescript
const results = await client.searchByName({
  osnm: "SK",                  // 부분 일치 검색 (필수)
  area: SidoCode.SEOUL,        // 생략 시 전국
});
// SearchByNameItem[]
```

---

### 유틸리티 API

#### `getUreaPrice(params)`

요소수(AdBlue) 판매 주유소 목록을 조회합니다.

```typescript
const stores = await client.getUreaPrice({ area: "41" }); // 경기
// UreaPriceItem[]
```

---

#### `getAreaCode(params?)`

지역 코드 목록을 조회합니다.

```typescript
const sidoCodes = await client.getAreaCode();           // 시도 전체
const sigunCodes = await client.getAreaCode({ area: "01" }); // 서울 시군구
// AreaCodeItem[] — [{ code: '01', name: '서울' }, ...]
```

---

## 상수 (열거형)

### `ProductCode` — 유종 코드

| 상수 | 값 | 설명 |
|------|----|------|
| `GASOLINE` | `"B027"` | 휘발유 |
| `PREMIUM_GASOLINE` | `"K015"` | 고급휘발유 |
| `DIESEL` | `"D047"` | 자동차용경유 |
| `KEROSENE` | `"C004"` | 실내등유 |
| `E85` | `"E001"` | E85 |

### `SortOrder` — 정렬 기준 (`getAroundAll` 전용)

| 상수 | 값 | 설명 |
|------|----|------|
| `PRICE` | `1` | 가격순 |
| `DISTANCE` | `2` | 거리순 |
| `NAME` | `3` | 상호명순 |
| `BRAND` | `4` | 브랜드순 |

### `BrandCode` — 브랜드 코드

| 상수 | 값 | 설명 |
|------|----|------|
| `SK` | `"SKE"` | SK에너지 |
| `GS` | `"GSC"` | GS칼텍스 |
| `HYUNDAI_OIL_BANK` | `"HDO"` | 현대오일뱅크 |
| `S_OIL` | `"SOL"` | S-OIL |
| `INDEPENDENT` | `"RTO"` | 일반 독립 주유소 |
| `SELF_INDEPENDENT` | `"RTX"` | 자영알뜰주유소 |
| `NONGHYUP` | `"NHO"` | 농협알뜰주유소 |
| `OTHER` | `"ETC"` | 기타 |

### `SidoCode` — 시도 코드

| 상수 | 값 | 상수 | 값 |
|------|----|------|----|
| `SEOUL` | `"01"` | `GYEONGGI` | `"41"` |
| `BUSAN` | `"06"` | `GANGWON` | `"42"` |
| `DAEGU` | `"07"` | `CHUNGBUK` | `"43"` |
| `INCHEON` | `"12"` | `CHUNGNAM` | `"44"` |
| `GWANGJU` | `"16"` | `JEONBUK` | `"45"` |
| `DAEJEON` | `"17"` | `JEONNAM` | `"46"` |
| `ULSAN` | `"18"` | `GYEONGBUK` | `"47"` |
| `SEJONG` | `"19"` | `GYEONGNAM` | `"48"` |
| — | — | `JEJU` | `"50"` |

---

## 에러 처리

모든 메서드는 네트워크 오류나 HTTP 오류 상태 시 `AxiosError`를 throw합니다.

```typescript
import { isAxiosError } from "axios";

try {
  const prices = await client.getAvgAllPrice();
} catch (err) {
  if (isAxiosError(err)) {
    console.error("HTTP error:", err.response?.status);
  }
}
```

---

## 라이선스

MIT
