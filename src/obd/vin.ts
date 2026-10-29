import type { EcuResponse } from './parser';
import { MAKES, type MakeInfo, type Region } from '../data/makes';

/** Extract a 17-character VIN from Mode 09 PID 02 responses (CAN reassembled or K-line multi-message). */
export function parseVinResponses(responses: EcuResponse[]): string | undefined {
  let chars = '';
  for (const r of responses) {
    if (r.data[0] !== 0x49 || r.data[1] !== 0x02) continue;
    const body = r.data.slice(3); // skip 49 02 <index/count>
    for (const b of body) if (b >= 0x30 && b <= 0x5a) chars += String.fromCharCode(b);
    if (chars.length >= 17) break;
  }
  const vin = chars.slice(-17);
  return vin.length === 17 ? vin : undefined;
}

const TRANSLIT: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export function computeCheckDigit(vin: string): string {
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = vin[i];
    const v = /\d/.test(c) ? Number(c) : (TRANSLIT[c] ?? 0);
    sum += v * WEIGHTS[i];
  }
  const r = sum % 11;
  return r === 10 ? 'X' : String(r);
}

export function isValidVinFormat(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
}

export function validateCheckDigit(vin: string): boolean {
  return isValidVinFormat(vin) && computeCheckDigit(vin) === vin[8];
}

const YEAR_CHARS = 'ABCDEFGHJKLMNPRSTVWXY123456789';

/** Model year from the 10th character. The 30-year cycle is resolved to the latest year <= current year + 1. */
export function modelYearFromVin(vin: string, now = new Date().getFullYear()): number | undefined {
  const idx = YEAR_CHARS.indexOf(vin[9]);
  if (idx < 0) return undefined;
  const limit = now + 1;
  let year = 1980 + idx;
  while (year + 30 <= limit) year += 30;
  return year;
}

export interface VinInfo {
  vin: string;
  valid: boolean;
  checkDigitOk: boolean;
  wmi: string;
  make?: string;
  region?: Region;
  year?: number;
}

function matchMake(wmi: string): MakeInfo | undefined {
  let best: { make: MakeInfo; len: number } | undefined;
  for (const make of MAKES) {
    for (const prefix of make.wmi) {
      if (wmi.startsWith(prefix) && (!best || prefix.length > best.len)) best = { make, len: prefix.length };
    }
  }
  return best?.make;
}

export function decodeVin(rawVin: string, now?: number): VinInfo {
  const vin = rawVin.trim().toUpperCase();
  const wmi = vin.slice(0, 3);
  const valid = isValidVinFormat(vin);
  const make = matchMake(wmi);
  return {
    vin,
    valid,
    checkDigitOk: valid && computeCheckDigit(vin) === vin[8],
    wmi,
    make: make?.name,
    region: make?.region,
    year: valid ? modelYearFromVin(vin, now) : undefined,
  };
}
