import 'server-only';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

let client: BetaAnalyticsDataClient | null = null;

export function getGa4Client() {
  if (!client) {
    const credentialsJson = process.env.GA4_SERVICE_ACCOUNT_JSON;
    if (!credentialsJson) {
      throw new Error('GA4_SERVICE_ACCOUNT_JSON is required');
    }

    client = new BetaAnalyticsDataClient({
      credentials: JSON.parse(credentialsJson),
    });
  }

  return client;
}

export function getPropertyId() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    throw new Error('GA4_PROPERTY_ID is required');
  }

  return propertyId;
}
