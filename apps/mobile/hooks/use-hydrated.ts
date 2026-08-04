// False while the server-rendered HTML is being produced and during the client's
// hydration pass; true from the first render after that.
//
// The web build is a static export (app.json `web.output: "static"`), so every
// page is rendered once at build time and shipped as HTML. Anything derived from
// the clock — which day "today" is, the tide times on it, "in 1h 26m" — is
// therefore frozen at the build, and disagrees with the client, which both
// breaks hydration (React error #418) and paints stale tide times until the
// bundle takes over. Screens gate that content on this so the exported HTML
// contains only what is actually true for every visitor.
//
// `useSyncExternalStore` rather than a setState-in-an-effect flag: the server
// snapshot is the whole point of its third argument, and it costs no effect and
// no cascading render.

import { useSyncExternalStore } from 'react';

/** Nothing ever changes, so the subscription is a no-op. */
const subscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
