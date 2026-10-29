import { buildBrandNotes, type BrandRow } from './brandHelpers';
import type { DtcInfo } from './types';

/**
 * Chinese brands mostly use Bosch/UAES, Delphi or Continental engine management and report standard SAE codes.
 * Their manufacturer-defined codes are poorly documented outside dealer tools, so this file only adds
 * brand context to SAE codes, grouped by brand family. A code appears in one group only.
 */
const ALL = ['MG', 'Chery', 'Geely', 'BYD', 'Great Wall / Haval', 'Changan', 'JAC'];
const MG = ['MG'];
const TURBO_PETROL = ['MG', 'Chery', 'Geely', 'Changan', 'Great Wall / Haval'];
const DIESEL = ['Great Wall / Haval', 'JAC'];
const HYBRID = ['BYD', 'MG', 'Geely'];

const shared: BrandRow[] = [
  ['P0011', 'medium', 'camTiming', 'Intake cam timing is more advanced than commanded. Most current Chinese-brand petrol engines use oil-pressure variable valve timing, so check oil level and grade, then the oil control valve and its screen.', ['Wrong oil grade or overdue oil change', 'Sticking oil control valve (OCV)']],
  ['P0016', 'high', 'camTiming', 'Crankshaft and camshaft signals are out of correlation. Rule out sensor wiring first, then check timing marks, especially after a timing belt or chain repair.', ['Timing belt/chain installed one tooth off or stretched chain']],
  ['P0117', 'medium', 'ect', 'Coolant temperature sensor signal low. The cooling fan may run constantly and the temperature gauge may read wrong.'],
  ['P0122', 'high', 'throttle', 'Throttle position sensor "A" signal low on an electronic throttle body. Clean the throttle body, check the connector and run the throttle/idle learn procedure after repair.'],
  ['P0128', 'low', 'thermostat', 'Coolant stays below the thermostat regulating temperature. A thermostat stuck open is the most common cause and also gives weak cabin heat.'],
  ['P0133', 'medium', 'o2response', 'Upstream oxygen sensor responds slowly. Check for exhaust leaks before the sensor and for fuel-trim problems before replacing it.'],
  ['P0171', 'medium', 'fuelTrim', 'Bank 1 runs lean. Check the intake duct and PCV hoses for air leaks, clean the MAF/MAP sensor and test fuel pressure.', ['Cracked intake hose or loose clamp after the air filter', 'PCV hose or valve leak']],
  ['P0172', 'medium', 'fuelTrim', 'Bank 1 runs rich. Check the air filter, a stuck-open canister purge valve and leaking injectors.'],
  ['P0300', 'high', 'misfire', 'Random or multiple-cylinder misfire. Check spark plugs and coils first, then fuel quality. Low-grade fuel is a frequent cause in markets where it is common.', ['Worn spark plugs beyond the service interval', 'Poor fuel quality'], 'Drive gently to a workshop. Stop if the check-engine light is flashing.'],
  ['P0301', 'high', 'misfire', 'Cylinder 1 misfire. Swap the ignition coil with another cylinder: if the misfire moves, the coil is faulty.'],
  ['P0302', 'high', 'misfire', 'Cylinder 2 misfire. Swap the ignition coil with another cylinder: if the misfire moves, the coil is faulty.'],
  ['P0303', 'high', 'misfire', 'Cylinder 3 misfire. Swap the ignition coil with another cylinder: if the misfire moves, the coil is faulty.'],
  ['P0304', 'high', 'misfire', 'Cylinder 4 misfire. Swap the ignition coil with another cylinder: if the misfire moves, the coil is faulty.'],
  ['P0335', 'high', 'crank', 'Crankshaft position sensor circuit. Expect a no-start or stalling, often when the engine is hot.'],
  ['P0340', 'high', 'cam', 'Camshaft position sensor circuit. The engine may crank longer than normal before starting.'],
  ['P0420', 'medium', 'cat', 'Catalyst efficiency below threshold. Fix any misfire, oil burning or exhaust leak first, and ask the dealer about ECU software updates before replacing the converter.', ['Oil consumption contaminating the catalyst']],
  ['P0442', 'low', 'evap', 'Small EVAP leak. Check the fuel cap seal first, then the purge valve and hoses.'],
  ['P0455', 'low', 'evap', 'Large EVAP leak, very often a loose, damaged or missing fuel cap.'],
  ['P0507', 'low', 'idle', 'Idle speed higher than expected. Clean the throttle body, check for intake leaks and run the idle learn procedure.'],
  ['P0562', 'medium', 'voltage', 'System voltage low. Test the 12 V battery and alternator; on cars with start-stop the battery must be the correct AGM/EFB type.', ['Weak 12 V battery or alternator output']],
  ['P0606', 'high', 'ecm', 'Engine control module processor fault. Check battery voltage, ECM power and grounds before suspecting the ECM; a dealer software update may be available.'],
  ['P0700', 'medium', 'trans', 'The transmission control module has stored its own fault and asked for the check-engine light. Read the TCM codes with the module scan. Many of these cars use CVT or dual-clutch gearboxes that need the correct fluid and an adaptation after service.', ['CVT or DCT fault stored in the TCM', 'Wrong transmission fluid or missed adaptation after service']],
  ['P2135', 'high', 'throttle', 'Throttle position sensors A/B disagree. Clean the throttle body, check the connector and relearn the throttle afterwards.'],
  ['U0100', 'high', 'netModule', 'Lost communication with the ECM. Check ECM fuses and relays, main grounds and the CAN wiring at the OBD socket.'],
  ['U0121', 'high', 'netModule', 'Lost communication with the ABS/ESP module. Check its fuse, connector and the CAN wiring.'],
];

const mg: BrandRow[] = [
  ['P0118', 'high', 'ect', 'Coolant temperature sensor signal high. On 2002–2005 MG Rover models (ZR/ZS/ZT with the K-series engine), take any overheating seriously because head gasket failure is a known weakness.', ['K-series head gasket failure (MG Rover era) causing coolant loss or overheating'], 'Check the coolant level when the engine is cold. Stop if the gauge rises or coolant is being lost.'],
];

const turbo: BrandRow[] = [
  ['P0234', 'high', 'turbo', 'Turbo overboost on a small turbo petrol engine (for example MG, Chery, Geely, Changan or Haval 1.5T). Check the wastegate actuator and its control solenoid and hoses.', ['Sticking wastegate or faulty boost control solenoid'], 'Drive gently without full throttle until repaired.'],
  ['P0299', 'medium', 'turbo', 'Turbo underboost on a small turbo petrol engine. Check the intercooler pipes and clamps for leaks, the boost pressure sensor and the wastegate actuator.', ['Split intercooler hose or loose clamp']],
];

const diesel: BrandRow[] = [
  ['P0087', 'high', 'fuelSystem', 'Fuel rail pressure too low on a common-rail diesel (Great Wall/Haval or JAC). Change the fuel filter and drain any water first, then test the high-pressure pump and injector leak-off.', ['Clogged diesel filter or water in fuel', 'Excess injector leak-off']],
  ['P0380', 'medium', 'glow', 'Glow plug circuit fault on a diesel engine. Cold starts become hard; test each glow plug and the glow plug relay/module.'],
  ['P0401', 'medium', 'egr', 'Insufficient EGR flow on a diesel engine, usually carbon build-up in the EGR valve or cooler.'],
  ['P2002', 'medium', 'dpf', 'DPF efficiency below threshold. Check for a cracked filter and a faulty differential pressure sensor or hoses.'],
  ['P2463', 'high', 'dpf', 'DPF soot accumulation. Short trips prevent regeneration: a sustained highway drive or a forced regeneration with a workshop tool is needed.'],
];

const hybrid: BrandRow[] = [
  ['P0A0D', 'high', 'hybrid', 'High-voltage interlock loop fault on a hybrid or plug-in hybrid (for example BYD DM, MG HS PHEV or Geely hybrids). The HV system may stay disabled.', undefined, 'The car may not enter READY mode. Do not touch orange HV cables; use an authorised high-voltage workshop.'],
  ['P0A7F', 'high', 'hybrid', 'The high-voltage battery pack has deteriorated. Have the pack and its cell voltages checked by an authorised workshop; it may still be under the HV battery warranty.'],
  ['P0A80', 'high', 'hybrid', 'Weak or imbalanced cells in the high-voltage battery. Check whether the HV battery warranty still covers it before paying for a repair.'],
  ['P0A94', 'high', 'hybrid', 'The DC/DC converter that charges the 12 V battery is not working correctly. The 12 V battery can go flat and leave the car unable to start.'],
  ['P0AA6', 'critical', 'hybrid', 'The high-voltage system has lost isolation from the body, which is an electric-shock risk.', undefined, 'Do not touch orange HV cables. Have a qualified high-voltage technician inspect the car before driving.'],
];

export const chinese: DtcInfo[] = [
  ...buildBrandNotes(shared, ALL),
  ...buildBrandNotes(mg, MG),
  ...buildBrandNotes(turbo, TURBO_PETROL),
  ...buildBrandNotes(diesel, DIESEL),
  ...buildBrandNotes(hybrid, HYBRID),
];
