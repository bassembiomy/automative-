import { build, type Row } from './build';
import { buildBrandNotes, type BrandRow } from './brandHelpers';
import type { DtcInfo } from './types';

const VAG = ['Volkswagen', 'Audi', 'Skoda', 'Seat', 'Porsche'];
const BMW = ['BMW', 'Mini'];
const ALL_DE = [...VAG, ...BMW, 'Mercedes-Benz', 'Opel'];
const VAG_BMW_MB = [...VAG, ...BMW, 'Mercedes-Benz'];

/** Manufacturer-defined codes (VAG P1xxx, BMW 4-digit hex DME codes). */
const vagSpecific: Row[] = [
  ['P1500', 'Fuel Pump Relay Circuit Fault', 'high', 'fuelPump', 'VW Group code: the fuel pump relay (J17) circuit is open, shorted or implausible, so the pump may not run.', ['Failed fuel pump relay J17 or control module', 'Blown fuel pump fuse'], 'The engine may not start or may stall. Avoid driving.'],
  ['P1555', 'Charge Pressure Upper Limit Exceeded', 'high', 'turbo', 'VW Group turbo engines: measured boost pressure exceeds the permitted limit.', ['Boost control valve N75 or wastegate actuator stuck', 'Wastegate linkage seized'], 'Reduce load and speed. Have it checked soon - overboost can damage the engine.'],
  ['P1556', 'Charge Pressure Control Negative Deviation', 'medium', 'turbo', 'VW Group turbo engines: boost pressure is lower than the target (underboost).', ['Split charge-air hose or intercooler end tank', 'Diverter (N249) valve diaphragm torn', 'Boost control valve N75 faulty']],
  ['P1557', 'Charge Pressure Control Positive Deviation', 'high', 'turbo', 'VW Group turbo engines: boost pressure is higher than the target (overboost).', ['Boost control valve N75 or wastegate actuator stuck']],
  ['P1602', 'Control Module Supply Voltage (Terminal 30) Too Low', 'medium', 'voltage', 'VW Group code: the permanent battery supply to the control module dropped too low, typically after the battery was disconnected or when the battery is weak.', ['Recently disconnected or weak battery']],
];
const bmwSpecific: Row[] = [
  ['2A82', 'VANOS Camshaft Timing System Fault', 'medium', 'camTiming', 'BMW DME fault code. The VANOS variable camshaft timing (intake or exhaust side depending on the exact code and engine) does not reach its target position.', ['Dirty or failed VANOS solenoid', 'Worn VANOS unit or low oil pressure'], 'Drive gently; the engine may run rough with reduced power. Have it checked soon.'],
  ['2A87', 'VANOS Camshaft Timing System Fault (Second Camshaft)', 'medium', 'camTiming', 'BMW DME fault code for the second VANOS camshaft adjustment (typically exhaust side). The camshaft does not reach its target position.', ['Dirty or failed VANOS solenoid', 'Worn VANOS unit or low oil pressure'], 'Drive gently; the engine may run rough with reduced power. Have it checked soon.'],
];

const vag: BrandRow[] = [
  ['P0011', 'medium', 'camTiming', 'Intake cam timing over-advanced. On VW Group engines suspect the cam adjuster valve (e.g. N205) and low or wrong-spec oil.', ['Sticking camshaft adjustment valve (N205)']],
  ['P0087', 'high', 'fuelSystem', 'Rail pressure too low. On VW Group FSI/TSI engines suspect the high-pressure pump and its cam follower; on TDI engines the filter, pump or injector leak-off.', ['Worn HPFP cam follower (FSI/TSI)', 'Clogged diesel fuel filter (TDI)']],
  ['P0088', 'high', 'fuelSystem', 'Rail pressure too high. Suspect the fuel pressure regulating valve (N276) or pressure sensor on VW Group engines.'],
  ['P0106', 'medium', 'map', 'MAP sensor range/performance on VW Group turbo engines; check charge-air hoses and the sensor connector.'],
  ['P0234', 'high', 'turbo', 'Overboost on VW Group turbo engines; check the N75 boost valve, wastegate actuator rod and vacuum lines.'],
  ['P0236', 'medium', 'turbo', 'Boost sensor range/performance on VW Group turbo engines; check charge-air hoses and the sensor.'],
  ['P0299', 'medium', 'turbo', 'Underboost on VW Group turbo engines. Common causes: split charge-pipe or intercooler hose, diverter valve (N249) diaphragm, N75 valve, turbo actuator.', ['Torn diverter / recirculation valve diaphragm', 'Split intercooler hose']],
  ['P0401', 'medium', 'egr', 'EGR flow insufficient on VW Group TDI engines; carbon-blocked EGR valve and cooler are typical.'],
  ['P0402', 'medium', 'egr', 'EGR flow excessive on VW Group TDI engines; the EGR valve may be stuck open.'],
  ['P2015', 'medium', 'runner', 'Intake manifold flap position does not match target. On VW Group diesels (TDI) the flaps often clog with soot and the actuator linkage breaks; on petrol engines inspect the flap motor.', ['Soot-jammed or broken flap linkage (TDI)']],
  ['P2002', 'medium', 'dpf', 'DPF efficiency low on a VW Group TDI; inspect the filter, differential pressure sensor and its hoses.'],
  ['P2463', 'high', 'dpf', 'DPF soot loading high on a VW Group TDI. Short trips prevent regeneration; a long highway drive or forced regeneration with a scan tool is needed.'],
  ['P0670', 'medium', 'glow', 'Glow plug control module circuit on a VW Group TDI; check the control module, fuse and connectors.'],
];

const bmw: BrandRow[] = [
  ['P0012', 'medium', 'camTiming', 'Intake cam over-retarded. On BMW/Mini engines suspect the VANOS solenoid, VANOS unit or low oil pressure.', ['Dirty VANOS solenoid screens']],
  ['P0013', 'medium', 'camTiming', 'Exhaust camshaft actuator circuit fault on BMW/Mini engines; check the VANOS solenoid and wiring.'],
  ['P0014', 'medium', 'camTiming', 'Exhaust cam over-advanced on BMW/Mini engines; suspect the VANOS solenoid or unit.'],
  ['P0015', 'medium', 'camTiming', 'Exhaust cam over-retarded on BMW/Mini engines; suspect the VANOS solenoid or unit.'],
  ['P0172', 'medium', 'fuelTrim', 'Mixture too rich on a BMW/Mini; check for leaking injectors, a faulty MAF/air mass sensor or stuck purge valve.'],
  ['P0174', 'medium', 'fuelTrim', 'Mixture too lean on bank 2 of a BMW/Mini; check the crankcase breather (CCV) hoses, intake boots and vacuum leaks.', ['Cracked crankcase ventilation hose or CCV valve']],
  ['P0128', 'low', 'thermostat', 'Thermostat below regulating temperature on a BMW/Mini; the electronically heated map-controlled thermostat is a common wear part.'],
  ['P0455', 'low', 'evap', 'Large EVAP leak on a BMW/Mini; check the fuel cap, purge line and diagnosis module for tank leakage (DMTL).'],
  ['P0456', 'low', 'evap', 'Very small EVAP leak on a BMW/Mini; check the cap and the leak-diagnosis pump (DMTL) and its filter.'],
  ['P0507', 'low', 'idle', 'Idle speed too high on a BMW/Mini; look for intake leaks and a worn valve cover or CCV system.'],
  ['P2096', 'medium', 'fuelTrim', 'Post-catalyst trim too lean on a BMW/Mini; check for exhaust leaks and the downstream sensor.'],
];

const mb: BrandRow[] = [
  ['P0715', 'high', 'trans', 'Input speed sensor circuit on a Mercedes-Benz automatic; the transmission control (conductor plate) module is a known failure point on some units.', ['Faulty conductor plate / speed sensor in the transmission']],
  ['P0720', 'high', 'trans', 'Output speed sensor circuit on a Mercedes-Benz automatic; check the sensor and the transmission wiring harness.'],
  ['P2279', 'medium', 'fuelTrim', 'Mercedes-Benz and other German engines can log intake air system leak codes; inspect the intake duct after the MAF and the PCV system.'],
];

const shared: BrandRow[] = [
  ['P0016', 'high', 'camTiming', 'Crank/cam correlation fault. Timing chain stretch or a worn chain tensioner / balance shaft drive is a known wear point on several German engines.', ['Stretched timing chain or worn tensioner']],
  ['P0017', 'high', 'camTiming', 'Crank/exhaust-cam correlation fault. Timing chain stretch or worn tensioner is a known wear point on several German engines.', ['Stretched timing chain or worn tensioner']],
  ['P0171', 'medium', 'fuelTrim', 'Bank 1 too lean. On German engines the PCV / crankcase breather system and intake boots are frequent leak points.', ['Leaking PCV / breather valve or hose']],
  ['P0300', 'high', 'misfire', 'Random misfire. On German engines check ignition coils and spark plugs first; carbon build-up on intake valves (direct injection) can also cause misfires.', ['Carbon deposits on intake valves (direct injection)'], 'Drive gently to a workshop. Stop if the check-engine light is flashing.'],
  ['P0301', 'high', 'misfire', 'Cylinder 1 misfire on a German vehicle; swap the coil with another cylinder to test it.'],
  ['P0302', 'high', 'misfire', 'Cylinder 2 misfire on a German vehicle; swap the coil with another cylinder to test it.'],
  ['P0303', 'high', 'misfire', 'Cylinder 3 misfire on a German vehicle; swap the coil with another cylinder to test it.'],
  ['P0304', 'high', 'misfire', 'Cylinder 4 misfire on a German vehicle; swap the coil with another cylinder to test it.'],
  ['P0420', 'medium', 'cat', 'Catalyst efficiency low. On German vehicles rule out exhaust leaks, misfires and oil consumption before replacing the converter.'],
];

export const german: DtcInfo[] = [
  ...build(vagSpecific, VAG),
  ...build(bmwSpecific, BMW),
  ...buildBrandNotes(vag, VAG),
  ...buildBrandNotes(bmw, BMW),
  ...buildBrandNotes(mb, ['Mercedes-Benz']),
  ...buildBrandNotes(shared.slice(0, 2), VAG_BMW_MB),
  ...buildBrandNotes(shared.slice(2), ALL_DE),
];
