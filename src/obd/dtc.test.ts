import { describe, expect, it } from 'vitest';
import { decodeDtc, encodeDtc, parseDtcResponses, parseMonitorStatus } from './dtc';
import { parseResponse } from './parser';

describe('decodeDtc', () => {
  it('decodes each section letter', () => {
    expect(decodeDtc(0x01, 0x33)).toBe('P0133');
    expect(decodeDtc(0xc1, 0x23)).toBe('U0123');
    expect(decodeDtc(0x81, 0x00)).toBe('B0100');
    expect(decodeDtc(0x41, 0x00)).toBe('C0100');
    expect(decodeDtc(0x11, 0x23)).toBe('P1123');
    expect(decodeDtc(0x24, 0x2f)).toBe('P242F');
  });
  it('skips 00 00 padding', () => {
    expect(decodeDtc(0, 0)).toBeNull();
  });
  it('round-trips with encodeDtc', () => {
    for (const code of ['P0420', 'C1234', 'B2A01', 'U3FFF', 'P20EE']) {
      const [a, b] = encodeDtc(code);
      expect(decodeDtc(a, b)).toBe(code);
    }
    expect(() => encodeDtc('X1234')).toThrow();
  });
});

describe('parseDtcResponses', () => {
  it('parses a CAN Mode 03 response with count byte', () => {
    const res = parseResponse(['7E8 06 43 02 01 33 01 71']);
    expect(parseDtcResponses(res, 0x43)).toEqual([
      { code: 'P0133', ecu: '7E8' },
      { code: 'P0171', ecu: '7E8' },
    ]);
  });
  it('parses K-line responses and ignores 00 00 padding', () => {
    const res = parseResponse(['48 6B 10 43 01 33 00 00 00 00 C4']);
    expect(parseDtcResponses(res, 0x43)).toEqual([{ code: 'P0133', ecu: '10' }]);
  });
  it('handles an empty CAN response', () => {
    const res = parseResponse(['7E8 02 43 00 00 00 00 00']);
    expect(parseDtcResponses(res, 0x43)).toEqual([]);
  });
  it('keeps the ECU source for multiple ECUs and de-duplicates', () => {
    const res = parseResponse([
      '7E8 04 43 01 03 01 00',
      '7E9 04 43 01 07 30 00',
      '7E8 04 43 01 03 01 00',
    ]);
    expect(parseDtcResponses(res, 0x43)).toEqual([
      { code: 'P0301', ecu: '7E8' },
      { code: 'P0730', ecu: '7E9' },
    ]);
  });
  it('parses a multi-frame CAN Mode 03 response with more than 3 codes', () => {
    const res = parseResponse([
      '7E8 10 0A 43 04 01 33 01 71',
      '7E8 21 03 01 03 02 00 00 00',
    ]);
    expect(parseDtcResponses(res, 0x43).map((d) => d.code)).toEqual(['P0133', 'P0171', 'P0301', 'P0302']);
  });
  it('ignores responses with another service id', () => {
    const res = parseResponse(['7E8 06 47 02 01 33 01 71']);
    expect(parseDtcResponses(res, 0x43)).toEqual([]);
    expect(parseDtcResponses(res, 0x47)).toHaveLength(2);
  });
});

describe('parseMonitorStatus', () => {
  it('reads MIL and DTC count', () => {
    expect(parseMonitorStatus([0x41, 0x01, 0x83, 0x07, 0xe5, 0x00])).toEqual({ mil: true, count: 3 });
    expect(parseMonitorStatus([0x41, 0x01, 0x00, 0x07])).toEqual({ mil: false, count: 0 });
    expect(parseMonitorStatus([0x41, 0x0c, 0x00])).toBeNull();
  });
});
