/**
 * Specialized Logger for Admin Frontend
 * 
 * Automatically silences non-critical logs in production builds.
 */

const isDev = import.meta.env.DEV;

export const logger = {
  info: (message: string, ...args: any[]) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  debug: (message: string, ...args: any[]) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },

  api: (method: string, url: string, data?: any) => {
    if (isDev) {
      const color = method === 'GET' ? 'color: #4CAF50' : 'color: #2196F3';
      console.log(`%c[API ${method}] %c${url}`, color, 'color: inherit', data || '');
    }
  },

  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  }
};
