import { describe, expect, it } from 'vitest';
import { describeStatus, parseUdsClear, parseUdsReadDtc } from './uds';
import { parseResponse } from './parser';

describe('uds', () => {
  it('parses 59 02 FF with 3-byte DTCs and status', () => {
    const r = parseUdsReadDtc([0x59, 0x02, 0xff, 0x01, 0x33, 0x1c, 0x2f, 0xc1, 0x00, 0x00, 0x08]);
    expect(r).toEqual({
      ok: true,
      statusMask: 0xff,
      dtcs: [
        { code: 'P0133', failureType: '1C', status: 0x2f },
        { code: 'U0100', failureType: '00', status: 0x08 },
      ],
    });
  });
  it('parses a positive response with no DTCs', () => {
    expect(parseUdsReadDtc([0x59, 0x02, 0xff])).toEqual({ ok: true, statusMask: 0xff, dtcs: [] });
  });
  it('maps the negative response 7F 19 11', () => {
    const r = parseUdsReadDtc([0x7f, 0x19, 0x11]);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.nrc).toBe(0x11);
      expect(r.reason).toMatch(/not supported/i);
    }
  });
  it('works on a reassembled multi-frame CAN reply', () => {
    const res = parseResponse([
      '7D9 10 0B 59 02 FF C0 03 11 2F',
      '7D9 21 01 33 00 08 00 00 00',
    ]);
    const r = parseUdsReadDtc(res[0].data);
    expect(r.ok && r.dtcs.map((d) => d.code)).toEqual(['U0003', 'P0133']);
  });
  it('parses clear responses', () => {
    expect(parseUdsClear([0x54])).toEqual({ ok: true });
    expect(parseUdsClear([0x7f, 0x14, 0x22]).ok).toBe(false);
  });
  it('describes status bits', () => {
    expect(describeStatus(0x2f)).toContain('confirmed');
    expect(describeStatus(0x00)).toEqual(['history']);
  });
});
