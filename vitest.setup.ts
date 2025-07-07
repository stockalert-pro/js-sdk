// Polyfill for crypto.getRandomValues in Node < 19
import { webcrypto } from 'crypto';

if (typeof globalThis.crypto === 'undefined') {
  // @ts-expect-error - polyfill
  globalThis.crypto = webcrypto;
}

// Alternative approach if webcrypto is not available
if (!globalThis.crypto?.getRandomValues) {
  const nodeCrypto = require('crypto');
  
  if (!globalThis.crypto) {
    // @ts-expect-error - polyfill
    globalThis.crypto = {};
  }
  
  // @ts-expect-error - polyfill
  globalThis.crypto.getRandomValues = function(array: Uint8Array) {
    return nodeCrypto.randomFillSync(array);
  };
}
