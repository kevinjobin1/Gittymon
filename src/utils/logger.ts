/**
 * Structured logging utility for consistent, level-based log output.
 * In development, logs to console with colors.
 * In production (Cloudflare Worker), logs structured JSON.
 */

const IS_WORKER = typeof navigator === 'undefined' && typeof process !== 'undefined' && process?.release?.name === 'node';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel =
  (typeof localStorage !== 'undefined' && (localStorage.getItem('log_level') as LogLevel)) ||
  'info';

function setLogLevel(level: LogLevel) {
  currentLevel = level;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('log_level', level);
  }
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function createLogFn(level: LogLevel) {
  return (message: string, ...meta: unknown[]) => {
    if (LEVELS[level] < LEVELS[currentLevel]) return;

    const timestamp = formatTimestamp();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (IS_WORKER) {
      // Structured JSON for Cloudflare Workers / server logs
      const logEntry = { timestamp, level, message, meta };
      if (level === 'error') {
        console.error(JSON.stringify(logEntry));
      } else if (level === 'warn') {
        console.warn(JSON.stringify(logEntry));
      } else {
        console.log(JSON.stringify(logEntry));
      }
    } else {
      // Colored browser console
      const color =
        level === 'error' ? '\x1b[31m' :
        level === 'warn'  ? '\x1b[33m' :
        level === 'info'  ? '\x1b[36m' :
                            '\x1b[90m';
      const reset = '\x1b[0m';
      console.log(`${color}${prefix}${reset}`, message, ...meta);
    }
  };
}

export const logger = {
  debug: createLogFn('debug'),
  info: createLogFn('info'),
  warn: createLogFn('warn'),
  error: createLogFn('error'),
  /** Create a child logger with a prefixed namespace */
  child: (namespace: string) => ({
    debug: (message: string, ...meta: unknown[]) => logger.debug(`[${namespace}] ${message}`, ...meta),
    info: (message: string, ...meta: unknown[]) => logger.info(`[${namespace}] ${message}`, ...meta),
    warn: (message: string, ...meta: unknown[]) => logger.warn(`[${namespace}] ${message}`, ...meta),
    error: (message: string, ...meta: unknown[]) => logger.error(`[${namespace}] ${message}`, ...meta),
  }),
};
