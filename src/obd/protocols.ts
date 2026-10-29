export interface ProtocolInfo {
  /** ATDPN number as hex digit string, e.g. "6" */
  id: string;
  name: string;
  can: boolean;
  /** 29-bit CAN identifiers */
  extended: boolean;
  family: 'J1850' | 'ISO9141' | 'KWP' | 'CAN' | 'J1939' | 'USER' | 'AUTO' | 'UNKNOWN';
}

const TABLE: Record<string, Omit<ProtocolInfo, 'id'>> = {
  '0': { name: 'Automatic', can: false, extended: false, family: 'AUTO' },
  '1': { name: 'SAE J1850 PWM (41.6 kbaud)', can: false, extended: false, family: 'J1850' },
  '2': { name: 'SAE J1850 VPW (10.4 kbaud)', can: false, extended: false, family: 'J1850' },
  '3': { name: 'ISO 9141-2 (5 baud init)', can: false, extended: false, family: 'ISO9141' },
  '4': { name: 'ISO 14230-4 KWP (5 baud init)', can: false, extended: false, family: 'KWP' },
  '5': { name: 'ISO 14230-4 KWP (fast init)', can: false, extended: false, family: 'KWP' },
  '6': { name: 'ISO 15765-4 CAN (11 bit, 500 kbaud)', can: true, extended: false, family: 'CAN' },
  '7': { name: 'ISO 15765-4 CAN (29 bit, 500 kbaud)', can: true, extended: true, family: 'CAN' },
  '8': { name: 'ISO 15765-4 CAN (11 bit, 250 kbaud)', can: true, extended: false, family: 'CAN' },
  '9': { name: 'ISO 15765-4 CAN (29 bit, 250 kbaud)', can: true, extended: true, family: 'CAN' },
  A: { name: 'SAE J1939 CAN (29 bit, 250 kbaud)', can: true, extended: true, family: 'J1939' },
  B: { name: 'User1 CAN (11 bit, 125 kbaud)', can: true, extended: false, family: 'USER' },
  C: { name: 'User2 CAN (11 bit, 50 kbaud)', can: true, extended: false, family: 'USER' },
};

/** Parse the reply of ATDPN, e.g. "A6" (auto-detected protocol 6) or "3". */
export function protocolFromDpn(reply: string): ProtocolInfo {
  const cleaned = reply.trim().toUpperCase().replace(/\s+/g, '');
  const id = cleaned.startsWith('A') && cleaned.length > 1 ? cleaned.slice(1) : cleaned;
  const entry = TABLE[id];
  if (!entry) return { id, name: `Unknown protocol (${reply.trim() || 'none'})`, can: false, extended: false, family: 'UNKNOWN' };
  return { id, ...entry };
}

export const isCanProtocol = (p: ProtocolInfo | null | undefined): boolean => !!p && p.can && p.family === 'CAN';
