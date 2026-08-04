import { Redirect } from 'expo-router';

import { useSelectedStation } from '@/lib/selected-station';

// The Station tab's landing (/) is just a redirect to the selected station's
// shareable route, so the canonical view lives at /station/<id> everywhere.
export default function Index() {
  const { stationId, ready } = useSelectedStation();
  // Hold the redirect until the persisted last station is back: on the default
  // it would land on the wrong port, and the station screen's "keep the context
  // in step with the route" effect would then save that default over it.
  if (!ready) {
    return null;
  }
  return <Redirect href={{ pathname: '/station/[id]', params: { id: stationId } }} />;
}
