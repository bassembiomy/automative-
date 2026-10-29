import type { Region } from '../data/makes';
import { findMake } from '../data/makes';

export interface ModuleDef {
  name: string;
  section: 'Powertrain' | 'Chassis' | 'Body' | 'Network';
  /** Request CAN id (hex, 11-bit) */
  tx: string;
  /** Response CAN id (hex, 11-bit) */
  rx: string;
}

/** Standard OBD-II range 7E0-7E7 (responses 7E8-7EF). */
export const STANDARD_MODULES: ModuleDef[] = [
  { name: 'Engine control (ECM)', section: 'Powertrain', tx: '7E0', rx: '7E8' },
  { name: 'Transmission control (TCM)', section: 'Powertrain', tx: '7E1', rx: '7E9' },
  { name: 'Hybrid / battery control', section: 'Powertrain', tx: '7E2', rx: '7EA' },
  { name: 'Module 7E3 (ABS / chassis, brand dependent)', section: 'Chassis', tx: '7E3', rx: '7EB' },
  { name: 'Module 7E4', section: 'Powertrain', tx: '7E4', rx: '7EC' },
  { name: 'Module 7E5', section: 'Powertrain', tx: '7E5', rx: '7ED' },
  { name: 'Module 7E6', section: 'Powertrain', tx: '7E6', rx: '7EE' },
  { name: 'Module 7E7', section: 'Powertrain', tx: '7E7', rx: '7EF' },
];

const HYUNDAI_KIA: ModuleDef[] = [
  { name: 'ABS / ESC', section: 'Chassis', tx: '7D1', rx: '7D9' },
  { name: 'Airbag (SRS)', section: 'Body', tx: '7D2', rx: '7DA' },
  { name: 'Body control (BCM)', section: 'Body', tx: '770', rx: '778' },
];

const VAG: ModuleDef[] = [
  { name: 'Gateway', section: 'Network', tx: '710', rx: '77A' },
  { name: 'ABS / ESP', section: 'Chassis', tx: '713', rx: '77D' },
  { name: 'Airbag (SRS)', section: 'Body', tx: '715', rx: '77F' },
];

const TOYOTA: ModuleDef[] = [
  { name: 'ABS / VSC', section: 'Chassis', tx: '7B0', rx: '7B8' },
  { name: 'Airbag (SRS)', section: 'Body', tx: '780', rx: '788' },
];

/**
 * Brand-specific extras. Addresses are common but not universal - modules that do not answer
 * standard UDS are simply reported as "not responding".
 */
const EXTRAS: Record<string, ModuleDef[]> = {
  Hyundai: HYUNDAI_KIA,
  Kia: HYUNDAI_KIA,
  Genesis: HYUNDAI_KIA,
  Volkswagen: VAG,
  Audi: VAG,
  Skoda: VAG,
  Seat: VAG,
  Porsche: VAG,
  Toyota: TOYOTA,
  Lexus: TOYOTA,
};

export function candidateModules(make?: string): ModuleDef[] {
  const extras = (make && EXTRAS[make]) || [];
  return [...STANDARD_MODULES, ...extras];
}

export function regionOfMake(make?: string): Region | undefined {
  return make ? findMake(make)?.region : undefined;
}

/** Friendly name for an OBD response ECU id like 7E8. */
export function ecuLabel(ecu: string): string {
  const std = STANDARD_MODULES.find((m) => m.rx === ecu.toUpperCase());
  if (std) return `${std.name} [${ecu}]`;
  return /^[0-9A-F]{2}$/.test(ecu) ? `ECU ${ecu}` : ecu;
}
