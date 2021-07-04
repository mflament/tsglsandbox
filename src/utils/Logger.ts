enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface Logger {
  debug(message: string, ...optionalParams: any[]): void;
  info(message: string, ...optionalParams: any[]): void;
  warn(message: string, ...optionalParams: any[]): void;
  error(message: string, ...optionalParams: any[]): void;
}

class ConsoleLogger implements Logger {
  constructor(private readonly minLevel = LogLevel.DEBUG) {}

  debug(message: string, ...optionalParams: any[]): void {
    if (this.minLevel >= LogLevel.DEBUG) console.debug(message, ...optionalParams);
  }

  info(message: string, ...optionalParams: any[]): void {
    if (this.minLevel >= LogLevel.INFO) console.info(message, ...optionalParams);
  }

  warn(message: string, ...optionalParams: any[]): void {
    if (this.minLevel >= LogLevel.INFO) console.warn(message, ...optionalParams);
  }

  error(message: string, ...optionalParams: any[]): void {
    if (this.minLevel >= LogLevel.ERROR) console.error(message, ...optionalParams);
  }
}

export const LOGGER = new ConsoleLogger(LogLevel.DEBUG);
