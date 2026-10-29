import { describe, expect, it } from 'vitest';
import { parseResponse } from './parser';
import { parseVinResponses } from './vin';

describe('parseResponse', () => {
  it('parses a CAN 11-bit single frame', () => {
    expect(parseResponse(['7E8 06 43 02 01 33 01 71'])).toEqual([{ ecu: '7E8', data: [0x43, 0x02, 0x01, 0x33, 0x01, 0x71] }]);
  });

  it('strips CAN padding using the PCI length', () => {
    expect(parseResponse(['7E8 04 41 0C 1A F8 00 00 00'])).toEqual([{ ecu: '7E8', data: [0x41, 0x0c, 0x1a, 0xf8] }]);
  });

  it('reassembles an ISO-TP multi-frame VIN (3 frames -> 17 chars)', () => {
    const lines = [
      '7E8 10 14 49 02 01 31 47 31',
      '7E8 21 4A 43 35 34 34 34 52',
      '7E8 22 37 32 35 32 33 36 37',
    ];
    const res = parseResponse(lines);
    expect(res).toHaveLength(1);
    expect(res[0].ecu).toBe('7E8');
    expect(res[0].data.slice(0, 3)).toEqual([0x49, 0x02, 0x01]);
    const vin = parseVinResponses(res);
    expect(vin).toBe('1G1JC5444R7252367');
    expect(vin).toHaveLength(17);
  });

  it('parses 29-bit CAN headers', () => {
    const res = parseResponse(['18 DA F1 10 06 41 00 BE 3F A8 13']);
    expect(res).toEqual([{ ecu: '18DAF110', data: [0x41, 0x00, 0xbe, 0x3f, 0xa8, 0x13] }]);
  });

  it('handles multiple ECUs with interleaved multi-frame lines', () => {
    const res = parseResponse([
      '7E8 10 0A 43 04 01 33 01 71',
      '7E9 04 43 01 07 30 00 00 00',
      '7E8 21 03 01 03 02 00 00 00',
    ]);
    expect(res).toHaveLength(2);
    const eng = res.find((r) => r.ecu === '7E8');
    expect(eng?.data).toHaveLength(10);
    expect(res.find((r) => r.ecu === '7E9')?.data).toEqual([0x43, 0x01, 0x07, 0x30]);
  });

  it('parses K-line headers, dropping the checksum', () => {
    expect(parseResponse(['48 6B 10 43 01 33 00 00 00 00 C4'])).toEqual([
      { ecu: '10', data: [0x43, 0x01, 0x33, 0x00, 0x00, 0x00, 0x00] },
    ]);
  });

  it('parses KWP headers (format byte with length)', () => {
    expect(parseResponse(['84 F1 11 41 0C 1A F8 2B'])).toEqual([{ ecu: '11', data: [0x41, 0x0c, 0x1a, 0xf8] }]);
  });

  it('parses K-line VIN messages (5 messages)', () => {
    const msgs = [
      '48 6B 10 49 02 01 00 00 00 31 00',
      '48 6B 10 49 02 02 47 31 4A 43 00',
      '48 6B 10 49 02 03 35 34 34 34 00',
      '48 6B 10 49 02 04 52 37 32 35 00',
      '48 6B 10 49 02 05 32 33 36 37 00',
    ];
    expect(parseVinResponses(parseResponse(msgs))).toBe('1G1JC5444R7252367');
  });

  it('works without headers (ATH0)', () => {
    expect(parseResponse(['41 0C 1A F8'], { headers: false })).toEqual([{ ecu: 'ECU', data: [0x41, 0x0c, 0x1a, 0xf8] }]);
  });

  it('reassembles numbered multi-frame lines without headers', () => {
    const lines = ['014', '0: 49 02 01 31 47 31', '1: 4A 43 35 34 34 34 52', '2: 37 32 35 32 33 36 37'];
    const res = parseResponse(lines, { headers: false });
    expect(res).toHaveLength(1);
    expect(parseVinResponses(res)).toBe('1G1JC5444R7252367');
  });

  it('ignores noise lines', () => {
    const res = parseResponse(['SEARCHING...', 'BUS INIT: ...OK', '', '7E8 06 41 00 BE 3F A8 13', 'NO DATA']);
    expect(res).toHaveLength(1);
    expect(res[0].data[0]).toBe(0x41);
  });

  it('copes with compact output (ATS0)', () => {
    expect(parseResponse(['7E804410C1AF8'])).toEqual([{ ecu: '7E8', data: [0x41, 0x0c, 0x1a, 0xf8] }]);
  });
});
