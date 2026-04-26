import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('logger Utility', () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('should log info, debug, and api in DEV mode', async () => {
    vi.stubEnv('DEV', true);
    const { logger } = await import('./logger');
    
    logger.info('test info');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO] test info'));

    logger.debug('test debug');
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] test debug'));

    logger.api('GET', '/test');
    expect(logSpy).toHaveBeenCalledTimes(2); // info and api
  });

  it('should NOT log info, debug, and api in PROD mode', async () => {
    vi.stubEnv('DEV', false);
    const { logger } = await import('./logger');
    
    logger.info('test info');
    expect(logSpy).not.toHaveBeenCalled();

    logger.debug('test debug');
    expect(debugSpy).not.toHaveBeenCalled();

    logger.api('GET', '/test');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('should always log warnings and errors', async () => {
    vi.stubEnv('DEV', false);
    const { logger } = await import('./logger');
    
    logger.warn('test warn');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN] test warn'));

    logger.error('test error');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR] test error'));
  });
});
