import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { OpinetClient, ProductCode, SortOrder, BrandCode, SidoCode } from "./index";

const API_KEY = "TEST_KEY";

function wrap<T>(items: T[]) {
  return { RESULT: { OIL: items } };
}

let mock: MockAdapter;
let client: OpinetClient;

beforeEach(() => {
  mock = new MockAdapter(axios);
  client = new OpinetClient({ apiKey: API_KEY, baseURL: "https://mock.test" });
});

afterEach(() => mock.restore());

function expectParams(url: string, params: Record<string, string>) {
  expect(url).toContain("code=TEST_KEY");
  expect(url).toContain("out=json");
  for (const [k, v] of Object.entries(params)) {
    expect(url).toContain(`${k}=${v}`);
  }
}

// ---------------------------------------------------------------------------
describe("getAvgAllPrice", () => {
  it("maps raw response to camelCase", async () => {
    mock.onGet(/avgAllPrice/).reply(200, wrap([
      { TRADE_DT: "20260428", PRODCD: "B027", PRODNM: "휘발유", PRICE: "1780", DIFF: "-5" },
    ]));

    const [item] = await client.getAvgAllPrice();
    expect(item).toEqual({
      tradeDate: "20260428",
      productCode: "B027",
      productName: "휘발유",
      price: 1780,
      diff: -5,
    });
  });

  it("returns empty array when OIL is empty", async () => {
    mock.onGet(/avgAllPrice/).reply(200, wrap([]));
    expect(await client.getAvgAllPrice()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe("getAvgSidoPrice", () => {
  it("passes sido and prodcd params", async () => {
    mock.onGet(/avgSidoPrice/).reply((config) => {
      expectParams(config.url! + "?" + new URLSearchParams(config.params).toString(), {
        sido: SidoCode.SEOUL,
        prodcd: ProductCode.GASOLINE,
      });
      return [200, wrap([
        { SIDOCD: "01", SIDONM: "서울", PRODCD: "B027", PRICE: "1800", DIFF: "0" },
      ])];
    });

    const [item] = await client.getAvgSidoPrice({
      sido: SidoCode.SEOUL,
      prodcd: ProductCode.GASOLINE,
    });
    expect(item.sidoCode).toBe("01");
    expect(item.sidoName).toBe("서울");
    expect(item.price).toBe(1800);
    expect(item.diff).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe("getAvgSigunPrice", () => {
  it("maps to SigunPriceItem", async () => {
    mock.onGet(/avgSigunPrice/).reply(200, wrap([
      { SIGUNCD: "11110", SIGUNNM: "종로구", PRODCD: "D047", PRICE: "1650", DIFF: "10" },
    ]));

    const [item] = await client.getAvgSigunPrice({ sido: SidoCode.SEOUL });
    expect(item.sigunCode).toBe("11110");
    expect(item.sigunName).toBe("종로구");
    expect(item.price).toBe(1650);
    expect(item.diff).toBe(10);
  });
});

// ---------------------------------------------------------------------------
describe("getAvgRecentPrice", () => {
  it("maps date and price", async () => {
    mock.onGet(/avgRecentPrice/).reply(200, wrap([
      { DATE: "20260421", PRODCD: "B027", PRICE: "1790" },
      { DATE: "20260422", PRODCD: "B027", PRICE: "1785" },
    ]));

    const items = await client.getAvgRecentPrice({ prodcd: ProductCode.GASOLINE });
    expect(items).toHaveLength(2);
    expect(items[0].date).toBe("20260421");
    expect(items[1].price).toBe(1785);
  });
});

// ---------------------------------------------------------------------------
describe("getPollAvgRecentPrice", () => {
  it("maps brandCode field", async () => {
    mock.onGet(/pollAvgRecentPrice/).reply(200, wrap([
      { DATE: "20260428", PRODCD: "B027", POLL_DIV_CD: "SKE", PRICE: "1770" },
    ]));

    const [item] = await client.getPollAvgRecentPrice({ pollcd: BrandCode.SK });
    expect(item.brandCode).toBe("SKE");
  });
});

// ---------------------------------------------------------------------------
describe("getAroundAll", () => {
  it("maps distance and defaults sort to 1", async () => {
    mock.onGet(/aroundAll/).reply((config) => {
      expect(config.params.sort).toBe(1);
      return [200, wrap([
        {
          UNI_ID: "A0001", POLL_DIV_CD: "SKE", OS_NM: "SK주유소",
          PRICE: "1760", DISTANCE: "350.5",
          GIS_X_COOR: "314681.8", GIS_Y_COOR: "544837",
        },
      ])];
    });

    const [item] = await client.getAroundAll({
      x: 314681.8, y: 544837, radius: 2000,
      prodcd: ProductCode.GASOLINE,
    });
    expect(item.stationId).toBe("A0001");
    expect(item.distance).toBe(350.5);
    expect(item.gisX).toBe(314681.8);
  });

  it("passes custom sort order", async () => {
    mock.onGet(/aroundAll/).reply((config) => {
      expect(config.params.sort).toBe(SortOrder.DISTANCE);
      return [200, wrap([])];
    });

    await client.getAroundAll({
      x: 0, y: 0, radius: 1000,
      prodcd: ProductCode.GASOLINE,
      sort: SortOrder.DISTANCE,
    });
  });
});

// ---------------------------------------------------------------------------
describe("getDetailById", () => {
  it("maps all boolean flags and nested oilPrices", async () => {
    mock.onGet(/detailById/).reply(200, wrap([
      {
        UNI_ID: "A0001", POLL_DIV_CD: "GSC", OS_NM: "GS주유소",
        VAN_ADR: "서울 종로구 1번지", NEW_ADR: "서울 종로구 종로1가 1",
        TEL: "02-1234-5678", SIGUNCD: "11110",
        LPG_YN: "N", MAINT_YN: "Y", CAR_WASH_YN: "Y", KPETRO_YN: "Y", CVS_YN: "N",
        GIS_X_COOR: "200000", GIS_Y_COOR: "500000",
        OIL_PRICE: [
          { PRODCD: "B027", PRICE: "1780", TRADE_DT: "20260428", TRADE_TM: "0900" },
        ],
      },
    ]));

    const detail = await client.getDetailById({ id: "A0001" });
    expect(detail).not.toBeNull();
    expect(detail!.name).toBe("GS주유소");
    expect(detail!.hasLpg).toBe(false);
    expect(detail!.hasMaintenance).toBe(true);
    expect(detail!.hasCarWash).toBe(true);
    expect(detail!.isKpetro).toBe(true);
    expect(detail!.hasConvenience).toBe(false);
    expect(detail!.oilPrices).toHaveLength(1);
    expect(detail!.oilPrices[0].price).toBe(1780);
  });

  it("returns null when station not found", async () => {
    mock.onGet(/detailById/).reply(200, wrap([]));
    expect(await client.getDetailById({ id: "UNKNOWN" })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("searchByName", () => {
  it("maps name search result", async () => {
    mock.onGet(/searchByName/).reply(200, wrap([
      {
        UNI_ID: "A0002", POLL_DIV_CD: "HDO", OS_NM: "현대오일뱅크",
        NEW_ADR: "서울 강남구 테헤란로 1", SIGUNCD: "11680",
        GIS_X_COOR: "210000", GIS_Y_COOR: "510000",
      },
    ]));

    const [item] = await client.searchByName({ osnm: "현대" });
    expect(item.name).toBe("현대오일뱅크");
    expect(item.brandCode).toBe("HDO");
    expect(item.gisX).toBe(210000);
  });
});

// ---------------------------------------------------------------------------
describe("getUreaPrice", () => {
  it("maps inStock flag and price", async () => {
    mock.onGet(/ureaPrice/).reply(200, wrap([
      {
        UNI_ID: "B0001", OS_NM: "요소수주유소", ADRESS: "경기 수원시",
        TEL: "031-000-0000", GIS_X_COOR: "316000", GIS_Y_COOR: "530000",
        STOCK_YN: "Y", PRICE: "1500", TRADE_DT: "20260428", TRADE_TM: "1000",
      },
    ]));

    const [item] = await client.getUreaPrice({ area: "41" });
    expect(item.inStock).toBe(true);
    expect(item.price).toBe(1500);
    expect(item.address).toBe("경기 수원시");
  });
});

// ---------------------------------------------------------------------------
describe("getAreaCode", () => {
  it("maps area code list", async () => {
    mock.onGet(/areaCode/).reply(200, wrap([
      { AREA_CD: "01", AREA_NM: "서울" },
      { AREA_CD: "06", AREA_NM: "부산" },
    ]));

    const codes = await client.getAreaCode();
    expect(codes).toHaveLength(2);
    expect(codes[0]).toEqual({ code: "01", name: "서울" });
  });
});

// ---------------------------------------------------------------------------
describe("error handling", () => {
  it("throws AxiosError on HTTP error", async () => {
    mock.onGet(/avgAllPrice/).reply(500);
    await expect(client.getAvgAllPrice()).rejects.toThrow();
  });
});
