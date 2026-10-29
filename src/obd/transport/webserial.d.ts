// Minimal Web Serial API typings (Chrome / Edge).
interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}
interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}
interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  getInfo(): SerialPortInfo;
}
interface SerialPortFilter {
  usbVendorId?: number;
  usbProductId?: number;
}
interface SerialPortRequestOptions {
  filters?: SerialPortFilter[];
}
interface Serial {
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}
interface Navigator {
  readonly serial?: Serial;
}
