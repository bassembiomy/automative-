/** One logical OBD response from one ECU. `data` starts with the service byte (e.g. 0x43). */
export interface EcuResponse {
  ecu: string;
  data: number[];
}

export interface ParseOptions {
  /** false when the adapter runs with ATH0 (no header bytes in the output). Default true. */
  headers?: boolean;
}

const HEX_LINE = /^[0-9A-F\s]+$/;

export const toHex = (bytes: number[]): string => bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

export function hexToBytes(text: string): number[] {
  const clean = text.replace(/[^0-9A-Fa-f]/g, '');
  const out: number[] = [];
  for (let i = 0; i + 1 < clean.length; i += 2) out.push(parseInt(clean.slice(i, i + 2), 16));
  return out;
}

function tokenize(line: string): string[] {
  if (/\s/.test(line)) return line.split(/\s+/).filter(Boolean);
  // No spaces (ATS0): odd length means an 11-bit CAN header (3 chars) in front.
  const tokens: string[] = [];
  let i = 0;
  if (line.length % 2 === 1) {
    tokens.push(line.slice(0, 3));
    i = 3;
  }
  for (; i < line.length; i += 2) tokens.push(line.slice(i, i + 2));
  return tokens;
}

interface Pending {
  len: number;
  buf: number[];
}

/**
 * Convert raw adapter lines into per-ECU responses.
 * Handles CAN 11/29-bit with ISO-TP (single, first and consecutive frames), K-line / J1850 frames
 * (3 header bytes + data + checksum) and the header-less mode.
 */
export function parseResponse(lines: string[], opts: ParseOptions = {}): EcuResponse[] {
  const headers = opts.headers !== false;
  const out: EcuResponse[] = [];
  const pending = new Map<string, Pending>();

  // header-less multi-frame state
  let noHdrLen = 0;
  let noHdrBuf: number[] | null = null;
  const flushNoHdr = () => {
    if (noHdrBuf) {
      out.push({ ecu: 'ECU', data: noHdrLen > 0 ? noHdrBuf.slice(0, noHdrLen) : noHdrBuf });
      noHdrBuf = null;
      noHdrLen = 0;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim().toUpperCase().replace(/[<>]/g, '');
    if (!line) continue;

    if (!headers) {
      const multi = /^([0-9A-F]):\s*([0-9A-F\s]*)$/.exec(line);
      if (multi) {
        if (!noHdrBuf) noHdrBuf = [];
        noHdrBuf.push(...hexToBytes(multi[2]));
        continue;
      }
      if (!HEX_LINE.test(line)) continue;
      const compact = line.replace(/\s+/g, '');
      if (/^[0-9A-F]{3}$/.test(compact) && !/\s/.test(line)) {
        flushNoHdr();
        noHdrLen = parseInt(compact, 16);
        noHdrBuf = [];
        continue;
      }
      flushNoHdr();
      const bytes = hexToBytes(line);
      if (bytes.length) out.push({ ecu: 'ECU', data: bytes });
      continue;
    }

    if (!HEX_LINE.test(line)) continue; // noise: SEARCHING..., BUS INIT: OK, NO DATA ...
    const tokens = tokenize(line);
    if (tokens.length < 2) continue;

    if (tokens[0].length === 3) {
      // CAN 11-bit
      handleCan(tokens[0], tokens.slice(1).map((t) => parseInt(t, 16)), out, pending);
    } else if (tokens.length >= 5 && /^1[0-9A-F]$/.test(tokens[0]) && (tokens[1] === 'DA' || tokens[1] === 'DB')) {
      // CAN 29-bit: 18 DA F1 10 <pci> ...
      handleCan(tokens.slice(0, 4).join(''), tokens.slice(4).map((t) => parseInt(t, 16)), out, pending);
    } else if (tokens.length >= 5) {
      // K-line / J1850: format, target, source, data..., checksum
      const bytes = tokens.map((t) => parseInt(t, 16));
      out.push({ ecu: tokens[2], data: bytes.slice(3, -1) });
    }
  }

  flushNoHdr();
  // Incomplete multi-frame messages: return what we have.
  for (const [ecu, p] of pending) out.push({ ecu, data: p.buf.slice(0, p.len) });
  return out;
}

function handleCan(ecu: string, bytes: number[], out: EcuResponse[], pending: Map<string, Pending>): void {
  if (bytes.length === 0 || bytes.some((b) => Number.isNaN(b))) return;
  const pci = bytes[0];
  const type = pci >> 4;
  if (type === 0) {
    const len = pci & 0x0f;
    out.push({ ecu, data: bytes.slice(1, 1 + len) });
  } else if (type === 1) {
    const len = ((pci & 0x0f) << 8) | (bytes[1] ?? 0);
    pending.set(ecu, { len, buf: bytes.slice(2) });
  } else if (type === 2) {
    const p = pending.get(ecu);
    if (!p) return;
    p.buf.push(...bytes.slice(1));
    if (p.buf.length >= p.len) {
      out.push({ ecu, data: p.buf.slice(0, p.len) });
      pending.delete(ecu);
    }
  }
  // type 3 = flow control frame, ignored
}

/** Does this ECU identifier look like a CAN identifier (as opposed to a K-line source address)? */
export const isCanEcu = (ecu: string): boolean => ecu.length >= 3;
