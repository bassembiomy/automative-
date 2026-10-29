import { decodeDtc } from './dtc';

export interface UdsDtc {
  code: string;
  /** Failure type byte (third byte of the 3-byte UDS DTC) as two hex digits, shown as "-XX". */
  failureType: string;
  status: number;
}

export type UdsReadResult =
  | { ok: true; statusMask: number; dtcs: UdsDtc[] }
  | { ok: false; nrc: number; reason: string };

export const UDS_READ_DTC_REQUEST = '1902FF';
export const UDS_CLEAR_DTC_REQUEST = '14FFFFFF';

const NRC: Record<number, string> = {
  0x10: 'General reject',
  0x11: 'Service not supported',
  0x12: 'Sub-function not supported',
  0x13: 'Incorrect message length',
  0x22: 'Conditions not correct',
  0x31: 'Request out of range',
  0x33: 'Security access denied',
  0x78: 'Response pending',
};

export function nrcText(nrc: number): string {
  return NRC[nrc] ?? `Negative response 0x${nrc.toString(16).toUpperCase().padStart(2, '0')}`;
}

/** Parse the data of a UDS ReadDTCInformation (0x19 0x02) reply: `59 02 <mask> [DTC(3) status]...` or `7F 19 <nrc>`. */
export function parseUdsReadDtc(data: number[]): UdsReadResult {
  if (data[0] === 0x7f) {
    const nrc = data[2] ?? 0;
    return { ok: false, nrc, reason: nrcText(nrc) };
  }
  if (data[0] !== 0x59 || data[1] !== 0x02) return { ok: false, nrc: 0, reason: 'Unexpected response' };
  const statusMask = data[2] ?? 0;
  const dtcs: UdsDtc[] = [];
  for (let i = 3; i + 3 < data.length; i += 4) {
    const code = decodeDtc(data[i], data[i + 1]);
    if (!code) continue;
    dtcs.push({ code, failureType: data[i + 2].toString(16).toUpperCase().padStart(2, '0'), status: data[i + 3] });
  }
  return { ok: true, statusMask, dtcs };
}

export interface UdsClearResult {
  ok: boolean;
  reason?: string;
}

export function parseUdsClear(data: number[]): UdsClearResult {
  if (data[0] === 0x54) return { ok: true };
  if (data[0] === 0x7f) return { ok: false, reason: nrcText(data[2] ?? 0) };
  return { ok: false, reason: 'Unexpected response' };
}

/** Human-readable status bits of a UDS DTC status byte. */
export function describeStatus(status: number): string[] {
  const out: string[] = [];
  if (status & 0x01) out.push('test failed');
  if (status & 0x08) out.push('confirmed');
  if (status & 0x04) out.push('pending');
  if (status & 0x80) out.push('warning light requested');
  return out.length ? out : ['history'];
}
