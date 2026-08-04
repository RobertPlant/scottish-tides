import { Redirect } from 'expo-router';
import Head from 'expo-router/head';

import { useSelectedStation } from '@/lib/selected-station';

// The Station tab's landing (/) is just a redirect to the selected station's
// shareable route, so the canonical view lives at /station/<id> everywhere.
export default function Index() {
  const { stationId, ready } = useSelectedStation();
  return (
    <>
      {/* Every other route titles itself; without one here, react-helmet emits an
          empty <title> over the shell's fallback and the tab shows the URL. */}
      <Head>
        <title>Scottish Tides</title>
      </Head>
      {/* Hold the redirect until the persisted last station is back: on the
          default it would land on the wrong port, and the station screen's "keep
          the context in step with the route" effect would save that over it. */}
      {ready ? <Redirect href={{ pathname: '/station/[id]', params: { id: stationId } }} /> : null}
    </>
  );
}
