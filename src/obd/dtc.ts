import type { EcuResponse } from './parser';
import { isCanEcu } from './parser';

const LETTERS = ['P', 'C', 'B', 'U'] as const;

/** Decode two bytes into a DTC string, e.g. 0x01 0x33 -> "P0133". Returns null for 00 00 padding. */
export function decodeDtc(b1: number, b2: number): string | null {
  if (b1 === 0 && b2 === 0) return null;
  const letter = LETTERS[(b1 >> 6) & 0x03];
  const d1 = (b1 >> 4) & 0x03;
  const rest = (((b1 & 0x0f) << 8) | b2).toString(16).toUpperCase().padStart(3, '0');
  return `${letter}${d1}${rest}`;
}

export function encodeDtc(code: string): [number, number] {
  const m = /^([PCBU])([0-3])([0-9A-F]{3})$/i.exec(code);
  if (!m) throw new Error(`Invalid DTC: ${code}`);
  const letter = LETTERS.indexOf(m[1].toUpperCase() as (typeof LETTERS)[number]);
  const low = parseInt(m[3], 16);
  const b1 = (letter << 6) | (parseInt(m[2], 10) << 4) | (low >> 8);
  return [b1, low & 0xff];
}

export interface FoundDtc {
  code: string;
  ecu: string;
}

export type DtcMode = 0x43 | 0x47 | 0x4a;

/**
 * Parse Mode 03 / 07 / 0A responses.
 * CAN: <sid> <count> <pairs...>; K-line / J1850: <sid> <pairs...> padded with 00 00.
 * Codes are de-duplicated per ECU.
 */
export function parseDtcResponses(responses: EcuResponse[], sid: DtcMode, opts: { can?: boolean } = {}): FoundDtc[] {
  const found: FoundDtc[] = [];
  const seen = new Set<string>();
  for (const r of responses) {
    if (r.data[0] !== sid) continue;
    const can = opts.can ?? isCanEcu(r.ecu);
    const body = r.data.slice(can ? 2 : 1);
    for (let i = 0; i + 1 < body.length; i += 2) {
      const code = decodeDtc(body[i], body[i + 1]);
      if (!code) continue;
      const key = `${r.ecu}|${code}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ code, ecu: r.ecu });
    }
  }
  return found;
}

/** Mode 01 PID 01 response data `41 01 A B C D` -> MIL state and stored DTC count. */
export function parseMonitorStatus(data: number[]): { mil: boolean; count: number } | null {
  if (data[0] !== 0x41 || data[1] !== 0x01 || data.length < 3) return null;
  return { mil: (data[2] & 0x80) !== 0, count: data[2] & 0x7f };
}
