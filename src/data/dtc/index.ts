import { TEMPLATES, DEFAULT_DRIVE, sectionOf } from './build';
import { generic } from './generic';
import { korean } from './korean';
import { german } from './german';
import { japanese } from './japanese';
import { chinese } from './chinese';
import type { DtcInfo, Section, Severity } from './types';

export type { DtcInfo, Section, Severity } from './types';
export { generic, korean, german, japanese, chinese };

export const manufacturerEntries: DtcInfo[] = [...korean, ...german, ...japanese, ...chinese];
export const allEntries: DtcInfo[] = [...generic, ...manufacturerEntries];

const byCode = new Map<string, DtcInfo[]>();
for (const e of allEntries) {
  const list = byCode.get(e.code) ?? [];
  list.push(e);
  byCode.set(e.code, list);
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidCodeFormat(code: string): boolean {
  return /^[PCBU][0-9A-F]{4}$/.test(code);
}

/** All database entries for a code (generic first). */
export function findAll(code: string): DtcInfo[] {
  return byCode.get(normalizeCode(code)) ?? [];
}

const sameMake = (e: DtcInfo, make: string) => !!e.makes?.some((m) => m.toLowerCase() === make.toLowerCase());

/** Lookup without synthesising a fallback. */
export function find(code: string, make?: string): DtcInfo | undefined {
  const entries = findAll(code);
  if (make) {
    const specific = entries.find((e) => sameMake(e, make));
    if (specific) return specific;
  }
  const gen = entries.find((e) => !e.makes);
  if (gen) return gen;
  return entries[0];
}

const SUBSYSTEMS_P: Record<string, { label: string; tpl: keyof typeof TEMPLATES }> = {
  '0': { label: 'fuel and air metering / auxiliary emission controls', tpl: 'fuelSystem' },
  '1': { label: 'fuel and air metering', tpl: 'fuelTrim' },
  '2': { label: 'fuel and air metering (injector circuits)', tpl: 'injector' },
  '3': { label: 'ignition system or misfire', tpl: 'ignition' },
  '4': { label: 'auxiliary emission controls', tpl: 'evap' },
  '5': { label: 'vehicle speed, cruise control and idle control', tpl: 'idle' },
  '6': { label: 'computer and auxiliary outputs', tpl: 'ecm' },
  '7': { label: 'transmission', tpl: 'trans' },
  '8': { label: 'transmission', tpl: 'trans' },
  '9': { label: 'transmission', tpl: 'trans' },
  A: { label: 'hybrid propulsion', tpl: 'hybrid' },
  B: { label: 'hybrid propulsion', tpl: 'hybrid' },
  C: { label: 'hybrid propulsion', tpl: 'hybrid' },
};

function isGenericCode(code: string): boolean {
  const letter = code[0];
  const d1 = code[1];
  if (letter === 'P') {
    if (d1 === '0' || d1 === '2') return true;
    if (d1 === '3') return code[2] >= '4'; // P30xx-P33xx manufacturer, P34xx+ SAE reserved/generic
    return false;
  }
  return d1 === '0' || d1 === '3';
}

/** Build a meaningful generic explanation for a code that is not in the database. */
export function buildFallback(rawCode: string): DtcInfo {
  const code = normalizeCode(rawCode);
  const section = sectionOf(code);
  const generic_ = isGenericCode(code);
  const kind = generic_ ? 'generic (SAE standard)' : 'manufacturer-specific';
  let tpl: keyof typeof TEMPLATES;
  let subsystem: string;
  let severity: Severity;
  if (section === 'Powertrain') {
    const sub = SUBSYSTEMS_P[code[2]] ?? { label: 'engine and emissions', tpl: 'ecm' as const };
    tpl = sub.tpl;
    subsystem = sub.label;
    severity = ['7', '8', '9'].includes(code[2]) ? 'high' : 'medium';
  } else if (section === 'Chassis') {
    tpl = 'wheel';
    subsystem = 'chassis (ABS, traction control, steering, suspension)';
    severity = 'high';
  } else if (section === 'Body') {
    tpl = 'bodyElec';
    subsystem = 'body systems (airbags, doors, climate, lighting, comfort)';
    severity = 'medium';
  } else {
    tpl = 'netModule';
    subsystem = 'network communication between control modules';
    severity = 'high';
  }
  const t = TEMPLATES[tpl];
  const how = generic_
    ? 'This is a standard code, but it is not in the offline database yet. Check a current SAE J2012 list.'
    : 'Manufacturer-specific codes have a different meaning for each brand, so check the service information for your exact make, model and year.';
  return {
    code,
    title: `${section} code ${code} (${generic_ ? 'generic' : 'manufacturer-specific'}, not in database)`,
    section,
    system: t.system,
    severity,
    description: `${code} is a ${kind} ${section.toLowerCase()} trouble code in the ${subsystem} area. ${how}`,
    symptoms: [...t.symptoms],
    causes: [...t.causes],
    fixes: ['Look up the exact definition for this make, model and year', ...t.fixes],
    canDrive: DEFAULT_DRIVE[severity] + ' The exact meaning is unknown, so treat it cautiously.',
    fallback: true,
  };
}

/** Lookup order: make-specific, generic, fallback built from the code structure. */
export function lookup(code: string, make?: string): DtcInfo {
  return find(code, make) ?? buildFallback(code);
}

export interface SearchFilter {
  section?: Section | 'All';
  make?: string | 'All' | 'Generic';
}

export function search(query: string, filter: SearchFilter = {}): DtcInfo[] {
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  const results = allEntries.filter((e) => {
    if (filter.section && filter.section !== 'All' && e.section !== filter.section) return false;
    if (filter.make && filter.make !== 'All') {
      if (filter.make === 'Generic') {
        if (e.makes) return false;
      } else if (e.makes && !sameMake(e, filter.make)) return false;
    }
    if (tokens.length === 0) return true;
    const hay = `${e.code} ${e.title} ${e.system} ${e.description} ${e.makes?.join(' ') ?? ''}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
  return results.sort((a, b) => a.code.localeCompare(b.code) || (a.makes ? 1 : 0) - (b.makes ? 1 : 0));
}

export const stats = {
  generic: generic.length,
  korean: korean.length,
  german: german.length,
  japanese: japanese.length,
  chinese: chinese.length,
  total: allEntries.length,
};
