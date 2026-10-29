import type { FreezeFrame } from './freezeFrame';
import type { ProtocolInfo } from './protocols';
import type { UdsDtc } from './uds';
import type { ModuleDef } from './modules';

export type DtcKind = 'stored' | 'pending' | 'permanent';

export interface DtcRecord {
  code: string;
  ecu: string;
  kind: DtcKind;
}

export interface ScanResult {
  timestamp: number;
  stored: DtcRecord[];
  pending: DtcRecord[];
  permanent: DtcRecord[];
  mil: boolean;
  /** DTC count reported by the ECU in Mode 01 PID 01 */
  reportedCount: number;
  freezeFrame?: FreezeFrame;
}

export interface ConnectionInfo {
  adapter: string;
  voltage?: string;
  protocol: ProtocolInfo;
  supportedPids: number[];
  vin?: string;
  transport: 'serial' | 'simulator';
}

export type ModuleStatus = 'ok' | 'no-response' | 'error';

export interface ModuleResult {
  module: ModuleDef;
  status: ModuleStatus;
  message?: string;
  dtcs: UdsDtc[];
}

export type ConnectStepId = 'open' | 'reset' | 'protocol' | 'vin';
export type StepState = 'pending' | 'running' | 'ok' | 'fail' | 'skipped';
export interface ConnectStep {
  id: ConnectStepId;
  label: string;
  state: StepState;
  detail?: string;
}
