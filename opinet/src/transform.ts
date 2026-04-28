import type {
  RawAvgAllPriceItem, RawSidoPriceItem, RawSigunPriceItem,
  RawAvgRecentPriceItem, RawPollAvgRecentPriceItem, RawAreaAvgRecentPriceItem,
  RawAvgLastWeekItem, RawLowTopItem, RawAroundAllItem, RawDetailByIdItem,
  RawSearchByNameItem, RawUreaPriceItem, RawAreaCodeItem, RawOilPriceItem,
  AvgAllPriceItem, SidoPriceItem, SigunPriceItem, AvgRecentPriceItem,
  PollAvgRecentPriceItem, AreaAvgRecentPriceItem, AvgLastWeekItem,
  LowTopItem, AroundAllItem, StationDetail, SearchByNameItem,
  UreaPriceItem, AreaCodeItem, OilPriceItem,
} from "./types";

const n = (s: string): number => parseFloat(s) || 0;
const bool = (s: string): boolean => s === "Y";

export const toAvgAllPrice = (r: RawAvgAllPriceItem): AvgAllPriceItem => ({
  tradeDate: r.TRADE_DT,
  productCode: r.PRODCD,
  productName: r.PRODNM,
  price: n(r.PRICE),
  diff: n(r.DIFF),
});

export const toSidoPrice = (r: RawSidoPriceItem): SidoPriceItem => ({
  sidoCode: r.SIDOCD,
  sidoName: r.SIDONM,
  productCode: r.PRODCD,
  price: n(r.PRICE),
  diff: n(r.DIFF),
});

export const toSigunPrice = (r: RawSigunPriceItem): SigunPriceItem => ({
  sigunCode: r.SIGUNCD,
  sigunName: r.SIGUNNM,
  productCode: r.PRODCD,
  price: n(r.PRICE),
  diff: n(r.DIFF),
});

export const toAvgRecentPrice = (r: RawAvgRecentPriceItem): AvgRecentPriceItem => ({
  date: r.DATE,
  productCode: r.PRODCD,
  price: n(r.PRICE),
});

export const toPollAvgRecentPrice = (r: RawPollAvgRecentPriceItem): PollAvgRecentPriceItem => ({
  date: r.DATE,
  productCode: r.PRODCD,
  brandCode: r.POLL_DIV_CD,
  price: n(r.PRICE),
});

export const toAreaAvgRecentPrice = (r: RawAreaAvgRecentPriceItem): AreaAvgRecentPriceItem => ({
  date: r.DATE,
  areaCode: r.AREA_CD,
  areaName: r.AREA_NM,
  productCode: r.PRODCD,
  price: n(r.PRICE),
});

export const toAvgLastWeek = (r: RawAvgLastWeekItem): AvgLastWeekItem => ({
  week: r.WEEK,
  startDate: r.STA_DT,
  endDate: r.END_DT,
  areaCode: r.AREA_CD,
  productCode: r.PRODCD,
  price: n(r.PRICE),
});

export const toLowTop = (r: RawLowTopItem): LowTopItem => ({
  stationId: r.UNI_ID,
  price: n(r.PRICE),
  brandCode: r.POLL_DIV_CD,
  name: r.OS_NM,
  address: r.VAN_ADR,
  roadAddress: r.NEW_ADR,
  gisX: n(r.GIS_X_COOR),
  gisY: n(r.GIS_Y_COOR),
});

export const toAroundAll = (r: RawAroundAllItem): AroundAllItem => ({
  stationId: r.UNI_ID,
  brandCode: r.POLL_DIV_CD,
  name: r.OS_NM,
  price: n(r.PRICE),
  distance: n(r.DISTANCE),
  gisX: n(r.GIS_X_COOR),
  gisY: n(r.GIS_Y_COOR),
});

const toOilPrice = (r: RawOilPriceItem): OilPriceItem => ({
  productCode: r.PRODCD,
  price: n(r.PRICE),
  tradeDate: r.TRADE_DT,
  tradeTime: r.TRADE_TM,
});

export const toStationDetail = (r: RawDetailByIdItem): StationDetail => ({
  stationId: r.UNI_ID,
  brandCode: r.POLL_DIV_CD,
  name: r.OS_NM,
  address: r.VAN_ADR,
  roadAddress: r.NEW_ADR,
  tel: r.TEL,
  sigunCode: r.SIGUNCD,
  hasLpg: bool(r.LPG_YN),
  hasMaintenance: bool(r.MAINT_YN),
  hasCarWash: bool(r.CAR_WASH_YN),
  isKpetro: bool(r.KPETRO_YN),
  hasConvenience: bool(r.CVS_YN),
  gisX: n(r.GIS_X_COOR),
  gisY: n(r.GIS_Y_COOR),
  oilPrices: (r.OIL_PRICE ?? []).map(toOilPrice),
});

export const toSearchByName = (r: RawSearchByNameItem): SearchByNameItem => ({
  stationId: r.UNI_ID,
  brandCode: r.POLL_DIV_CD,
  name: r.OS_NM,
  roadAddress: r.NEW_ADR,
  sigunCode: r.SIGUNCD,
  gisX: n(r.GIS_X_COOR),
  gisY: n(r.GIS_Y_COOR),
});

export const toUreaPrice = (r: RawUreaPriceItem): UreaPriceItem => ({
  stationId: r.UNI_ID,
  name: r.OS_NM,
  address: r.ADRESS,
  tel: r.TEL,
  gisX: n(r.GIS_X_COOR),
  gisY: n(r.GIS_Y_COOR),
  inStock: bool(r.STOCK_YN),
  price: n(r.PRICE),
  tradeDate: r.TRADE_DT,
  tradeTime: r.TRADE_TM,
});

export const toAreaCode = (r: RawAreaCodeItem): AreaCodeItem => ({
  code: r.AREA_CD,
  name: r.AREA_NM,
});
