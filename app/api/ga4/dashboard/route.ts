import { NextRequest, NextResponse } from 'next/server';
import { protos } from '@google-analytics/data';
import client, { propertyId } from '@/lib/ga4';
import type { BatchRunReportsRequest, BatchRunReportsResponse } from '@/lib/ga4-reports';
import {
  buildDateRange,
  buildViewItemFilter,
  getStringParam,
  normalizeDate,
  reportRowsToObjects,
  reportTotalsToObject,
} from '@/lib/ga4-reports';

export const runtime = 'nodejs';

function getCreatorId(req: NextRequest) {
  return getStringParam(req.nextUrl, 'creator_id') ?? getStringParam(req.nextUrl, 'creator_id_or_path');
}

function getProductId(req: NextRequest) {
  return getStringParam(req.nextUrl, 'product_id') ?? getStringParam(req.nextUrl, 'product_id_or_path');
}

export async function GET(req: NextRequest) {
  const creatorId = getCreatorId(req);
  const productId = getProductId(req);
  const startDate = getStringParam(req.nextUrl, 'start_date');
  const endDate = getStringParam(req.nextUrl, 'end_date');
  const dateRange = buildDateRange(startDate, endDate, '30daysAgo', 'today');

  if (!creatorId) {
    return NextResponse.json({ error: 'creator_id required' }, { status: 400 });
  }

  const viewItemFilter = buildViewItemFilter(creatorId, productId);

  const responseTuple = (await (client.batchRunReports({
    property: `properties/${propertyId}`,
    requests: [
      {
        dateRanges: [dateRange],
        metrics: [
          { name: 'activeUsers' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
        ],
        dimensionFilter: viewItemFilter,
        metricAggregations: [protos.google.analytics.data.v1beta.MetricAggregation.TOTAL],
      },
      {
        dateRanges: [dateRange],
        dimensions: [{ name: 'sessionSource' }],
        metrics: [{ name: 'activeUsers' }],
        dimensionFilter: viewItemFilter,
      },
      {
        dateRanges: [dateRange],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
        ],
        dimensionFilter: viewItemFilter,
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      },
      {
        dateRanges: [dateRange],
        dimensions: [{ name: 'date' }, { name: 'sessionSource' }],
        metrics: [{ name: 'activeUsers' }],
        dimensionFilter: viewItemFilter,
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      },
    ],
  }) as unknown as Promise<[BatchRunReportsResponse, BatchRunReportsRequest | undefined, {} | undefined]>)) as [
    BatchRunReportsResponse,
    BatchRunReportsRequest | undefined,
    {} | undefined,
  ];

  const response = responseTuple[0];
  const summaryReport = response.reports?.[0];
  const sourceReport = response.reports?.[1];
  const dailySummaryReport = response.reports?.[2];
  const dailySourceReport = response.reports?.[3];

  return NextResponse.json({
    propertyId,
    request: {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      creatorId,
      productId,
      eventName: 'view_item',
    },
    summary: reportTotalsToObject(summaryReport, ['activeUsers', 'averageSessionDuration', 'bounceRate']),
    trafficSources: reportRowsToObjects(sourceReport, ['sessionSource'], ['activeUsers']),
    dailyMetrics: reportRowsToObjects(dailySummaryReport, ['date'], ['activeUsers', 'averageSessionDuration', 'bounceRate']).map(row => ({
      ...row,
      date: typeof row.date === 'string' ? normalizeDate(row.date) : row.date,
    })),
    dailySourceBreakdown: reportRowsToObjects(dailySourceReport, ['date', 'sessionSource'], ['activeUsers']).map(row => ({
      ...row,
      date: typeof row.date === 'string' ? normalizeDate(row.date) : row.date,
    })),
  });
}
