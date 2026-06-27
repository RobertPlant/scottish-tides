// Tiny persistence wrapper (AsyncStorage: localStorage on web, native store on
// device). All best-effort — failures degrade to in-memory only.

import AsyncStorage from '@react-native-async-storage/async-storage';

const FAV_KEY = 'scottide.favourites';
const LAST_KEY = 'scottide.lastStation';

export async function loadFavourites(): Promise<string[]> {
  try {
    const v = await AsyncStorage.getItem(FAV_KEY);
    return v ? (JSON.parse(v) as string[]) : [];
  } catch {
    return [];
  }
}

export async function saveFavourites(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export async function loadLastStation(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

export async function saveLastStation(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_KEY, id);
  } catch {
    // ignore
  }
}
