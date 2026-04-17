import { NextRequest, NextResponse } from 'next/server';
import client, { propertyId } from '@/lib/ga4';

export async function GET(req: NextRequest) {
  const creator = req.nextUrl.searchParams.get('creator');
  if (!creator) return NextResponse.json({ error: 'creator required' }, { status: 400 });

  const pathFilter = `/product/${creator}-`;

  const [statsRes, sourcesRes] = await Promise.all([
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { matchType: 'BEGINS_WITH', value: pathFilter },
        },
      },
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
      ],
    }),
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionSource' }],
      metrics: [{ name: 'sessions' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { matchType: 'BEGINS_WITH', value: pathFilter },
        },
      },
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    }),
  ]);

  const stats = statsRes[0].rows?.[0]?.metricValues;
  const sources = sourcesRes[0].rows?.map(row => ({
    source: row.dimensionValues?.[0]?.value,
    sessions: row.metricValues?.[0]?.value,
  }));

  return NextResponse.json({
    pageViews: stats?.[0]?.value,
    activeUsers: stats?.[1]?.value,
    avgSessionDuration: stats?.[2]?.value,
    bounceRate: stats?.[3]?.value,
    trafficSources: sources,
  });
}