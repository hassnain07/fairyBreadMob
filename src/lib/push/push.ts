export type PushState = 'unsupported' | 'denied' | 'default' | 'granted';

export async function ensureChannel() {}

export async function pushState(): Promise<PushState> {
  return 'unsupported';
}

export async function enablePush(): Promise<'ok' | PushState> {
  return 'unsupported';
}

export async function syncPushToken(): Promise<string | null> {
  return null;
}

export async function disablePushForThisDevice() {}

export function startPushListeners(_onToast: (n: { title: string; body: string; url?: string }) => void) {
  return () => {};
}
