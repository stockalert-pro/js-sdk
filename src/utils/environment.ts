export interface Environment {
  isBrowser: boolean;
  isNode: boolean;
  isWorker: boolean;
  isDeno: boolean;
  isJest: boolean;
  isDebug: boolean;
}

export function detectEnvironment(): Environment {
  const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  const isWorker = typeof self !== 'undefined' && typeof (self as { importScripts?: Function }).importScripts === 'function';
  const isDeno = typeof (globalThis as { Deno?: unknown }).Deno !== 'undefined';
  const isJest = typeof process !== 'undefined' && process.env.JEST_WORKER_ID !== undefined;
  const isDebug = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

  return {
    isBrowser: !!isBrowser,
    isNode: !!isNode,
    isWorker: !!isWorker,
    isDeno: !!isDeno,
    isJest: !!isJest,
    isDebug: !!isDebug,
  };
}

export function checkBrowserSecurity(apiKey: string): void {
  const env = detectEnvironment();
  
  if (env.isBrowser && !env.isDebug && !env.isJest) {
    console.warn(
      '[StockAlert SDK] Warning: Using API keys in the browser is insecure. ' +
      'Your API key will be visible to anyone who inspects the page. ' +
      'Consider using a backend proxy to keep your API key secret.'
    );
    
    // Check if API key looks like a production key
    if (!apiKey.includes('test') && !apiKey.includes('demo')) {
      throw new Error(
        'Production API keys cannot be used in browser environments. ' +
        'Please use a backend proxy or a test API key.'
      );
    }
  }
}