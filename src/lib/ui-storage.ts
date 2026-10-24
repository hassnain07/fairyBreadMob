import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'fb-ui:';
const cache = new Map<string, string>();

export async function hydrateUiStorage() {
  const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(PREFIX));
  const pairs = await AsyncStorage.multiGet(keys);
  pairs.forEach(([k, v]) => { if (v != null) cache.set(k.slice(PREFIX.length), v); });
}

export const mmkvUi = {
  set: (k: string, v: string | number | boolean) => { cache.set(k, String(v)); void AsyncStorage.setItem(PREFIX + k, String(v)); },
  getString: (k: string) => cache.get(k),
  delete: (k: string) => { cache.delete(k); void AsyncStorage.removeItem(PREFIX + k); },
  clearAll: () => { const ks = [...cache.keys()]; cache.clear(); void AsyncStorage.multiRemove(ks.map(k => PREFIX + k)); },
};
