import { NextRequest, NextResponse } from 'next/server';
import { protos } from '@google-analytics/data';
import { getGa4Client, getPropertyId } from '@/lib/ga4';
import type { BatchRunReportsRequest, BatchRunReportsResponse } from '@/lib/ga4-reports';
import { buildDateRange, buildViewItemFilter, getStringParam, reportRowsToObjects, reportTotalsToObject, withSharePercent } from '@/lib/ga4-reports';

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

  const client = getGa4Client();
  const propertyId = getPropertyId();
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
    ],
  }) as unknown as Promise<[BatchRunReportsResponse, BatchRunReportsRequest | undefined, {} | undefined]>)) as [
    BatchRunReportsResponse,
    BatchRunReportsRequest | undefined,
    {} | undefined,
  ];

  const response = responseTuple[0];

  const summaryReport = response.reports?.[0];
  const sourceReport = response.reports?.[1];

  const summaryTotals = reportTotalsToObject(summaryReport, ['activeUsers', 'averageSessionDuration', 'bounceRate']);

  return NextResponse.json({
    propertyId,
    request: {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      creatorId,
      productId,
      eventName: 'view_item',
    },
    summary: summaryTotals,
    trafficSources: withSharePercent(reportRowsToObjects(sourceReport, ['sessionSource'], ['activeUsers'])).filter(
      row => Boolean(row.sessionSource)
    ),
  });
}
