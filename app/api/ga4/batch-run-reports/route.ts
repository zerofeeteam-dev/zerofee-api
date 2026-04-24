import { NextResponse } from 'next/server';
import { getGa4Client, getPropertyId } from '@/lib/ga4';
import type { BatchRunReportsRequest, BatchRunReportsResponse } from '@/lib/ga4-reports';

export const runtime = 'nodejs';

async function readJsonBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = (await readJsonBody(req)) as BatchRunReportsRequest | null;

  if (!body || !Array.isArray(body.requests) || body.requests.length === 0) {
    return NextResponse.json({ error: 'requests required' }, { status: 400 });
  }

  const client = getGa4Client();
  const propertyId = getPropertyId();

  const [response] = await (client.batchRunReports({
    property: `properties/${propertyId}`,
    requests: body.requests,
  }) as Promise<[BatchRunReportsResponse, BatchRunReportsRequest | undefined, {} | undefined]>);

  return NextResponse.json({
    ...response,
    propertyId,
  });
}
