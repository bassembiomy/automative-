import type { Transport } from './Transport';
import { DEFAULT_BAUD } from './Transport';

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.serial;
}

/** Web Serial transport for USB ELM327 adapters. `open()` must be called from a user gesture. */
export class SerialTransport implements Transport {
  readonly kind = 'serial' as const;
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private listeners = new Set<(chunk: string) => void>();
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private opened = false;
  private readLoop: Promise<void> | null = null;

  constructor(private baudRate: number = DEFAULT_BAUD) {}

  get isOpen(): boolean {
    return this.opened;
  }

  async open(): Promise<void> {
    if (!navigator.serial) throw new Error('Web Serial is not available in this browser. Use Chrome or Edge on desktop.');
    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate: this.baudRate });
    if (!this.port.readable || !this.port.writable) throw new Error('Serial port is not readable/writable');
    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();
    this.opened = true;
    this.readLoop = this.pump();
  }

  private async pump(): Promise<void> {
    const reader = this.reader;
    if (!reader) return;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const text = this.decoder.decode(value, { stream: true });
          this.listeners.forEach((l) => l(text));
        }
      }
    } catch {
      // device unplugged or reader cancelled
    } finally {
      this.opened = false;
    }
  }

  async write(data: string): Promise<void> {
    if (!this.writer) throw new Error('Serial port is not open');
    await this.writer.write(this.encoder.encode(data));
  }

  onData(cb: (chunk: string) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async close(): Promise<void> {
    this.opened = false;
    try {
      await this.reader?.cancel();
    } catch {
      /* ignore */
    }
    try {
      await this.readLoop;
    } catch {
      /* ignore */
    }
    try {
      this.reader?.releaseLock();
      this.writer?.releaseLock();
    } catch {
      /* ignore */
    }
    try {
      await this.port?.close();
    } catch {
      /* ignore */
    }
    this.reader = null;
    this.writer = null;
    this.port = null;
    this.listeners.clear();
  }
}
