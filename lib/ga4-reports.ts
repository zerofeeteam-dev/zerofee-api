import { protos } from '@google-analytics/data';

export type BatchRunReportsRequest = protos.google.analytics.data.v1beta.IBatchRunReportsRequest;
export type BatchRunReportsResponse = protos.google.analytics.data.v1beta.IBatchRunReportsResponse;
export type RunReportResponse = protos.google.analytics.data.v1beta.IRunReportResponse;
export type Row = protos.google.analytics.data.v1beta.IRow;
export type FilterExpression = protos.google.analytics.data.v1beta.IFilterExpression;

export function toStringOrNull(value: unknown) {
  if (value === undefined || value === null) return null;
  return String(value);
}

export function getStringParam(url: URL, name: string) {
  const value = url.searchParams.get(name);
  return value && value.trim() ? value.trim() : null;
}

export function requireStringParam(url: URL, name: string) {
  const value = getStringParam(url, name);
  if (!value) {
    throw new Error(`${name} required`);
  }
  return value;
}

export function normalizeDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value;
}

export function buildExactStringFilter(fieldName: string, value: string): FilterExpression {
  return {
    filter: {
      fieldName,
      stringFilter: {
        matchType: protos.google.analytics.data.v1beta.Filter.StringFilter.MatchType.EXACT,
        value,
      },
    },
  };
}

export function buildViewItemFilter(creatorId: string, productId?: string | null): FilterExpression {
  const expressions = [
    buildExactStringFilter('eventName', 'view_item'),
    buildExactStringFilter('customEvent:creator_id', creatorId),
    ...(productId ? [buildExactStringFilter('customEvent:product_id', productId)] : []),
  ];

  return {
    andGroup: {
      expressions,
    },
  };
}

export function buildDateRange(startDate: string | null | undefined, endDate: string | null | undefined, fallbackStartDate: string, fallbackEndDate: string) {
  return {
    startDate: startDate ?? fallbackStartDate,
    endDate: endDate ?? fallbackEndDate,
  };
}

export function rowDimensionValue(row: Row | undefined, index: number) {
  return toStringOrNull(row?.dimensionValues?.[index]?.value);
}

export function rowMetricValue(row: Row | undefined, index: number) {
  return toStringOrNull(row?.metricValues?.[index]?.value);
}

export function rowToObject(row: Row, dimensionNames: string[], metricNames: string[]) {
  const dimensions = Object.fromEntries(
    dimensionNames.map((name, index) => [name, rowDimensionValue(row, index)])
  );
  const metrics = Object.fromEntries(metricNames.map((name, index) => [name, rowMetricValue(row, index)]));

  return { ...dimensions, ...metrics };
}

export function reportRowsToObjects(report: RunReportResponse | undefined, dimensionNames: string[], metricNames: string[]) {
  return (report?.rows ?? []).map(row => rowToObject(row, dimensionNames, metricNames));
}

export function reportTotalsToObject(report: RunReportResponse | undefined, metricNames: string[]) {
  const totalsRow = report?.totals?.[0];
  if (!totalsRow) return {};

  return Object.fromEntries(metricNames.map((name, index) => [name, rowMetricValue(totalsRow, index)]));
}
