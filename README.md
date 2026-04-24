This is a [Next.js](https://nextjs.org) project that proxies GA4 reporting data for Bubble.io.

## GA4 Endpoints

The app expects these environment variables:

- `GA4_PROPERTY_ID`
- `GA4_SERVICE_ACCOUNT_JSON`

Available routes:

- `POST /api/ga4/batch-run-reports`
  - Accepts a GA4 `batchRunReports`-style body with a `requests` array.
  - Returns the raw GA4 batch response plus `propertyId`.
- `GET /api/ga4/aggregated-data`
  - Query params: `creator_id`, optional `product_id`, optional `start_date`, optional `end_date`
  - Defaults to `start_date=30daysAgo` and `end_date=today` when omitted.
  - Returns `view_item` summary metrics and traffic sources with share percentages.
- `GET /api/ga4/day-data-source`
  - Query params: `creator_id`, optional `product_id`, optional `start_date`, optional `end_date`
  - Defaults to `start_date=30daysAgo` and `end_date=today` when omitted.
  - Returns daily `view_item` summary metrics and daily source breakdown for the full requested range.
  - Missing dates are zero-filled so charts can render a continuous series.
- `GET /api/ga4/dashboard`
  - Query params: `creator_id`, optional `product_id`, optional `start_date`, optional `end_date`
  - Returns summary, traffic sources with share percentages, daily metrics, and daily source breakdown in one response.
  - Missing dates are zero-filled so charts can render a continuous series.

Example:

```text
/api/ga4/aggregated-data?creator_id=abc&product_id=123&start_date=2026-04-01&end_date=2026-04-24
```

Single-call dashboard example:

```text
/api/ga4/dashboard?creator_id=abc&product_id=123&start_date=2026-04-01&end_date=2026-04-24
```

## Event Shape

Bubble should send:

```js
gtag('event', 'view_item', {
  creator_id: '...',
  product_id: '...'
});

gtag('event', 'begin_checkout', {
  creator_id: '...',
  product_id: '...'
});
```

Important:

- The API currently reports on `view_item` data.
- `creator_id` and `product_id` must be registered as event-scoped custom dimensions in GA4 before the API can query them.
- Purchase conversion rate is intentionally left to Bubble data, not GA4.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
