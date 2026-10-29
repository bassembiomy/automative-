import { describe, expect, it } from 'vitest';
import { Elm327, ElmError, cleanLines, detectError, type ElmErrorKind } from './elm327';
import { DiagnosticService } from './service';
import { SimulatorTransport } from './transport/SimulatorTransport';
import { SIM_VEHICLES } from './transport/simulatorVehicles';
import type { Transport } from './transport/Transport';
import { decodeVin, validateCheckDigit } from './vin';

const fast = { latencyMs: [0, 0] as [number, number] };
const makeService = (id: string) => new DiagnosticService(new SimulatorTransport(id, fast), { resetDelayMs: 0 });

/** Transport that answers every command with a fixed reply. */
class FixedTransport implements Transport {
  readonly kind = 'simulator' as const;
  isOpen = true;
  private cbs = new Set<(c: string) => void>();
  constructor(private reply: string) {}
  async open() {}
  async close() {}
  onData(cb: (c: string) => void) {
    this.cbs.add(cb);
    return () => this.cbs.delete(cb);
  }
  async write() {
    setTimeout(() => this.cbs.forEach((c) => c(`${this.reply}\r\r>`)), 0);
  }
}

describe('ELM327 driver with the simulator', () => {
  it('runs the init sequence and detects the protocol for every preset', async () => {
    const expected: Record<string, string> = { '6': 'CAN', '5': 'KWP', '3': '9141' };
    for (const v of SIM_VEHICLES) {
      const svc = makeService(v.id);
      const steps: string[] = [];
      const info = await svc.connect((id, state) => steps.push(`${id}:${state}`));
      expect(info.protocol.id).toBe(v.protocol);
      expect(info.protocol.name).toContain(expected[v.protocol]);
      expect(info.adapter).toMatch(/ELM327/);
      expect(info.voltage).toMatch(/V$/);
      expect(info.vin).toBe(v.vin);
      expect(steps).toContain('open:ok');
      expect(steps).toContain('protocol:ok');
      expect(steps).toContain('vin:ok');
      expect(info.supportedPids).toContain(0x0c);
      await svc.disconnect();
    }
  });

  it('VINs of all presets are well formed (check digit valid except EU cars)', () => {
    for (const v of SIM_VEHICLES) {
      expect(v.vin).toHaveLength(17);
      expect(decodeVin(v.vin).make).toBe(v.make);
      expect(decodeVin(v.vin).year).toBe(v.year);
      if (v.make !== 'Volkswagen') expect(validateCheckDigit(v.vin)).toBe(true);
    }
  });

  it('readAllCodes returns the preset codes for every vehicle', async () => {
    for (const v of SIM_VEHICLES) {
      const svc = makeService(v.id);
      await svc.connect();
      const scan = await svc.readAllCodes();
      expect(scan.stored.map((d) => d.code).sort(), v.id).toEqual(v.stored.map((d) => d.code).sort());
      expect(scan.pending.map((d) => d.code), v.id).toEqual(v.pending.map((d) => d.code));
      expect(scan.permanent.map((d) => d.code), v.id).toEqual(v.permanent.map((d) => d.code));
      expect(scan.mil).toBe(true);
      expect(scan.reportedCount).toBe(v.stored.length);
      expect(scan.freezeFrame?.dtc).toBe(v.freeze?.dtc);
      expect(scan.freezeFrame?.values.find((x) => x.pid === 0x0c)?.value).toBeCloseTo(v.freeze?.values[0x0c] ?? 0, -1);
    }
  });

  it('keeps the ECU source for codes from the second OBD ECU', async () => {
    const svc = makeService('golf-2012');
    await svc.connect();
    const scan = await svc.readAllCodes();
    expect(scan.stored.find((d) => d.code === 'P0841')?.ecu).toBe('7E9');
    expect(scan.stored.find((d) => d.code === 'P0299')?.ecu).toBe('7E8');
  });

  it('clearCodes empties the simulated codes', async () => {
    const svc = makeService('elantra-2015');
    await svc.connect();
    expect((await svc.readAllCodes()).stored.length).toBeGreaterThan(0);
    await svc.clearCodes();
    const after = await svc.readAllCodes();
    expect(after.stored).toHaveLength(0);
    expect(after.pending).toHaveLength(0);
    expect(after.permanent).toHaveLength(0);
    expect(after.mil).toBe(false);
    expect(after.reportedCount).toBe(0);
    expect(after.freezeFrame).toBeUndefined();
  });

  it('clears K-line cars too', async () => {
    const svc = makeService('corolla-2004');
    await svc.connect();
    expect((await svc.readAllCodes()).stored.map((d) => d.code)).toContain('P1349');
    await svc.clearCodes();
    expect((await svc.readAllCodes()).stored).toHaveLength(0);
  });

  it('reads live data', async () => {
    const svc = makeService('civic-2010');
    await svc.connect();
    const live = await svc.readLive([0x0c, 0x05, 0x0d, 0x42]);
    expect(live.get(0x0c)).toBeGreaterThan(500);
    expect(live.get(0x0c)).toBeLessThan(4000);
    expect(live.get(0x05)).toBeGreaterThan(20);
    expect(live.get(0x42)).toBeGreaterThan(12);
  });

  it('module scan finds UDS DTCs on CAN cars and restores the headers', async () => {
    const svc = makeService('elantra-2015');
    await svc.connect();
    const results = await svc.scanModules('Hyundai');
    const abs = results.find((r) => r.module.tx === '7D1');
    expect(abs?.status).toBe('ok');
    expect(abs?.dtcs[0]).toMatchObject({ code: 'C0035' });
    expect(results.find((r) => r.module.tx === '7D2')?.dtcs[0].code).toBe('B0001');
    expect(results.find((r) => r.module.tx === '7E0')?.dtcs.map((d) => d.code)).toEqual(expect.arrayContaining(['P0420', 'P0171']));
    expect(results.find((r) => r.module.tx === '7E5')?.status).toBe('no-response');
    // headers restored: functional requests work again
    expect((await svc.readAllCodes()).stored.length).toBeGreaterThan(0);
  });

  it('clears a single module with UDS 14 FF FF FF', async () => {
    const svc = makeService('elantra-2015');
    await svc.connect();
    const results = await svc.scanModules('Hyundai');
    const abs = results.find((r) => r.module.tx === '7D1')!;
    expect((await svc.clearModule(abs.module)).ok).toBe(true);
    const again = await svc.scanModules('Hyundai');
    expect(again.find((r) => r.module.tx === '7D1')?.dtcs).toHaveLength(0);
    expect(again.find((r) => r.module.tx === '7D2')?.dtcs).toHaveLength(1);
  });

  it('refuses module scan on K-line cars', async () => {
    const svc = makeService('sorento-2006');
    await svc.connect();
    await expect(svc.scanModules('Kia')).rejects.toThrow(/CAN/);
  });

  it('reports unable to connect when a wrong protocol is forced', async () => {
    const t = new SimulatorTransport('corolla-2004', fast);
    await t.open();
    const elm = new Elm327(t);
    await elm.send('ATZ');
    await elm.send('ATE0');
    await elm.send('ATSP6');
    await expect(elm.send('0100')).rejects.toMatchObject({ kind: 'UNABLE_TO_CONNECT' });
  });
});

describe('ELM327 error mapping', () => {
  const cases: [string, ElmErrorKind][] = [
    ['NO DATA', 'NO_DATA'],
    ['UNABLE TO CONNECT', 'UNABLE_TO_CONNECT'],
    ['CAN ERROR', 'CAN_ERROR'],
    ['BUS ERROR', 'BUS_ERROR'],
    ['BUS INIT: ...ERROR', 'BUS_INIT_ERROR'],
    ['?', 'UNKNOWN_COMMAND'],
    ['STOPPED', 'STOPPED'],
    ['BUFFER FULL', 'BUFFER_FULL'],
    ['FB ERROR', 'FB_ERROR'],
    ['DATA ERROR', 'DATA_ERROR'],
    ['<RX ERROR', 'RX_ERROR'],
    ['BUS BUSY', 'BUS_BUSY'],
  ];
  for (const [token, kind] of cases) {
    it(`maps "${token}" to ${kind}`, () => {
      expect(detectError([token], '0100')?.kind).toBe(kind);
    });
  }

  it('throws a typed ElmError from send()', async () => {
    const elm = new Elm327(new FixedTransport('NO DATA'));
    await expect(elm.send('0100')).rejects.toBeInstanceOf(ElmError);
    await expect(elm.send('0100')).rejects.toMatchObject({ kind: 'NO_DATA', command: '0100' });
    await expect(elm.requestOrEmpty('0100')).resolves.toEqual([]);
  });

  it('times out when the adapter never answers', async () => {
    const silent: Transport = { ...new FixedTransport(''), kind: 'simulator', isOpen: true, open: async () => {}, close: async () => {}, onData: () => () => {}, write: async () => {} };
    const elm = new Elm327(silent, { defaultTimeoutMs: 30 });
    await expect(elm.send('ATZ')).rejects.toMatchObject({ kind: 'TIMEOUT' });
  });

  it('cleans echo, searching banners and blank lines', () => {
    expect(cleanLines('0100\rSEARCHING...\rBUS INIT: ...OK\r\r7E8 06 41 00 BE 3F A8 13 \r\r', '0100')).toEqual(['7E8 06 41 00 BE 3F A8 13']);
    expect(cleanLines('ATZ\r\rELM327 v1.5\r', 'ATZ')).toEqual(['ELM327 v1.5']);
  });

  it('keeps BUS INIT errors', () => {
    expect(detectError(cleanLines('0100\rBUS INIT: ...ERROR\r', '0100'), '0100')?.kind).toBe('BUS_INIT_ERROR');
  });

  it('serialises commands (one in flight at a time)', async () => {
    const t = new SimulatorTransport('civic-2010', fast);
    await t.open();
    const elm = new Elm327(t);
    const [a, b, c] = await Promise.all([elm.send('ATI'), elm.send('ATE0'), elm.send('ATRV')]);
    expect(a[0]).toMatch(/ELM327/);
    expect(b).toEqual(['OK']);
    expect(c[0]).toMatch(/V$/);
  });
});
