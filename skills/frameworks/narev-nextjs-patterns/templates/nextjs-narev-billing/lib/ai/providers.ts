import 'server-only';

import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAIMiddleware } from '@ai-billing/openai';
import { createPolarDestination } from '@ai-billing/polar';
import { createNarevPriceResolver, consoleDestination } from '@ai-billing/core';
import { wrapLanguageModel } from 'ai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache middleware at module scope to avoid re-initializing on every request
let _billingMiddleware: ReturnType<typeof createOpenAIMiddleware> | null = null;
let _initAttempted = false;

function getBillingMiddleware() {
  if (_initAttempted) return _billingMiddleware;
  _initAttempted = true;

  const polarAccessToken = process.env.POLAR_ACCESS_TOKEN;
  const polarServer = process.env.POLAR_SERVER as 'sandbox' | 'production' | undefined;

  const destinations = [];

  // Add console destination for local debugging
  if (process.env.NODE_ENV !== 'production') {
    destinations.push(consoleDestination());
  }

  // Add Polar destination if configured
  if (polarAccessToken) {
    destinations.push(
      createPolarDestination({
        accessToken: polarAccessToken,
        server: polarServer ?? 'sandbox',
        eventName: 'llm_usage',
        externalCustomerIdKey: 'userId',
      })
    );
  }

  if (destinations.length === 0) return null;

  const narevApiKey = process.env.NAREV_API_KEY ?? '';

  const priceResolver = createNarevPriceResolver({
    apiKey: narevApiKey,
  });

  _billingMiddleware = createOpenAIMiddleware({
    destinations,
    priceResolver,
  });

  return _billingMiddleware;
}

export function getLanguageModel(modelId: string) {
  const model = openai(modelId);
  const middleware = getBillingMiddleware();
  
  if (!middleware) return model;
  
  return wrapLanguageModel({ model, middleware });
}
