import { NextRequest, NextResponse } from 'next/server';
import { protos } from '@google-analytics/data';
import client, { propertyId } from '@/lib/ga4';
import {
  BatchRunReportsRequest,
  BatchRunReportsResponse,
  getStringParam,
  reportRowsToObjects,
  reportTotalsToObject,
} from '@/lib/ga4-reports';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const creator = getStringParam(req.nextUrl, 'creator');
  const startDate = getStringParam(req.nextUrl, 'start_date') ?? '30daysAgo';
  const endDate = getStringParam(req.nextUrl, 'end_date') ?? 'today';
  const paymentSuccessPath = getStringParam(req.nextUrl, 'payment_success_path');

  if (!creator) return NextResponse.json({ error: 'creator required' }, { status: 400 });

  const [response] = await (client.batchRunReports({
    property: `properties/${propertyId}`,
    requests: [
      {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'activeUsers' }, { name: 'userEngagementDuration' }],
        dimensionFilter: {
          filter: {
          fieldName: 'pagePath',
          stringFilter: {
            matchType: protos.google.analytics.data.v1beta.Filter.StringFilter.MatchType.CONTAINS,
            value: creator,
          },
          },
        },
        metricAggregations: [protos.google.analytics.data.v1beta.MetricAggregation.TOTAL],
      },
      ...(paymentSuccessPath
        ? [
            {
              dateRanges: [{ startDate, endDate }],
              dimensions: [{ name: 'pagePath' }],
              metrics: [{ name: 'activeUsers' }],
              dimensionFilter: {
                filter: {
                  fieldName: 'pagePath',
                  stringFilter: {
                    matchType: protos.google.analytics.data.v1beta.Filter.StringFilter.MatchType.CONTAINS,
                    value: paymentSuccessPath,
                  },
                },
              },
              metricAggregations: [protos.google.analytics.data.v1beta.MetricAggregation.TOTAL],
            },
          ]
        : []),
      {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionSource' }],
        metrics: [{ name: 'activeUsers' }],
        dimensionFilter: {
          filter: {
          fieldName: 'pagePath',
          stringFilter: {
            matchType: protos.google.analytics.data.v1beta.Filter.StringFilter.MatchType.CONTAINS,
            value: creator,
          },
          },
        },
      },
    ],
  }) as Promise<[BatchRunReportsResponse, BatchRunReportsRequest | undefined, {} | undefined]>);

  const creatorReport = response.reports?.[0];
  const paymentReport = paymentSuccessPath ? response.reports?.[1] : undefined;
  const sourceReport = response.reports?.[paymentSuccessPath ? 2 : 1];

  return NextResponse.json({
    propertyId,
    request: {
      startDate,
      endDate,
      creator,
      paymentSuccessPath,
    },
    aggregatedData: {
      creatorPages: reportRowsToObjects(creatorReport, ['pagePath'], ['activeUsers', 'userEngagementDuration']),
      creatorTotals: reportTotalsToObject(creatorReport, ['activeUsers', 'userEngagementDuration']),
      paymentSuccessPages: reportRowsToObjects(paymentReport, ['pagePath'], ['activeUsers']),
      paymentSuccessTotals: reportTotalsToObject(paymentReport, ['activeUsers']),
      trafficSources: reportRowsToObjects(sourceReport, ['sessionSource'], ['activeUsers']),
    },
  });
}
