// Customises the static HTML shell for web (Expo Router). Adds the PWA manifest,
// theme colour, Apple touch metadata and — in production only — registers the
// service worker for offline use. Paths use the configured base URL.

import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const base = process.env.EXPO_BASE_URL || '';
const isProd = process.env.NODE_ENV === 'production';

// Registered only in production so a dev service worker can't serve stale bundles.
const swRegister = `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('${base}/sw.js').catch(function(){})})}`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        <link rel="manifest" href={`${base}/manifest.json`} />
        <meta name="theme-color" content="#0b2942" />
        <meta name="application-name" content="Scottish Tides" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Tides" />
        <link rel="apple-touch-icon" href={`${base}/icon-192.png`} />

        {/* Disable body scrolling on web so ScrollView components behave. */}
        <ScrollViewStyleReset />

        {isProd ? <script dangerouslySetInnerHTML={{ __html: swRegister }} /> : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
