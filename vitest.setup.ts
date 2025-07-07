// Polyfill for crypto.getRandomValues in Node < 19
import crypto from 'crypto';

// @ts-expect-error - polyfill
if (!globalThis.crypto) {
  // @ts-expect-error - polyfill
  globalThis.crypto = {};
}

// @ts-expect-error - polyfill
if (!globalThis.crypto.getRandomValues) {
  // @ts-expect-error - polyfill
  globalThis.crypto.getRandomValues = function(array: any) {
    return crypto.randomFillSync(array);
  };
}

// Also polyfill webcrypto if needed
// @ts-expect-error - polyfill
if (!globalThis.crypto.subtle && crypto.webcrypto) {
  // @ts-expect-error - polyfill
  Object.assign(globalThis.crypto, crypto.webcrypto);
}
