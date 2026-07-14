import { Redirect } from 'expo-router';

import { useSelectedStation } from '@/lib/selected-station';

// The Station tab's landing (/) is just a redirect to the selected station's
// shareable route, so the canonical view lives at /station/<id> everywhere.
export default function Index() {
  const { stationId } = useSelectedStation();
  return <Redirect href={{ pathname: '/station/[id]', params: { id: stationId } }} />;
}
