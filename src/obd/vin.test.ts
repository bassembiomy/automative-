import { describe, expect, it } from 'vitest';
import { computeCheckDigit, decodeVin, modelYearFromVin, validateCheckDigit } from './vin';

describe('vin', () => {
  it('decodes a Korean VIN (Hyundai 2015)', () => {
    const vin = 'KMHDH4AE' + '0' + 'FU123456';
    const full = vin.slice(0, 8) + computeCheckDigit(vin) + vin.slice(9);
    const info = decodeVin(full, 2026);
    expect(info.make).toBe('Hyundai');
    expect(info.region).toBe('Korean');
    expect(info.year).toBe(2015);
    expect(info.checkDigitOk).toBe(true);
  });
  it('decodes a German VIN (VW 2012) and reports an unused check digit', () => {
    const info = decodeVin('WVWZZZ1KZCW123456', 2026);
    expect(info.make).toBe('Volkswagen');
    expect(info.region).toBe('German');
    expect(info.year).toBe(2012);
    expect(info.checkDigitOk).toBe(false);
  });
  it('decodes a Japanese VIN (Toyota 2004)', () => {
    const info = decodeVin('JTDBR32E342123456', 2026);
    expect(info.make).toBe('Toyota');
    expect(info.region).toBe('Japanese');
    expect(info.year).toBe(2004);
  });
  it('decodes Chinese VINs (SAIC MG 2021, MG Rover 2004, BYD 2023)', () => {
    const mg = decodeVin('LSJW74U93MZ123456', 2026);
    expect(mg.make).toBe('MG');
    expect(mg.region).toBe('Chinese');
    expect(mg.year).toBe(2021);
    expect(decodeVin('SARRDZBHT4D123456', 2026).make).toBe('MG');
    expect(decodeVin('LGXCE4CB0P0123456', 2026)).toMatchObject({ make: 'BYD', year: 2023 });
  });
  it('prefers the longest WMI match (Lexus JTH over Toyota JT, Toyota 1NX over Nissan 1N)', () => {
    expect(decodeVin('JTHBK1GG5E2123456').make).toBe('Lexus');
    expect(decodeVin('1NXBR32E34Z123456').make).toBe('Toyota');
    expect(decodeVin('1N4AL3AP8DC123456').make).toBe('Nissan');
  });
  it('validates the standard example check digit', () => {
    expect(validateCheckDigit('1M8GDM9AXKP042788')).toBe(true);
    expect(validateCheckDigit('1M8GDM9A1KP042788')).toBe(false);
  });
  it('resolves model years', () => {
    expect(modelYearFromVin('111111111A1111111', 2026)).toBe(2010);
    expect(modelYearFromVin('111111111Y1111111', 2026)).toBe(2000);
    expect(modelYearFromVin('111111111C1111111', 2026)).toBe(2012);
    expect(modelYearFromVin('111111111T1111111', 2026)).toBe(2026);
    expect(modelYearFromVin('111111111A1111111', 2040)).toBe(2040);
  });
  it('rejects invalid VINs', () => {
    const info = decodeVin('ABC');
    expect(info.valid).toBe(false);
    expect(info.year).toBeUndefined();
  });
});
