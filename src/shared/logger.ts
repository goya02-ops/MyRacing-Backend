interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  stack?: string;
  name?: string;
  [key: string]: unknown;
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

export const logger = {
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      ...meta,
    };
    if (error instanceof Error) {
      entry.stack = error.stack;
      entry.name = error.name;
    }
    console.error(formatLog(entry));
  },

  info(message: string, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      ...meta,
    };
    console.log(formatLog(entry));
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      ...meta,
    };
    console.warn(formatLog(entry));
  },
};
