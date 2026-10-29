import { describe, expect, it } from 'vitest';
import { allEntries, buildFallback, find, findAll, generic, german, japanese, korean, lookup, search, stats } from './index';
import { genericChassis, genericEngine, genericTrans } from './generic';

const files = { genericEngine, genericTrans, genericChassis, korean, german, japanese };

describe('DTC database', () => {
  it('has a substantial generic set and manufacturer sets', () => {
    expect(generic.length).toBeGreaterThanOrEqual(300);
    for (const list of [korean, german, japanese]) {
      expect(list.length).toBeGreaterThanOrEqual(30);
      expect(list.length).toBeLessThanOrEqual(75);
    }
    expect(stats.total).toBe(allEntries.length);
  });

  it('covers the ranges required by the spec', () => {
    const codes = new Set(generic.map((g) => g.code));
    const must = [
      'P0010', 'P0020', 'P0030', 'P0060', 'P0068', 'P0128', 'P0130', 'P0167', 'P0171', 'P0175', 'P0191', 'P0193',
      'P0200', 'P0206', 'P0217', 'P0222', 'P0230', 'P0234', 'P0299', 'P0300', 'P0312', 'P0325', 'P0335', 'P0340',
      'P0351', 'P0358', 'P0400', 'P0420', 'P0430', 'P0440', 'P0456', 'P0457', 'P0480', 'P0483', 'P0500', 'P0507',
      'P0560', 'P0563', 'P0600', 'P0606', 'P0700', 'P0780', 'P2096', 'P2099', 'P2187', 'P2189', 'P2195', 'P2198',
      'P242F', 'P2463', 'C0035', 'B0001', 'U0001', 'U0100', 'U0101', 'U0121', 'U0140', 'U0151', 'U0155',
    ];
    for (const c of must) expect(codes.has(c), c).toBe(true);
  });

  for (const [name, list] of Object.entries(files)) {
    it(`${name}: every entry is complete and well formed, with no duplicate codes`, () => {
      const seen = new Set<string>();
      for (const e of list) {
        expect(seen.has(e.code), `duplicate ${e.code} in ${name}`).toBe(false);
        seen.add(e.code);
        expect(e.code).toMatch(/^([PCBU][0-9A-F]{4}|[0-9A-F]{4})$/);
        expect(e.title.length).toBeGreaterThan(3);
        expect(e.description.length).toBeGreaterThan(10);
        expect(e.causes.length, e.code).toBeGreaterThan(0);
        expect(e.fixes.length, e.code).toBeGreaterThan(0);
        expect(e.symptoms.length, e.code).toBeGreaterThan(0);
        expect(e.canDrive.length).toBeGreaterThan(5);
        expect(['low', 'medium', 'high', 'critical']).toContain(e.severity);
        expect(e.system.length).toBeGreaterThan(0);
        if (name === 'korean' || name === 'german' || name === 'japanese') expect(e.makes?.length, e.code).toBeGreaterThan(0);
        else expect(e.makes).toBeUndefined();
      }
    });
  }

  it('section matches the code letter', () => {
    for (const e of allEntries) {
      const expected = { P: 'Powertrain', C: 'Chassis', B: 'Body', U: 'Network' }[e.code[0]];
      if (expected) expect(e.section, e.code).toBe(expected);
    }
  });

  it('no duplicate generic codes across generic files', () => {
    const codes = generic.map((g) => g.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  describe('lookup', () => {
    it('prefers the make-specific entry', () => {
      expect(lookup('P0420', 'Hyundai').makes).toContain('Hyundai');
      expect(lookup('P0420', 'Hyundai').description).toMatch(/Hyundai/);
      expect(lookup('P1326', 'Kia').title).toMatch(/Knock/);
      expect(lookup('P1456', 'Honda').title).toMatch(/EVAP/);
      expect(lookup('P1349', 'Toyota').title).toMatch(/VVT/);
    });
    it('falls back to the generic entry when the make has no specific one', () => {
      const e = lookup('P0420', 'Suzuki');
      expect(e.title).toMatch(/Catalyst/);
      const gen = lookup('P0301');
      expect(gen.makes).toBeUndefined();
      expect(lookup('P0301', 'Toyota').title).toBe(gen.title);
    });
    it('does not apply another brand\'s entry', () => {
      expect(find('P1326', 'Toyota')?.makes).toContain('Hyundai'); // only manufacturer entry available
      expect(findAll('P0420').length).toBeGreaterThan(1);
      expect(lookup('P0420', 'Volkswagen').makes).toContain('Volkswagen');
    });
    it('is case and space insensitive', () => {
      expect(lookup(' p0133 ').code).toBe('P0133');
    });
    it('builds a fallback with the correct section for unknown codes', () => {
      const p = lookup('P0999');
      expect(p.fallback).toBe(true);
      expect(p.section).toBe('Powertrain');
      const c = lookup('C0ABC');
      expect(c.section).toBe('Chassis');
      expect(c.description).toMatch(/generic/i);
      const b = lookup('B1234');
      expect(b.section).toBe('Body');
      expect(b.description).toMatch(/manufacturer-specific/i);
      const u = lookup('U2999');
      expect(u.section).toBe('Network');
      expect(u.causes.length).toBeGreaterThan(0);
      expect(u.fixes.length).toBeGreaterThan(0);
    });
    it('derives the subsystem from the third digit', () => {
      expect(buildFallback('P1771').description).toMatch(/transmission/);
      expect(buildFallback('P0377').description).toMatch(/ignition/);
      expect(buildFallback('P0477').description).toMatch(/emission/);
      expect(buildFallback('P0177').description).toMatch(/fuel and air/);
      expect(buildFallback('P1234').description).toMatch(/manufacturer-specific/);
      expect(buildFallback('P0234').description).not.toMatch(/manufacturer-specific/);
    });
  });

  it('search finds by code and keyword with filters', () => {
    expect(search('P0301')[0].code).toBe('P0301');
    expect(search('catalyst').some((e) => e.code === 'P0420')).toBe(true);
    expect(search('', { section: 'Network' }).every((e) => e.section === 'Network')).toBe(true);
    expect(search('P1326', { make: 'Generic' })).toHaveLength(0);
    expect(search('knock', { make: 'Hyundai' }).some((e) => e.code === 'P1326')).toBe(true);
  });
});
