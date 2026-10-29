import type { DtcInfo } from './types';
import { genericEngine } from './genericEngine';
import { genericTrans } from './genericTrans';
import { genericChassis } from './genericChassis';

/** SAE J2012 generic codes (P0/P2/P3, C0, B0, U0) combined. */
export const generic: DtcInfo[] = [...genericEngine, ...genericTrans, ...genericChassis];
export { genericEngine, genericTrans, genericChassis };
