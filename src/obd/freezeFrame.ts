import { decodePid, PID_MAP } from './pids';

export interface FreezeFrameValue {
  pid: number;
  name: string;
  value: number;
  unit: string;
}

export interface FreezeFrame {
  dtc?: string;
  values: FreezeFrameValue[];
}

/** PIDs requested for the freeze-frame snapshot. */
export const FREEZE_PIDS = [0x04, 0x05, 0x06, 0x07, 0x0b, 0x0c, 0x0d, 0x0f, 0x11] as const;

/** Parse a Mode 02 reply `42 <pid> <frame> <data...>` into a value. */
export function parseFreezeValue(data: number[]): FreezeFrameValue | undefined {
  if (data[0] !== 0x42 || data.length < 4) return undefined;
  const pid = data[1];
  const def = PID_MAP.get(pid);
  if (!def) return undefined;
  const value = decodePid(pid, data.slice(3));
  return value === undefined ? undefined : { pid, name: def.name, value, unit: def.unit };
}
