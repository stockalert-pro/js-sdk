// Setup file for tests
import { beforeAll } from 'vitest';

// Polyfill crypto.getRandomValues for Node < 19
beforeAll(() => {
  if (typeof globalThis.crypto === 'undefined') {
    globalThis.crypto = {
      getRandomValues: (arr: Uint8Array) => {
        const crypto = require('crypto');
        const bytes = crypto.randomBytes(arr.length);
        arr.set(bytes);
        return arr;
      },
    } as any;
  }
});
