import type { DtcRecord, ScanResult } from '../obd/types';
import { readJson, safeRemove, writeJson } from './storage';

export interface HistoryVehicle {
  make?: string;
  year?: number;
  model?: string;
  vin?: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  vehicle: HistoryVehicle;
  protocol: string;
  mil: boolean;
  stored: DtcRecord[];
  pending: DtcRecord[];
  permanent: DtcRecord[];
  freezeDtc?: string;
  note?: string;
}

const KEY = 'autoscan.history.v1';
const MAX_ENTRIES = 100;

export function loadHistory(): HistoryEntry[] {
  const list = readJson<HistoryEntry[]>(KEY, []);
  return Array.isArray(list) ? list : [];
}

export function persistHistory(list: HistoryEntry[]): void {
  writeJson(KEY, list.slice(0, MAX_ENTRIES));
}

export function clearStoredHistory(): void {
  safeRemove(KEY);
}

export function entryFromScan(scan: ScanResult, vehicle: HistoryVehicle, protocol: string): HistoryEntry {
  return {
    id: `${scan.timestamp}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: scan.timestamp,
    vehicle,
    protocol,
    mil: scan.mil,
    stored: scan.stored,
    pending: scan.pending,
    permanent: scan.permanent,
    freezeDtc: scan.freezeFrame?.dtc,
  };
}

export function vehicleLabel(v: HistoryVehicle): string {
  const parts = [v.year, v.make, v.model].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Unknown vehicle';
}

export function historyToJson(list: HistoryEntry[]): string {
  return JSON.stringify({ app: 'AutoScan OBD2', exportedAt: new Date().toISOString(), scans: list }, null, 2);
}

export function totalCodes(e: HistoryEntry): number {
  return e.stored.length + e.pending.length + e.permanent.length;
}
