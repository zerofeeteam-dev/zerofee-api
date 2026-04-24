import { protos } from '@google-analytics/data';

export type BatchRunReportsRequest = protos.google.analytics.data.v1beta.IBatchRunReportsRequest;
export type BatchRunReportsResponse = protos.google.analytics.data.v1beta.IBatchRunReportsResponse;
export type RunReportResponse = protos.google.analytics.data.v1beta.IRunReportResponse;
export type Row = protos.google.analytics.data.v1beta.IRow;
export type FilterExpression = protos.google.analytics.data.v1beta.IFilterExpression;

const SEOUL_TIME_ZONE = 'Asia/Seoul';

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

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function resolveDateValue(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: SEOUL_TIME_ZONE }).format(new Date());
  if (value === 'today') return today;
  if (value === 'yesterday') {
    const date = parseIsoDate(today);
    date.setUTCDate(date.getUTCDate() - 1);
    return formatIsoDate(date);
  }

  const match = /^(\d+)daysAgo$/.exec(value);
  if (match) {
    const date = parseIsoDate(today);
    date.setUTCDate(date.getUTCDate() - Number(match[1]));
    return formatIsoDate(date);
  }

  return value;
}

export function expandDateSeries(startDate: string, endDate: string) {
  const resolvedStartDate = resolveDateValue(startDate);
  const resolvedEndDate = resolveDateValue(endDate);
  const dates: string[] = [];

  const current = parseIsoDate(resolvedStartDate);
  const last = parseIsoDate(resolvedEndDate);

  while (current <= last) {
    dates.push(formatIsoDate(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
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

export function fillDailyRows(
  report: RunReportResponse | undefined,
  dateRange: { startDate: string; endDate: string },
  metricNames: string[]
) {
  const rows = reportRowsToObjects(report, ['date'], metricNames).map(row => ({
    ...row,
    date: typeof row.date === 'string' ? normalizeDate(row.date) : row.date,
  })) as Array<{ date: string | null } & Record<string, string | null>>;
  const rowsByDate = new Map(rows.map(row => [String(row.date), row]));

  return expandDateSeries(dateRange.startDate, dateRange.endDate).map(date => {
    const row = rowsByDate.get(date);
    if (row) return row;

    return {
      date,
      ...Object.fromEntries(metricNames.map(metricName => [metricName, '0'])),
    };
  });
}

export function fillDailySourceRows(
  report: RunReportResponse | undefined,
  dateRange: { startDate: string; endDate: string },
  sources: string[]
) {
  const rows = reportRowsToObjects(report, ['date', 'sessionSource'], ['activeUsers']).map(row => ({
    ...row,
    date: typeof row.date === 'string' ? normalizeDate(row.date) : row.date,
  })) as Array<{ date: string | null; sessionSource: string | null; activeUsers: string | null }>;
  const rowsByDateAndSource = new Map(rows.map(row => [`${row.date}|${row.sessionSource}`, row]));

  return expandDateSeries(dateRange.startDate, dateRange.endDate).flatMap(date =>
    sources.map(sessionSource => {
      const row = rowsByDateAndSource.get(`${date}|${sessionSource}`);
      if (row) return row;

      return {
        date,
        sessionSource,
        activeUsers: '0',
      };
    })
  );
}

export function withSharePercent<T extends { activeUsers?: string | null }>(rows: T[]) {
  const total = rows.reduce((sum, row) => sum + Number(row.activeUsers ?? 0), 0);

  return rows.map(row => {
    const activeUsers = Number(row.activeUsers ?? 0);
    return {
      ...row,
      sharePercent: total ? Number(((activeUsers / total) * 100).toFixed(1)) : 0,
    };
  });
}
