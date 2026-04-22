/**
 * sentry.server.config.ts — Sentry server-side (Node.js) initialisation.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',
  tracesSampleRate: process.env.NEXT_PUBLIC_APP_ENV === 'production' ? 0.1 : 1.0,
  enabled: process.env.NEXT_PUBLIC_APP_ENV !== 'development',
});
