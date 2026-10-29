import { describe, expect, it } from 'vitest';
import { buildSupportedBitmap, decodeMode01, decodePid, encodePid, parseSupportedPids, PIDS, toDisplayUnit } from './pids';

describe('pids', () => {
  it('decodes RPM 41 0C 1A F8 -> 1726', () => {
    expect(decodeMode01([0x41, 0x0c, 0x1a, 0xf8])).toEqual({ pid: 0x0c, value: 1726 });
  });
  it('decodes coolant 41 05 7B -> 83 C', () => {
    expect(decodeMode01([0x41, 0x05, 0x7b])).toEqual({ pid: 0x05, value: 83 });
  });
  it('decodes speed, load, trims and voltage', () => {
    expect(decodePid(0x0d, [88])).toBe(88);
    expect(decodePid(0x04, [255])).toBeCloseTo(100);
    expect(decodePid(0x06, [128])).toBeCloseTo(0);
    expect(decodePid(0x06, [0])).toBeCloseTo(-100);
    expect(decodePid(0x42, [0x38, 0x4a])).toBeCloseTo(14.41, 2);
    expect(decodePid(0x10, [0x01, 0x90])).toBeCloseTo(4);
  });
  it('returns undefined for unknown / short data', () => {
    expect(decodePid(0xff, [1])).toBeUndefined();
    expect(decodePid(0x0c, [1])).toBeUndefined();
  });
  it('decodes a supported-PID bitmap', () => {
    expect(parseSupportedPids(0x00, [0xbe, 0x3f, 0xa8, 0x13])).toEqual([
      0x01, 0x03, 0x04, 0x05, 0x06, 0x07, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x13, 0x15, 0x1c, 0x1f, 0x20,
    ]);
    expect(parseSupportedPids(0x20, [0x80, 0, 0, 0])).toEqual([0x21]);
  });
  it('builds a bitmap that round-trips', () => {
    const supported = [0x04, 0x05, 0x0c, 0x0d, 0x11, 0x21, 0x42];
    const bm = buildSupportedBitmap(0x00, supported);
    expect(parseSupportedPids(0x00, bm).filter((p) => p !== 0x20)).toEqual([0x04, 0x05, 0x0c, 0x0d, 0x11]);
    expect(parseSupportedPids(0x20, buildSupportedBitmap(0x20, supported)).filter((p) => p !== 0x40)).toEqual([0x21]);
  });
  it('encode and decode agree for every PID', () => {
    for (const def of PIDS) {
      const mid = (def.min + def.max) / 2;
      const back = decodePid(def.pid, encodePid(def.pid, mid));
      expect(back).toBeDefined();
      expect(Math.abs((back as number) - mid)).toBeLessThanOrEqual(Math.max(def.scale, 0.01) * 1.01);
    }
  });
  it('converts units', () => {
    expect(toDisplayUnit(100, '°C', true)).toEqual({ value: 212, unit: '°F' });
    expect(toDisplayUnit(100, '°C', false)).toEqual({ value: 100, unit: '°C' });
  });
});
