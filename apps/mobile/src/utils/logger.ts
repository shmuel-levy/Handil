/* Debug logger — all output goes to Metro terminal (npx expo start) */

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;

function ts() {
  return new Date().toTimeString().slice(0, 8);
}

function truncate(obj: unknown, max = 300): string {
  try {
    const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
    if (!s) return '–';
    return s.length > max ? s.slice(0, max) + ' …' : s;
  } catch {
    return String(obj);
  }
}

const api = {
  request(method: string, url: string, data?: unknown) {
    if (!IS_DEV) return;
    console.log(
      `\n📤 [API] ${ts()} ${method.toUpperCase()} ${url}` +
        (data ? `\n    Body: ${truncate(data)}` : ''),
    );
  },

  response(status: number, url: string, data?: unknown) {
    if (!IS_DEV) return;
    const icon = status < 300 ? '✅' : status < 500 ? '⚠️' : '❌';
    console.log(
      `${icon} [API] ${ts()} ${status} ${url}` +
        (data ? `\n    Data: ${truncate(data)}` : ''),
    );
  },

  error(url: string, err: unknown) {
    if (!IS_DEV) return;
    const e = err as any;
    const status = e?.response?.status ?? 'NO_RESPONSE';
    const msg =
      e?.response?.data?.message ??
      e?.response?.data ??
      e?.message ??
      String(err);
    const code = e?.code ?? '';
    console.error(
      `\n🔴 [API ERROR] ${ts()} ${url}` +
        `\n    Status : ${status}` +
        `\n    Message: ${truncate(msg)}` +
        (code ? `\n    Code   : ${code}` : '') +
        (e?.config?.baseURL ? `\n    BaseURL: ${e.config.baseURL}` : ''),
    );
  },
};

function info(tag: string, ...args: unknown[]) {
  if (IS_DEV) console.log(`ℹ️  [${tag}]`, ...args);
}

function warn(tag: string, ...args: unknown[]) {
  if (IS_DEV) console.warn(`⚠️  [${tag}]`, ...args);
}

function error(tag: string, ...args: unknown[]) {
  if (IS_DEV) console.error(`🔴 [${tag}]`, ...args);
}

export const logger = { api, info, warn, error };
