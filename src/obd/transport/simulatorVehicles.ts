import { computeCheckDigit } from '../vin';

export interface SimDtc {
  code: string;
  /** index into the vehicle's OBD ECU list (0 = engine) */
  ecu?: number;
}

export interface SimModule {
  name: string;
  tx: string;
  rx: string;
  dtcs: { code: string; ftb: number; status: number }[];
}

export interface FreezeSpec {
  dtc: string;
  /** physical values by PID */
  values: Record<number, number>;
}

export interface SimVehicle {
  id: string;
  label: string;
  make: string;
  model: string;
  year: number;
  /** ELM protocol number */
  protocol: '3' | '5' | '6';
  vin: string;
  /** OBD ECU identifiers: CAN response ids (7E8, 7E9) or K-line source addresses (10, 11) */
  obdEcus: string[];
  stored: SimDtc[];
  pending: SimDtc[];
  permanent: SimDtc[];
  freeze?: FreezeSpec;
  /** extra UDS modules (CAN only) */
  modules: SimModule[];
  supportedPids: number[];
  mil: boolean;
  /** CAN frame padding byte */
  pad: number;
  /** bias added to the long-term fuel trim to make the data look believable for the faults */
  ltft: number;
  note: string;
}

const withCheck = (vin: string): string => vin.slice(0, 8) + computeCheckDigit(vin.slice(0, 8) + '0' + vin.slice(9)) + vin.slice(9);

const BASE_PIDS = [0x04, 0x05, 0x06, 0x07, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x1f, 0x21, 0x2f, 0x31, 0x33, 0x42, 0x46, 0x5c];
const KLINE_PIDS = [0x04, 0x05, 0x06, 0x07, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x1f];

export const SIM_VEHICLES: SimVehicle[] = [
  {
    id: 'elantra-2015',
    label: '2015 Hyundai Elantra (CAN 11-bit)',
    make: 'Hyundai', model: 'Elantra', year: 2015, protocol: '6',
    vin: withCheck('KMHDH4AE0FU123456'),
    obdEcus: ['7E8'],
    stored: [{ code: 'P0420' }, { code: 'P0171' }],
    pending: [{ code: 'P0301' }],
    permanent: [{ code: 'P0420' }],
    freeze: { dtc: 'P0420', values: { 0x04: 38.4, 0x05: 88, 0x06: 1.6, 0x07: 6.3, 0x0b: 41, 0x0c: 2150, 0x0d: 62, 0x0f: 34, 0x11: 21.2 } },
    modules: [
      { name: 'ABS / ESC', tx: '7D1', rx: '7D9', dtcs: [{ code: 'C0035', ftb: 0x01, status: 0x2f }] },
      { name: 'Airbag (SRS)', tx: '7D2', rx: '7DA', dtcs: [{ code: 'B0001', ftb: 0x11, status: 0x09 }] },
      { name: 'Body control (BCM)', tx: '770', rx: '778', dtcs: [{ code: 'U0100', ftb: 0x00, status: 0x08 }] },
    ],
    supportedPids: BASE_PIDS, mil: true, pad: 0x00, ltft: 6.3,
    note: 'Catalyst efficiency, lean bank 1, pending misfire; ABS wheel-speed and SRS faults in other modules.',
  },
  {
    id: 'sorento-2006',
    label: '2006 Kia Sorento (ISO 14230 KWP)',
    make: 'Kia', model: 'Sorento', year: 2006, protocol: '5',
    vin: withCheck('KNDJC7360 65123456'.replace(' ', '')),
    obdEcus: ['11'],
    stored: [{ code: 'P0335' }, { code: 'P0340' }],
    pending: [{ code: 'P0113' }],
    permanent: [],
    freeze: { dtc: 'P0335', values: { 0x04: 22.0, 0x05: 91, 0x06: 0.8, 0x07: 2.3, 0x0b: 35, 0x0c: 1020, 0x0d: 0, 0x0f: 30, 0x11: 14.5 } },
    modules: [],
    supportedPids: KLINE_PIDS, mil: true, pad: 0x00, ltft: 2.3,
    note: 'K-line vehicle: crankshaft and camshaft sensor codes. Module scan is not available.',
  },
  {
    id: 'golf-2012',
    label: '2012 VW Golf (CAN)',
    make: 'Volkswagen', model: 'Golf', year: 2012, protocol: '6',
    vin: 'WVWZZZ1KZCW123456',
    obdEcus: ['7E8', '7E9'],
    stored: [{ code: 'P0299' }, { code: 'P2015' }, { code: 'P0841', ecu: 1 }],
    pending: [{ code: 'P0106' }],
    permanent: [{ code: 'P0299' }],
    freeze: { dtc: 'P0299', values: { 0x04: 71.0, 0x05: 94, 0x06: -1.6, 0x07: 3.1, 0x0b: 118, 0x0c: 3120, 0x0d: 88, 0x0f: 41, 0x11: 62.0 } },
    modules: [
      { name: 'Gateway', tx: '710', rx: '77A', dtcs: [{ code: 'U0121', ftb: 0x00, status: 0x08 }] },
      { name: 'ABS / ESP', tx: '713', rx: '77D', dtcs: [{ code: 'C0040', ftb: 0x01, status: 0x2f }] },
      { name: 'Airbag (SRS)', tx: '715', rx: '77F', dtcs: [] },
    ],
    supportedPids: BASE_PIDS, mil: true, pad: 0x55, ltft: 3.1,
    note: 'Turbo underboost, intake flap, DSG pressure sensor (second OBD ECU 7E9), plus ABS and gateway modules.',
  },
  {
    id: 'corolla-2004',
    label: '2004 Toyota Corolla (ISO 9141-2)',
    make: 'Toyota', model: 'Corolla', year: 2004, protocol: '3',
    vin: withCheck('JTDBR32E0 42123456'.replace(' ', '')),
    obdEcus: ['10'],
    stored: [{ code: 'P0420' }, { code: 'P0136' }, { code: 'P1349' }],
    pending: [{ code: 'P0171' }],
    permanent: [],
    freeze: { dtc: 'P0420', values: { 0x04: 30.2, 0x05: 85, 0x06: 3.1, 0x07: 4.7, 0x0b: 38, 0x0c: 2480, 0x0d: 70, 0x0f: 29, 0x11: 19.6 } },
    modules: [],
    supportedPids: KLINE_PIDS, mil: true, pad: 0x00, ltft: 4.7,
    note: 'Classic ISO 9141-2 car: catalyst, downstream O2 sensor, Toyota VVT-i code and a pending lean code.',
  },
  {
    id: '320i-2018',
    label: '2018 BMW 320i (CAN)',
    make: 'BMW', model: '320i', year: 2018, protocol: '6',
    vin: withCheck('WBA8E1C50 JA123456'.replace(' ', '')),
    obdEcus: ['7E8', '7E9'],
    stored: [{ code: 'P0300' }, { code: 'P0302' }],
    pending: [{ code: 'P0171' }],
    permanent: [{ code: 'P0300' }],
    freeze: { dtc: 'P0302', values: { 0x04: 55.3, 0x05: 90, 0x06: 4.7, 0x07: 8.6, 0x0b: 72, 0x0c: 1860, 0x0d: 45, 0x0f: 36, 0x11: 33.3 } },
    modules: [
      { name: 'Hybrid / battery control', tx: '7E2', rx: '7EA', dtcs: [] },
    ],
    supportedPids: BASE_PIDS, mil: true, pad: 0xaa, ltft: 8.6,
    note: 'Cylinder 2 misfire with random misfires and a pending lean code.',
  },
  {
    id: 'civic-2010',
    label: '2010 Honda Civic (CAN)',
    make: 'Honda', model: 'Civic', year: 2010, protocol: '6',
    vin: withCheck('2HGFA1F50 AH123456'.replace(' ', '')),
    obdEcus: ['7E8'],
    stored: [{ code: 'P1456' }, { code: 'P0171' }],
    pending: [{ code: 'P0442' }],
    permanent: [],
    freeze: { dtc: 'P1456', values: { 0x04: 18.8, 0x05: 82, 0x06: 1.6, 0x07: 5.5, 0x0b: 33, 0x0c: 760, 0x0d: 0, 0x0f: 31, 0x11: 13.7 } },
    modules: [],
    supportedPids: BASE_PIDS, mil: true, pad: 0x00, ltft: 5.5,
    note: 'Honda-specific EVAP code P1456 with a lean bank 1 and pending small EVAP leak.',
  },
];

export const findSimVehicle = (id: string): SimVehicle => SIM_VEHICLES.find((v) => v.id === id) ?? SIM_VEHICLES[0];
