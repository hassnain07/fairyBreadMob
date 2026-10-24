import 'react-native-get-random-values';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';

const OPTS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

async function encrypt(key: string, value: string) {
  const k = crypto.getRandomValues(new Uint8Array(32));
  const cipher = new aesjs.ModeOfOperation.ctr(k, new aesjs.Counter(1));
  const enc = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
  await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(k), OPTS);
  return aesjs.utils.hex.fromBytes(enc);
}

async function decrypt(key: string, valueHex: string) {
  try {
    const kHex = await SecureStore.getItemAsync(key, OPTS);
    if (!kHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(kHex), new aesjs.Counter(1));
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(valueHex)));
  } catch (e) {
    console.warn('Decrypt failed (key lost?), treating as signed out', e);
    return null;
  }
}

export const secureStorage = {
  getItem: async (k: string) => {
    const e = await AsyncStorage.getItem(k);
    return e ? decrypt(k, e) : null;
  },
  setItem: async (k: string, v: string) => {
    await AsyncStorage.setItem(k, await encrypt(k, v));
  },
  removeItem: async (k: string) => {
    await AsyncStorage.removeItem(k);
    await SecureStore.deleteItemAsync(k, OPTS);
  },
};
