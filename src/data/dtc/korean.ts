import { build, type Row } from './build';
import { buildBrandNotes, type BrandRow } from './brandHelpers';
import type { DtcInfo } from './types';

const MAKES = ['Hyundai', 'Kia', 'Genesis'];

/** Codes that Hyundai/Kia define themselves (outside the SAE generic list). */
const specific: Row[] = [
  ['P1326', 'Knock Sensor System - Engine Protection (KSS)', 'critical', 'knock', 'Hyundai/Kia knock sensing system code. The ECM detected knock-sensor patterns typical of bearing or rod noise and enters engine protection (reduced power). It has been associated with engine bearing wear on some Theta-family engines.', ['Worn connecting-rod or crank bearings (metal knock)', 'Low oil level or poor oil maintenance', 'Pending engine-specific software update or recall'], 'Stop and have the engine inspected as soon as possible. Continued driving risks engine failure.'],
  ['P1345', 'Crankshaft / Camshaft Position Sensor Signal Correlation', 'high', 'cam', 'The ECM sees the crankshaft and camshaft sensor signals out of phase, which indicates a sensor, trigger-wheel or timing problem on Hyundai/Kia engines.', ['Timing belt/chain jumped or incorrect timing after repair']],
];

const notes: BrandRow[] = [
  ['P0011', 'medium', 'camTiming', 'On Hyundai/Kia engines with CVVT, the intake cam is more advanced than commanded. Dirty oil and a clogged oil control valve (OCV) screen are the usual causes.', ['Clogged Oil Control Valve (OCV) filter or sticking OCV', 'Extended oil change interval / sludge']],
  ['P0014', 'medium', 'camTiming', 'On Hyundai/Kia engines with dual CVVT, the exhaust cam timing is more advanced than commanded.', ['Clogged Oil Control Valve (OCV) or filter']],
  ['P0016', 'high', 'camTiming', 'Crankshaft and camshaft position signals are out of correlation on a Hyundai/Kia engine, often a stretched timing chain or incorrect timing after a belt/chain service.', ['Stretched timing chain (chain-driven engines)', 'Timing belt installed one tooth off']],
  ['P0087', 'high', 'fuelSystem', 'On Hyundai/Kia CRDi diesels and GDI petrol engines, fuel rail pressure stays below target. Typical causes are a weak high-pressure pump, a leaking injector or a clogged filter.', ['Clogged diesel fuel filter or water in fuel', 'Worn high-pressure pump (GDI/CRDi)', 'Leaking injector return line (CRDi)']],
  ['P0100', 'medium', 'maf', 'On Hyundai/Kia models the MAF sensor is built into the air-filter housing outlet; a dirty element or loose intake duct is the usual cause.'],
  ['P0113', 'low', 'iat', 'Intake air temperature signal too high (open circuit) on a Hyundai/Kia. The IAT sensor is often combined with the MAF sensor, so check that connector first.'],
  ['P0117', 'medium', 'ect', 'Coolant temperature sensor signal low. On Hyundai/Kia models the cooling fan may run constantly and the gauge may read high or incorrectly.'],
  ['P0122', 'high', 'throttle', 'Throttle position sensor "A" signal low. On Hyundai/Kia models with an electronic throttle body (ETC), clean the throttle body and perform the ETC / idle relearn procedure after repair.'],
  ['P0128', 'low', 'thermostat', 'Coolant temperature stays below the thermostat opening temperature. A stuck-open thermostat is very common on Hyundai/Kia cars and also causes weak cabin heat.'],
  ['P0133', 'medium', 'o2response', 'Slow response from the upstream oxygen sensor on a Hyundai/Kia. Check for exhaust leaks and fuel trim before replacing the sensor.'],
  ['P0136', 'medium', 'o2', 'Downstream oxygen sensor circuit fault on a Hyundai/Kia. The harness near the exhaust can melt or chafe.'],
  ['P0141', 'medium', 'o2heater', 'Heater circuit fault on the downstream oxygen sensor of a Hyundai/Kia; check the heater fuse and sensor resistance.'],
  ['P0171', 'medium', 'fuelTrim', 'Bank 1 too lean on a Hyundai/Kia. Cracked intake boot, PCV hose leaks and a dirty MAF sensor are the most common causes.', ['Cracked air-intake boot between MAF and throttle body', 'PCV hose or valve leak']],
  ['P0172', 'medium', 'fuelTrim', 'Bank 1 too rich on a Hyundai/Kia. Check for a clogged air filter, leaking injectors or a stuck-open purge valve.'],
  ['P0300', 'high', 'misfire', 'Random misfire on a Hyundai/Kia. Ignition coils and spark plugs are the first items to check; a catalyst-damaging misfire may flash the lamp.', ['Worn spark plugs beyond the service interval', 'Failing ignition coil (coil-on-plug)'], 'Drive gently to a workshop. Stop if the check-engine light is flashing.'],
  ['P0301', 'high', 'misfire', 'Cylinder 1 misfire on a Hyundai/Kia. Swap the coil with another cylinder to see if the misfire follows.'],
  ['P0302', 'high', 'misfire', 'Cylinder 2 misfire on a Hyundai/Kia. Swap the coil with another cylinder to see if the misfire follows.'],
  ['P0303', 'high', 'misfire', 'Cylinder 3 misfire on a Hyundai/Kia. Swap the coil with another cylinder to see if the misfire follows.'],
  ['P0304', 'high', 'misfire', 'Cylinder 4 misfire on a Hyundai/Kia. Swap the coil with another cylinder to see if the misfire follows.'],
  ['P0299', 'medium', 'turbo', 'Turbo underboost on a Hyundai/Kia turbo diesel or T-GDI engine. Check hoses, intercooler and the VGT/wastegate actuator.'],
  ['P0325', 'medium', 'knock', 'Knock sensor circuit fault on a Hyundai/Kia. If P1326 is also stored, treat engine noise as a possible mechanical problem rather than only an electrical one.'],
  ['P0335', 'high', 'crank', 'Crankshaft position sensor circuit on a Hyundai/Kia; a no-start or intermittent stall is typical, especially when hot.'],
  ['P0340', 'high', 'cam', 'Camshaft position sensor circuit on a Hyundai/Kia; the engine may crank for longer than normal.'],
  ['P0401', 'medium', 'egr', 'Insufficient EGR flow on a Hyundai/Kia diesel or petrol engine; carbon build-up in the EGR valve and cooler is the usual cause.'],
  ['P0420', 'medium', 'cat', 'Catalyst efficiency low on a Hyundai/Kia. Rule out misfires, oil consumption and exhaust leaks; also check for a software calibration update before replacing the converter.', ['Oil burning or coolant leak contaminating the catalyst']],
  ['P0442', 'low', 'evap', 'Small EVAP leak on a Hyundai/Kia. Replace the fuel cap first and check the purge valve (PCSV).'],
  ['P0455', 'low', 'evap', 'Large EVAP leak on a Hyundai/Kia, very often a loose, damaged or missing fuel cap.'],
  ['P0507', 'low', 'idle', 'Idle speed above target on a Hyundai/Kia. Clean the throttle body and check for intake leaks; perform the idle learning procedure afterwards.'],
  ['P0562', 'medium', 'voltage', 'System voltage low on a Hyundai/Kia. On models with idle stop & go the battery is an AGM/EFB type; test the battery and alternator.', ['Weak battery or alternator output']],
  ['P0606', 'high', 'ecm', 'ECM processor fault on a Hyundai/Kia. Check battery and power/ground connections before suspecting the ECM.'],
  ['P0741', 'medium', 'tcc', 'Torque converter clutch stuck off on a Hyundai/Kia automatic; check fluid condition and TCC solenoid.'],
  ['P2002', 'medium', 'dpf', 'DPF efficiency below threshold on a Hyundai/Kia diesel; check for a cracked or tampered filter and differential pressure sensor.'],
  ['P2135', 'high', 'throttle', 'Throttle sensor A/B correlation on a Hyundai/Kia with ETC; clean the throttle body and check the connector. Relearn the throttle afterwards.'],
  ['P2463', 'high', 'dpf', 'DPF soot accumulation on a Hyundai/Kia diesel; frequent short trips prevent regeneration. A highway drive or forced regeneration is needed.'],
  ['U0100', 'high', 'netModule', 'Lost communication with the ECM on a Hyundai/Kia; check ECM fuses, relays and main grounds, and CAN wiring at the DLC.'],
  ['U0121', 'high', 'netModule', 'Lost communication with the ABS/ESP module on a Hyundai/Kia; check module fuses, connector and CAN wiring.'],
];

export const korean: DtcInfo[] = [...build(specific, MAKES), ...buildBrandNotes(notes, MAKES)];
