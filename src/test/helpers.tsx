import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { DiagnosticContext, initialState, type DiagnosticApi, type DiagnosticState } from '../state/DiagnosticContext';
import type { ScanResult } from '../obd/types';
import { vi } from 'vitest';

export const sampleScan: ScanResult = {
  timestamp: Date.UTC(2025, 0, 1, 12, 0, 0),
  stored: [
    { code: 'P0420', ecu: '7E8', kind: 'stored' },
    { code: 'P0171', ecu: '7E8', kind: 'stored' },
  ],
  pending: [{ code: 'P0301', ecu: '7E8', kind: 'pending' }],
  permanent: [],
  mil: true,
  reportedCount: 2,
};

export function fakeApi(overrides: Partial<DiagnosticState> = {}, fns: Partial<DiagnosticApi> = {}): DiagnosticApi {
  const state = initialState({
    status: 'connected',
    scan: sampleScan,
    info: {
      adapter: 'ELM327 v1.5',
      protocol: { id: '6', name: 'ISO 15765-4 CAN (11 bit, 500 kbaud)', can: true, extended: false, family: 'CAN' },
      supportedPids: [0x0c],
      transport: 'simulator',
      vin: 'KMHDH4AE0FU123456',
    },
    vehicle: { region: 'Korean', make: 'Hyundai', year: 2015, autoDetect: true },
    ...overrides,
  });
  return {
    ...state,
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
    refreshCodes: vi.fn().mockResolvedValue(undefined),
    clearCodes: vi.fn().mockResolvedValue(true),
    scanModules: vi.fn().mockResolvedValue(undefined),
    clearModule: vi.fn().mockResolvedValue(true),
    setVehicle: vi.fn(),
    setLive: vi.fn(),
    updateSettings: vi.fn(),
    sendRaw: vi.fn().mockResolvedValue(undefined),
    clearLog: vi.fn(),
    saveScan: vi.fn(),
    deleteHistory: vi.fn(),
    clearHistory: vi.fn(),
    dismissNotice: vi.fn(),
    ...fns,
  };
}

export function withApi(api: DiagnosticApi, ui: ReactNode, route = '/') {
  return (
    <MemoryRouter initialEntries={[route]}>
      <DiagnosticContext.Provider value={api}>{ui}</DiagnosticContext.Provider>
    </MemoryRouter>
  );
}
