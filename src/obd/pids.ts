export interface PidDef {
  pid: number;
  name: string;
  unit: string;
  bytes: number;
  scale: number;
  offset: number;
  min: number;
  max: number;
  /** Convert imperial display units if applicable. */
  group: 'engine' | 'fuel' | 'air' | 'misc';
}

const lin = (
  pid: number, name: string, unit: string, bytes: 1 | 2, scale: number, offset: number,
  min: number, max: number, group: PidDef['group'] = 'engine',
): PidDef => ({ pid, name, unit, bytes, scale, offset, min, max, group });

export const PIDS: PidDef[] = [
  lin(0x04, 'Calculated engine load', '%', 1, 100 / 255, 0, 0, 100),
  lin(0x05, 'Coolant temperature', '°C', 1, 1, -40, -40, 215),
  lin(0x06, 'Short term fuel trim (bank 1)', '%', 1, 100 / 128, -100, -100, 99.2, 'fuel'),
  lin(0x07, 'Long term fuel trim (bank 1)', '%', 1, 100 / 128, -100, -100, 99.2, 'fuel'),
  lin(0x08, 'Short term fuel trim (bank 2)', '%', 1, 100 / 128, -100, -100, 99.2, 'fuel'),
  lin(0x09, 'Long term fuel trim (bank 2)', '%', 1, 100 / 128, -100, -100, 99.2, 'fuel'),
  lin(0x0a, 'Fuel pressure', 'kPa', 1, 3, 0, 0, 765, 'fuel'),
  lin(0x0b, 'Intake manifold pressure', 'kPa', 1, 1, 0, 0, 255, 'air'),
  lin(0x0c, 'Engine speed', 'rpm', 2, 0.25, 0, 0, 8000),
  lin(0x0d, 'Vehicle speed', 'km/h', 1, 1, 0, 0, 255),
  lin(0x0e, 'Timing advance', '°', 1, 0.5, -64, -64, 63.5),
  lin(0x0f, 'Intake air temperature', '°C', 1, 1, -40, -40, 215, 'air'),
  lin(0x10, 'Mass air flow', 'g/s', 2, 0.01, 0, 0, 655.35, 'air'),
  lin(0x11, 'Throttle position', '%', 1, 100 / 255, 0, 0, 100, 'air'),
  lin(0x1f, 'Run time since engine start', 's', 2, 1, 0, 0, 65535, 'misc'),
  lin(0x21, 'Distance travelled with MIL on', 'km', 2, 1, 0, 0, 65535, 'misc'),
  lin(0x2f, 'Fuel level', '%', 1, 100 / 255, 0, 0, 100, 'fuel'),
  lin(0x31, 'Distance since codes cleared', 'km', 2, 1, 0, 0, 65535, 'misc'),
  lin(0x33, 'Barometric pressure', 'kPa', 1, 1, 0, 0, 255, 'air'),
  lin(0x42, 'Control module voltage', 'V', 2, 0.001, 0, 0, 20, 'misc'),
  lin(0x46, 'Ambient air temperature', '°C', 1, 1, -40, -40, 215, 'air'),
  lin(0x49, 'Accelerator pedal position D', '%', 1, 100 / 255, 0, 0, 100, 'air'),
  lin(0x5c, 'Engine oil temperature', '°C', 1, 1, -40, -40, 210),
];

export const PID_MAP: ReadonlyMap<number, PidDef> = new Map(PIDS.map((p) => [p.pid, p]));

export const pidHex = (pid: number): string => pid.toString(16).toUpperCase().padStart(2, '0');

/** Raw integer from the PID data bytes (A, or A*256+B). */
export function rawValue(def: PidDef, data: number[]): number {
  return def.bytes === 2 ? (data[0] << 8) | (data[1] ?? 0) : data[0];
}

/** Decode the data bytes of a PID (after `41 <pid>`). */
export function decodePid(pid: number, data: number[]): number | undefined {
  const def = PID_MAP.get(pid);
  if (!def || data.length < def.bytes) return undefined;
  return rawValue(def, data) * def.scale + def.offset;
}

/** Encode a physical value to PID data bytes (used by the simulator). */
export function encodePid(pid: number, value: number): number[] {
  const def = PID_MAP.get(pid);
  if (!def) return [0];
  const clamped = Math.min(def.max, Math.max(def.min, value));
  const raw = Math.max(0, Math.round((clamped - def.offset) / def.scale));
  return def.bytes === 2 ? [(raw >> 8) & 0xff, raw & 0xff] : [raw & 0xff];
}

/** Decode a full Mode 01 response (`41 <pid> <data...>`). */
export function decodeMode01(response: number[]): { pid: number; value: number } | undefined {
  if (response[0] !== 0x41 || response.length < 3) return undefined;
  const value = decodePid(response[1], response.slice(2));
  return value === undefined ? undefined : { pid: response[1], value };
}

/** Decode a supported-PID bitmap (PIDs 00/20/40/60...). `base` is the PID that was requested. */
export function parseSupportedPids(base: number, bitmap: number[]): number[] {
  const pids: number[] = [];
  for (let i = 0; i < 4; i++) {
    const byte = bitmap[i] ?? 0;
    for (let bit = 0; bit < 8; bit++) {
      if (byte & (0x80 >> bit)) pids.push(base + i * 8 + bit + 1);
    }
  }
  return pids;
}

/** Build a supported-PID bitmap for requested PID `base` from a PID list. */
export function buildSupportedBitmap(base: number, supported: number[]): number[] {
  const out = [0, 0, 0, 0];
  const chain = supported.some((p) => p > base + 0x20);
  for (const p of supported) {
    const idx = p - base - 1;
    if (idx < 0 || idx > 31) continue;
    out[idx >> 3] |= 0x80 >> (idx & 7);
  }
  if (chain) out[3] |= 0x01;
  return out;
}

export function toDisplayUnit(value: number, unit: string, imperial: boolean): { value: number; unit: string } {
  if (!imperial) return { value, unit };
  switch (unit) {
    case '°C': return { value: value * 1.8 + 32, unit: '°F' };
    case 'km/h': return { value: value * 0.621371, unit: 'mph' };
    case 'km': return { value: value * 0.621371, unit: 'mi' };
    case 'kPa': return { value: value * 0.145038, unit: 'psi' };
    case 'g/s': return { value: value * 0.132277, unit: 'lb/min' };
    default: return { value, unit };
  }
}
