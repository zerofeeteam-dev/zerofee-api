import { NextRequest, NextResponse } from 'next/server';
import { requireApiToken } from '@/lib/api-auth';
import { getGa4Client, getPropertyId } from '@/lib/ga4';
import type { BatchRunReportsRequest, BatchRunReportsResponse } from '@/lib/ga4-reports';
import { buildDateRange, buildViewItemFilter, fillDailyRows, fillDailySourceRows, getStringParam, reportRowsToObjects } from '@/lib/ga4-reports';

export const runtime = 'nodejs';

function getCreatorId(req: NextRequest) {
  return getStringParam(req.nextUrl, 'creator_id') ?? getStringParam(req.nextUrl, 'creator_id_or_path');
}

function getProductId(req: NextRequest) {
  return getStringParam(req.nextUrl, 'product_id') ?? getStringParam(req.nextUrl, 'product_id_or_path');
}

export async function GET(req: NextRequest) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  const creatorId = getCreatorId(req);
  const productId = getProductId(req);
  const startDate = getStringParam(req.nextUrl, 'start_date');
  const endDate = getStringParam(req.nextUrl, 'end_date');
  const dateRange = buildDateRange(startDate, endDate, '30daysAgo', 'today');

  if (!creatorId) {
    return NextResponse.json({ error: 'creator_id required' }, { status: 400 });
  }

  const client = getGa4Client();
  const propertyId = getPropertyId();
  const viewItemFilter = buildViewItemFilter(creatorId, productId);

  const responseTuple = (await (client.batchRunReports({
    property: `properties/${propertyId}`,
    requests: [
      {
        dateRanges: [dateRange],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'sessions' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
        ],
        dimensionFilter: viewItemFilter,
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: true }],
      },
      {
        dateRanges: [dateRange],
        dimensions: [{ name: 'date' }, { name: 'sessionSource' }],
        metrics: [{ name: 'sessions' }],
        dimensionFilter: viewItemFilter,
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: true }],
      },
    ],
  }) as unknown as Promise<[BatchRunReportsResponse, BatchRunReportsRequest | undefined, {} | undefined]>)) as [
    BatchRunReportsResponse,
    BatchRunReportsRequest | undefined,
    {} | undefined,
  ];

  const response = responseTuple[0];

  const dailySummaryReport = response.reports?.[0];
  const dailySourceReport = response.reports?.[1];
  const dailyMetrics = fillDailyRows(dailySummaryReport, dateRange, ['sessions', 'averageSessionDuration', 'bounceRate']);
  const sourceNames = Array.from(
    new Set(reportRowsToObjects(dailySourceReport, ['date', 'sessionSource'], ['sessions']).map(row => String(row.sessionSource)))
  ).filter((source): source is string => Boolean(source));
  const dailySourceBreakdown = fillDailySourceRows(dailySourceReport, dateRange, sourceNames);

  return NextResponse.json({
    propertyId,
    request: {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      creatorId,
      productId,
      eventName: 'view_item',
    },
    dailyMetrics,
    dailySourceBreakdown,
  });
}
