import 'react-native-get-random-values';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';

const OPTS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

function getRandomBytes(length: number): Uint8Array {
  try {
    return crypto.getRandomValues(new Uint8Array(length));
  } catch (e) {
    console.warn('crypto.getRandomValues not available (Expo Go?), using fallback', e);
    // Fallback for Expo Go: use Math.random (NOT cryptographically secure, dev only)
    const arr = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }
}

async function encrypt(key: string, value: string) {
  try {
    const k = getRandomBytes(32);
    const cipher = new aesjs.ModeOfOperation.ctr(k, new aesjs.Counter(1));
    const enc = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(k), OPTS);
    return aesjs.utils.hex.fromBytes(enc);
  } catch (e) {
    console.warn('Encryption failed (SecureStore not available?), falling back to plain storage', e);
    return value; // Fallback: store plaintext in Expo Go
  }
}

async function decrypt(key: string, valueHex: string) {
  try {
    const kHex = await SecureStore.getItemAsync(key, OPTS);
    if (!kHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(kHex), new aesjs.Counter(1));
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(valueHex)));
  } catch (e) {
    console.warn('Decrypt failed (Expo Go fallback), treating as signed out', e);
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
    try {
      await SecureStore.deleteItemAsync(k, OPTS);
    } catch {
      // Ignore if SecureStore not available
    }
  },
};
