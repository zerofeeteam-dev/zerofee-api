import { BetaAnalyticsDataClient } from '@google-analytics/data';

const client = new BetaAnalyticsDataClient({
  credentials: JSON.parse(process.env.GA4_SERVICE_ACCOUNT_JSON!),
});

export const propertyId = process.env.GA4_PROPERTY_ID!;
export default client;