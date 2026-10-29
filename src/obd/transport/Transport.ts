export interface Transport {
  readonly kind: 'serial' | 'simulator';
  open(): Promise<void>;
  close(): Promise<void>;
  /** raw ASCII, caller appends "\r" */
  write(data: string): Promise<void>;
  onData(cb: (chunk: string) => void): () => void;
  readonly isOpen: boolean;
}

export const BAUD_RATES = [9600, 38400, 115200, 230400, 500000] as const;
export const DEFAULT_BAUD = 38400;
