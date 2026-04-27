import 'server-only';
import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getBearerToken(header: string | null) {
  const match = /^Bearer\s+(.+)$/i.exec(header ?? '');
  return match?.[1] ?? null;
}

export function requireApiToken(req: Request) {
  const expectedToken = process.env.ZEROFEE_API_TOKEN;

  if (!expectedToken) {
    return NextResponse.json({ error: 'ZEROFEE_API_TOKEN is required' }, { status: 500 });
  }

  const providedToken = req.headers.get('x-api-key') ?? getBearerToken(req.headers.get('authorization'));

  if (!providedToken || !safeEqual(providedToken, expectedToken)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return null;
}
