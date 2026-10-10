import * as fs from 'fs';
import * as path from 'path';
import { FernPathManager } from './paths';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  details?: unknown;
}

export type LogListener = (entry: LogEntry) => void;

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export class FernLogger {
  private currentLogLevel: LogLevel = 'INFO';
  private logStream: fs.WriteStream | null = null;
  private logFilePath: string | null = null;
  private memoryBuffer: LogEntry[] = [];
  private maxBufferSize: number = 1000;
  private listeners: Set<LogListener> = new Set();
  private initialized: boolean = false;

  constructor(private pathManager: FernPathManager) {}

  public setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  public getLogLevel(): LogLevel {
    return this.currentLogLevel;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const logsDir = this.pathManager.getLogsDir();
      await fs.promises.mkdir(logsDir, { recursive: true });

      const dateStr = new Date().toISOString().split('T')[0];
      this.logFilePath = path.join(logsDir, `fern-launcher-${dateStr}.log`);

      this.logStream = fs.createWriteStream(this.logFilePath, { flags: 'a', encoding: 'utf-8' });
      this.initialized = true;

      this.info('FernLogger', `Logging initialized. Output path: ${this.logFilePath}`);
    } catch (err) {
      console.error('Failed to initialize Fern file logger:', err);
    }
  }

  public getLogFilePath(): string | null {
    return this.logFilePath;
  }

  public getRecentLogs(limit?: number): LogEntry[] {
    if (!limit) return [...this.memoryBuffer];
    return this.memoryBuffer.slice(-limit);
  }

  public addListener(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public onLog(listener: LogListener): () => void {
    return this.addListener(listener);
  }

  public debug(tag: string, message: string, details?: unknown): void {
    this.log('DEBUG', tag, message, details);
  }

  public info(tag: string, message: string, details?: unknown): void {
    this.log('INFO', tag, message, details);
  }

  public warn(tag: string, message: string, details?: unknown): void {
    this.log('WARN', tag, message, details);
  }

  public error(tag: string, message: string, details?: unknown): void {
    this.log('ERROR', tag, message, details);
  }

  private log(level: LogLevel, tag: string, message: string, details?: unknown): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.currentLogLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      level,
      tag,
      message,
      details,
    };

    // Keep circular memory buffer
    this.memoryBuffer.push(entry);
    if (this.memoryBuffer.length > this.maxBufferSize) {
      this.memoryBuffer.shift();
    }

    // Format for console & file
    const formatted = `[${timestamp}] [${level.padEnd(5)}] [${tag}] ${message}${
      details !== undefined ? ` | ${JSON.stringify(details)}` : ''
    }`;

    if (level === 'ERROR') {
      console.error(formatted);
    } else if (level === 'WARN') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }

    if (this.logStream) {
      this.logStream.write(formatted + '\n');
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (err) {
        console.error('Log listener error:', err);
      }
    }
  }

  public async close(): Promise<void> {
    if (this.logStream) {
      await new Promise<void>((resolve) => {
        this.logStream?.end(() => resolve());
      });
      this.logStream = null;
    }
  }
}
