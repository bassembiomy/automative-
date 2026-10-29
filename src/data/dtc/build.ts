import type { DtcInfo, Section, Severity } from './types';

/** Shared explanation template for a subsystem. Row-specific text is layered on top. */
export interface Template {
  system: string;
  symptoms: string[];
  causes: string[];
  fixes: string[];
}

export type TplKey =
  | 'misfire' | 'ignition' | 'cam' | 'camTiming' | 'crank' | 'knock' | 'fuelTrim' | 'fuelSystem'
  | 'injector' | 'fuelPump' | 'maf' | 'map' | 'iat' | 'ect' | 'thermostat' | 'o2' | 'o2heater'
  | 'o2response' | 'cat' | 'evap' | 'evapSensor' | 'egr' | 'secAir' | 'throttle' | 'pedal' | 'idle'
  | 'vss' | 'fan' | 'oilPressure' | 'voltage' | 'ecm' | 'cruise' | 'trans' | 'tcc' | 'shiftSol'
  | 'pressureSol' | 'turbo' | 'dpf' | 'scr' | 'glow' | 'runner' | 'hybrid' | 'wheel' | 'absHyd'
  | 'airbag' | 'bodyElec' | 'canBus' | 'netModule' | 'acSystem' | 'immo' | 'fuelLevel' | 'sensorRef';

export const TEMPLATES: Record<TplKey, Template> = {
  misfire: {
    system: 'Ignition / Misfire',
    symptoms: ['Rough idle or shaking', 'Flashing or steady check-engine light', 'Loss of power and hesitation', 'Raw fuel smell or increased fuel use'],
    causes: ['Worn spark plugs or weak ignition coil', 'Faulty fuel injector or low fuel pressure', 'Vacuum or intake air leak', 'Low engine compression (valves, rings, head gasket)', 'Contaminated or poor quality fuel'],
    fixes: ['Read freeze-frame data and note the misfiring cylinder and load', 'Swap the coil or plug with a neighbouring cylinder and see if the misfire follows', 'Test injector operation and fuel pressure', 'Smoke-test the intake for leaks', 'Perform a compression or leak-down test if the misfire persists'],
  },
  ignition: {
    system: 'Ignition / Misfire',
    symptoms: ['Misfire on one cylinder', 'Hard starting or no start', 'Check-engine light, possibly flashing', 'Reduced power'],
    causes: ['Failed ignition coil or coil driver', 'Damaged connector or wiring to the coil', 'Corroded terminals or poor ground', 'Faulty engine control module driver (rare)'],
    fixes: ['Inspect the coil connector and wiring for damage or corrosion', 'Measure primary resistance and supply voltage at the coil', 'Swap the coil with another cylinder to confirm the fault', 'Replace the coil (and spark plugs if worn)'],
  },
  cam: {
    system: 'Engine Position Sensors',
    symptoms: ['Long cranking or no start', 'Rough running and reduced power', 'Engine may stall', 'Check-engine light'],
    causes: ['Faulty camshaft position sensor', 'Damaged wiring, connector or poor sensor ground', 'Damaged or misaligned reluctor / trigger wheel', 'Stretched timing chain or belt jumped a tooth', 'Low or incorrect supply voltage'],
    fixes: ['Inspect sensor connector and wiring', 'Check the signal on a scope or compare with the crank signal', 'Verify the timing marks / chain stretch', 'Replace the sensor if the signal is missing or erratic'],
  },
  camTiming: {
    system: 'Variable Valve Timing',
    symptoms: ['Rough idle or stalling', 'Loss of power or poor fuel economy', 'Rattle at startup (VVT actuator)', 'Check-engine light'],
    causes: ['Dirty, low or wrong-grade engine oil', 'Faulty VVT / oil control solenoid or clogged screen', 'Worn or stretched timing chain or tensioner', 'Faulty cam or crank sensor', 'Worn VVT phaser'],
    fixes: ['Check oil level and condition; change oil with the specified grade', 'Test and clean the VVT solenoid and its screen', 'Check timing chain stretch and tensioner', 'Check cam/crank sensor signals; replace the solenoid or phaser as needed'],
  },
  crank: {
    system: 'Engine Position Sensors',
    symptoms: ['Engine cranks but will not start', 'Stalling, especially when hot', 'Intermittent misfires or tachometer drop-outs', 'Check-engine light'],
    causes: ['Faulty crankshaft position sensor', 'Damaged wiring, connector or poor ground', 'Metal debris on the sensor tip or damaged trigger wheel', 'Excessive sensor air gap', 'Weak battery or low supply voltage'],
    fixes: ['Inspect sensor, connector and wiring', 'Clean the sensor tip and check the trigger wheel for damage', 'Check the signal on a scope while cranking', 'Replace the crankshaft sensor'],
  },
  knock: {
    system: 'Knock Control',
    symptoms: ['Reduced power', 'Pinging or rattle under load', 'Poor fuel economy', 'Check-engine light'],
    causes: ['Faulty knock sensor', 'Damaged wiring or connector', 'Loose sensor mounting torque', 'Real engine knock from low-octane fuel, carbon build-up or mechanical noise'],
    fixes: ['Inspect the sensor wiring and connector', 'Check mounting torque of the knock sensor', 'Use the correct octane fuel', 'Replace the knock sensor and verify no mechanical knock exists'],
  },
  fuelTrim: {
    system: 'Fuel & Air Metering',
    symptoms: ['Rough idle', 'Poor fuel economy', 'Hesitation or lack of power', 'Black smoke (rich) or hissing/whistling noises (lean)'],
    causes: ['Vacuum or intake leak', 'Dirty or faulty MAF sensor', 'Weak fuel pump, clogged filter or faulty pressure regulator', 'Leaking or clogged injectors', 'Exhaust leak before the oxygen sensor', 'Faulty oxygen sensor'],
    fixes: ['Check fuel trims in live data at idle and 2500 rpm', 'Smoke-test for vacuum and intake leaks', 'Clean or replace the MAF sensor', 'Test fuel pressure and injectors', 'Repair exhaust leaks upstream of the sensors'],
  },
  fuelSystem: {
    system: 'Fuel & Air Metering',
    symptoms: ['Hard starting or long cranking', 'Hesitation, surging or loss of power', 'Poor fuel economy', 'Check-engine light'],
    causes: ['Weak fuel pump or clogged fuel filter', 'Faulty fuel pressure regulator or sensor', 'Fuel leak or air in the system', 'Wiring or connector fault', 'Bad or contaminated fuel'],
    fixes: ['Measure fuel pressure against specification', 'Replace the fuel filter if serviceable', 'Inspect wiring and the pressure sensor/regulator', 'Check for leaks and replace faulty components'],
  },
  injector: {
    system: 'Fuel Injection',
    symptoms: ['Misfire on one cylinder', 'Rough idle and poor fuel economy', 'Hard starting', 'Check-engine light'],
    causes: ['Open or shorted injector coil', 'Damaged injector wiring or connector', 'Blown fuse or faulty injector driver in the ECM', 'Clogged or stuck injector'],
    fixes: ['Measure injector resistance and compare with specification', 'Check injector pulse with a noid light or scope', 'Inspect wiring and connector for damage', 'Replace the injector or repair the harness'],
  },
  fuelPump: {
    system: 'Fuel Delivery',
    symptoms: ['Engine cranks but will not start', 'Stalling or surging', 'Whining fuel pump', 'Loss of power under load'],
    causes: ['Failing fuel pump or pump relay', 'Blown fuse or damaged wiring', 'Clogged fuel filter or strainer', 'Fault in the fuel pump control module'],
    fixes: ['Check fuse, relay and supply voltage to the pump', 'Test fuel pressure and volume', 'Replace the pump, relay or filter as required'],
  },
  maf: {
    system: 'Fuel & Air Metering',
    symptoms: ['Rough idle or stalling', 'Poor acceleration', 'Poor fuel economy', 'Black smoke or hesitation'],
    causes: ['Dirty or contaminated MAF sensor element', 'Intake leak after the MAF sensor', 'Damaged wiring or connector', 'Clogged air filter or restricted intake', 'Faulty MAF sensor'],
    fixes: ['Inspect the air filter and intake duct', 'Clean the MAF sensor with MAF-safe cleaner', 'Check for intake leaks and wiring faults', 'Replace the MAF sensor if readings are implausible'],
  },
  map: {
    system: 'Fuel & Air Metering',
    symptoms: ['Poor idle quality', 'Hesitation and low power', 'Poor fuel economy', 'Black smoke or hard starting'],
    causes: ['Faulty MAP / barometric sensor', 'Cracked or blocked vacuum hose to the sensor', 'Wiring or connector fault', 'Intake or boost leak', 'Reference voltage or ground fault'],
    fixes: ['Compare the MAP reading key-on engine-off to barometric pressure', 'Inspect the vacuum hose and connector', 'Check the 5 V reference and ground', 'Replace the sensor if faulty'],
  },
  iat: {
    system: 'Fuel & Air Metering',
    symptoms: ['Slightly rough running or poor economy', 'Hard hot starting', 'Reduced power in extreme temperatures'],
    causes: ['Faulty IAT sensor', 'Wiring open or short to ground', 'Corroded connector', 'Heat soak from engine bay (for range codes)'],
    fixes: ['Compare IAT with ambient temperature on a cold engine', 'Check the connector and wiring', 'Replace the IAT sensor'],
  },
  ect: {
    system: 'Cooling System',
    symptoms: ['Hard starting or poor idle', 'Cooling fan running constantly or not at all', 'Poor fuel economy', 'Temperature gauge reads wrong'],
    causes: ['Faulty coolant temperature sensor', 'Wiring open or short, corroded connector', 'Low coolant level or air in the cooling system', 'Faulty thermostat (for range codes)'],
    fixes: ['Compare sensor reading with a scan-tool coolant temperature on a cold engine', 'Check the connector and wiring', 'Top up and bleed the coolant', 'Replace the sensor or thermostat as needed'],
  },
  thermostat: {
    system: 'Cooling System',
    symptoms: ['Engine slow to warm up', 'Weak cabin heat', 'Poor fuel economy', 'Temperature gauge stays low'],
    causes: ['Thermostat stuck open', 'Faulty coolant temperature sensor', 'Low coolant level', 'Cooling fan running continuously'],
    fixes: ['Monitor warm-up time with a scan tool', 'Replace the thermostat', 'Verify the coolant sensor accuracy', 'Top up and bleed the coolant system'],
  },
  o2: {
    system: 'Oxygen Sensors',
    symptoms: ['Poor fuel economy', 'Rough idle', 'Failed emissions test', 'Check-engine light'],
    causes: ['Failing oxygen / air-fuel sensor', 'Damaged wiring, connector or heater fuse', 'Exhaust leak near the sensor', 'Fuel mixture problem (vacuum leak, injector, fuel pressure)', 'Contaminated sensor (oil, coolant, silicone)'],
    fixes: ['Inspect wiring and connector near the exhaust', 'Check for exhaust and vacuum leaks', 'Watch sensor voltage in live data (should switch rapidly for a wideband-less sensor)', 'Replace the sensor with the correct part'],
  },
  o2heater: {
    system: 'Oxygen Sensors',
    symptoms: ['Poor fuel economy', 'Check-engine light', 'Longer time to closed-loop', 'Failed emissions test'],
    causes: ['Failed heater element inside the sensor', 'Blown heater fuse or relay', 'Damaged wiring or connector', 'Fault in the ECM heater driver'],
    fixes: ['Check the heater fuse and supply voltage', 'Measure heater resistance at the sensor connector', 'Repair wiring or replace the sensor'],
  },
  o2response: {
    system: 'Oxygen Sensors',
    symptoms: ['Poor fuel economy', 'Rich or lean running', 'Failed emissions test', 'Check-engine light'],
    causes: ['Aged or contaminated oxygen sensor', 'Exhaust leak', 'Persistent rich or lean condition', 'Wiring fault'],
    fixes: ['Fix any exhaust leak', 'Verify fuel trims are normal', 'Replace the oxygen sensor'],
  },
  cat: {
    system: 'Emissions - Catalyst',
    symptoms: ['Check-engine light only (often no driveability problem)', 'Failed emissions test', 'Rotten-egg (sulphur) smell', 'Reduced power if badly clogged'],
    causes: ['Worn-out catalytic converter', 'Failing downstream oxygen sensor', 'Exhaust leak before or around the sensors', 'Engine misfire or oil/coolant burning damaging the catalyst', 'Rich or lean running over a long time'],
    fixes: ['Fix misfires and fuel-trim issues first', 'Check for exhaust leaks', 'Compare upstream and downstream oxygen sensor waveforms', 'Replace the catalytic converter if efficiency is confirmed low'],
  },
  evap: {
    system: 'Emissions - EVAP',
    symptoms: ['Check-engine light only', 'Fuel smell near the car or tank', 'Difficult refuelling (pump clicks off)', 'Failed emissions test'],
    causes: ['Loose, missing or worn fuel filler cap', 'Cracked EVAP hose or canister', 'Faulty purge or vent valve', 'Leaking fuel tank, filler neck or seals', 'Faulty fuel tank pressure sensor'],
    fixes: ['Tighten or replace the fuel cap and recheck after a few drive cycles', 'Smoke-test the EVAP system', 'Test purge and vent valves', 'Replace damaged hoses, valves or canister'],
  },
  evapSensor: {
    system: 'Emissions - EVAP',
    symptoms: ['Check-engine light only', 'Possible hard refuelling', 'EVAP monitor not ready'],
    causes: ['Faulty EVAP pressure sensor', 'Wiring or connector fault', 'Blocked or kinked vent line', 'Faulty vent or purge valve'],
    fixes: ['Check the sensor signal key-on engine-off', 'Inspect wiring and hoses', 'Replace the sensor or valve'],
  },
  egr: {
    system: 'Emissions - EGR',
    symptoms: ['Rough idle or stalling', 'Pinging or knocking under load', 'Reduced power', 'Failed emissions test'],
    causes: ['Carbon-clogged EGR valve or passages', 'Faulty EGR valve, actuator or position sensor', 'Vacuum hose or solenoid fault (vacuum-operated valves)', 'Wiring or connector fault', 'Blocked EGR cooler (diesel and some petrol engines)'],
    fixes: ['Inspect and clean the EGR valve and passages', 'Command the valve with a scan tool and watch the position', 'Check vacuum supply or electrical control', 'Replace the EGR valve, sensor or cooler'],
  },
  secAir: {
    system: 'Emissions - Secondary Air',
    symptoms: ['Check-engine light', 'Whining from the air pump on cold start', 'Failed emissions test'],
    causes: ['Failed secondary air pump or relay', 'Stuck or clogged check/combi valve', 'Vacuum or wiring fault', 'Blown fuse'],
    fixes: ['Check fuse and relay', 'Test the pump directly with 12 V', 'Replace the combi valve or pump', 'Inspect hoses for carbon or water damage'],
  },
  throttle: {
    system: 'Throttle Control',
    symptoms: ['Reduced power / limp mode', 'Erratic or high idle', 'Poor throttle response', 'Check-engine and sometimes throttle warning light'],
    causes: ['Dirty or sticking throttle body', 'Faulty throttle position sensor or motor', 'Wiring or connector fault', 'Low supply voltage', 'ECM fault (rare)'],
    fixes: ['Clean the throttle body', 'Check TPS signal sweep and throttle motor operation', 'Inspect wiring and reference voltage', 'Perform throttle adaptation / relearn after repair'],
  },
  pedal: {
    system: 'Throttle Control',
    symptoms: ['Limp mode with reduced power', 'Unresponsive accelerator', 'High or erratic idle', 'Warning light'],
    causes: ['Faulty accelerator pedal position sensor', 'Wiring or connector fault', 'Reference voltage or ground problem', 'Throttle body fault'],
    fixes: ['Check both pedal sensor signals in live data', 'Inspect wiring and connector', 'Replace the pedal assembly if signals disagree'],
  },
  idle: {
    system: 'Idle Control',
    symptoms: ['Idle too high, too low or hunting', 'Stalling at stops', 'Rough idle with A/C or electrical load'],
    causes: ['Dirty throttle body or idle air control valve', 'Vacuum leak', 'Faulty IAC valve or throttle actuator', 'Dirty MAF sensor', 'Low battery voltage'],
    fixes: ['Clean the throttle body and IAC passages', 'Smoke-test for vacuum leaks', 'Perform idle relearn procedure', 'Replace the IAC valve or actuator'],
  },
  vss: {
    system: 'Speed / Brake Input',
    symptoms: ['Speedometer not working or erratic', 'Transmission shifting problems', 'ABS / traction light may be on', 'Check-engine light'],
    causes: ['Faulty vehicle speed or wheel speed sensor', 'Damaged wiring or connector', 'Damaged tone ring', 'Faulty ABS module or instrument cluster'],
    fixes: ['Compare speed values from ABS and engine ECU in live data', 'Inspect sensor wiring and tone ring', 'Replace the sensor'],
  },
  fan: {
    system: 'Cooling System',
    symptoms: ['Engine overheats in traffic', 'A/C performance drops at idle', 'Fan runs constantly or never'],
    causes: ['Faulty cooling fan motor or relay', 'Blown fuse', 'Wiring or connector fault', 'Faulty fan control module or coolant sensor'],
    fixes: ['Check fuses and relays', 'Command the fan with a scan tool', 'Test the fan motor and wiring', 'Replace the failed part'],
  },
  oilPressure: {
    system: 'Lubrication',
    symptoms: ['Oil pressure warning light', 'Engine noise (ticking or knocking)', 'Possible overheating'],
    causes: ['Low oil level or wrong viscosity', 'Worn oil pump or bearings', 'Clogged oil pickup or filter', 'Faulty oil pressure sensor or switch', 'Wiring fault'],
    fixes: ['Check oil level immediately', 'Verify pressure with a mechanical gauge', 'Replace the sensor if pressure is normal', 'Repair mechanical wear if pressure is truly low'],
  },
  voltage: {
    system: 'Charging / Electrical',
    symptoms: ['Dim lights or battery warning', 'Hard starting', 'Random warning lights and drivability issues', 'Electrical items malfunction'],
    causes: ['Weak or failing battery', 'Faulty alternator or regulator', 'Loose or corroded battery terminals / grounds', 'Worn drive belt', 'Parasitic drain'],
    fixes: ['Test battery state of health and charging voltage (13.5 - 14.7 V)', 'Clean and tighten terminals and grounds', 'Inspect the drive belt', 'Replace the battery or alternator'],
  },
  ecm: {
    system: 'Engine Control Module',
    symptoms: ['Check-engine light', 'Possible no-start or stalling', 'Limp mode', 'Multiple unrelated codes'],
    causes: ['Internal ECM/PCM fault', 'Low or unstable battery voltage', 'Poor power or ground connection', 'Water damage or corrosion', 'Failed software update / needs reprogramming'],
    fixes: ['Check battery voltage and all ECM power/ground circuits', 'Look for manufacturer software updates', 'Clear codes and see if the fault returns', 'Replace or reprogram the ECM only after the above is verified'],
  },
  cruise: {
    system: 'Speed / Brake Input',
    symptoms: ['Cruise control will not engage', 'Brake lights stay on or do not work', 'Check-engine light'],
    causes: ['Faulty brake switch or misadjusted switch', 'Wiring or connector fault', 'Blown brake-light fuse', 'Faulty cruise control switch'],
    fixes: ['Check brake lights work', 'Adjust or replace the brake switch', 'Inspect wiring and fuses'],
  },
  trans: {
    system: 'Transmission',
    symptoms: ['Harsh, delayed or flaring shifts', 'Transmission stuck in one gear (limp mode)', 'Slipping or shuddering', 'Check-engine and/or transmission warning light'],
    causes: ['Low, burnt or wrong transmission fluid', 'Faulty sensor, solenoid or wiring', 'Worn clutches or internal mechanical fault', 'Valve body wear', 'Transmission control module fault'],
    fixes: ['Check fluid level and condition', 'Scan the TCM for related codes and live data', 'Inspect wiring and connectors at the transmission', 'Service the transmission, replace the faulty sensor/solenoid or repair internally'],
  },
  tcc: {
    system: 'Transmission',
    symptoms: ['Shudder at 40 - 60 km/h', 'Engine stalls when stopping', 'Poor fuel economy', 'Check-engine light'],
    causes: ['Faulty torque converter clutch solenoid', 'Dirty or degraded fluid', 'Worn torque converter clutch', 'Wiring fault'],
    fixes: ['Change fluid and filter with the correct fluid', 'Test the TCC solenoid resistance', 'Replace the solenoid or torque converter'],
  },
  shiftSol: {
    system: 'Transmission',
    symptoms: ['Harsh or missed shifts', 'Stuck in gear / limp mode', 'Check-engine and transmission warning light'],
    causes: ['Failed shift solenoid', 'Contaminated fluid or clogged valve body passages', 'Wiring or connector fault', 'Low fluid level'],
    fixes: ['Check fluid and change if burnt or dirty', 'Test solenoid resistance and wiring', 'Replace the solenoid or service the valve body'],
  },
  pressureSol: {
    system: 'Transmission',
    symptoms: ['Harsh shifts or flare', 'Slipping', 'Limp mode', 'Transmission warning light'],
    causes: ['Faulty pressure control solenoid', 'Low or contaminated fluid', 'Wiring fault', 'Valve body wear'],
    fixes: ['Inspect fluid', 'Test the solenoid and wiring', 'Replace the solenoid or service the valve body'],
  },
  turbo: {
    system: 'Forced Induction',
    symptoms: ['Loss of power / limp mode', 'Whistling or siren noise', 'Black or blue smoke', 'Check-engine light'],
    causes: ['Boost leak (hose, intercooler, clamp)', 'Stuck wastegate / VGT actuator or faulty boost control solenoid', 'Faulty boost pressure sensor', 'Worn turbocharger', 'Clogged air filter or restricted exhaust (DPF / catalyst)'],
    fixes: ['Pressure-test the intake and intercooler for leaks', 'Check vacuum lines and the boost control solenoid', 'Verify actuator movement', 'Replace the turbocharger only after oil supply and leaks are ruled out'],
  },
  dpf: {
    system: 'Emissions - Diesel Particulate Filter',
    symptoms: ['DPF warning light', 'Reduced power / limp mode', 'Frequent regenerations and high fuel use', 'Hot exhaust smell'],
    causes: ['Soot-loaded or ash-loaded DPF', 'Short-trip driving preventing regeneration', 'Faulty differential pressure or exhaust temperature sensor', 'Injector or EGR problems causing excess soot', 'Wrong engine oil (not low-SAPS)'],
    fixes: ['Drive at sustained highway speed to complete a regeneration', 'Run a forced regeneration with a scan tool', 'Check DPF pressure and temperature sensors', 'Clean or replace the DPF if blocked'],
  },
  scr: {
    system: 'Emissions - SCR / NOx',
    symptoms: ['AdBlue / DEF warning message', 'Reduced power or restart inhibit countdown', 'Failed emissions test'],
    causes: ['Low or contaminated AdBlue / DEF', 'Faulty NOx sensor', 'Clogged dosing injector or crystallised urea', 'Degraded SCR catalyst'],
    fixes: ['Refill with fresh, correct-spec AdBlue / DEF', 'Check NOx sensors and dosing injector', 'Replace faulty parts and perform adaptation reset'],
  },
  glow: {
    system: 'Diesel Starting Aids',
    symptoms: ['Hard cold starting', 'White smoke on start-up', 'Glow plug warning light', 'Rough running until warm'],
    causes: ['Failed glow plug', 'Faulty glow plug relay / control module', 'Blown fuse or wiring fault'],
    fixes: ['Measure resistance of each glow plug', 'Check relay, fuse and control module', 'Replace failed glow plugs (as a set if old)'],
  },
  runner: {
    system: 'Intake Air System',
    symptoms: ['Loss of low-rpm torque', 'Rough idle', 'Check-engine light', 'Possible limp mode'],
    causes: ['Carbon-jammed or broken intake manifold flaps', 'Failed flap actuator / motor or linkage', 'Faulty position sensor or wiring', 'Vacuum control fault'],
    fixes: ['Inspect the flaps and linkage for carbon and breakage', 'Command the actuator with a scan tool', 'Replace the actuator or manifold flap assembly'],
  },
  hybrid: {
    system: 'Hybrid / HV System',
    symptoms: ['Hybrid system warning light', 'Reduced power or limp mode', 'Poor fuel economy', 'Car may not enter READY mode'],
    causes: ['Degraded high-voltage battery or imbalanced cells', 'Faulty sensor, relay or interlock', 'Isolation (leakage) fault', 'Cooling fan or duct blockage for the battery'],
    fixes: ['Read hybrid-specific data with a capable scan tool', 'Clean battery cooling fan and ducts', 'Have the HV system tested by a qualified hybrid technician'],
  },
  wheel: {
    system: 'ABS / Brakes',
    symptoms: ['ABS and traction control warning lights', 'ABS may not work in a hard stop', 'Speedometer error on some cars', 'Brake pedal normal (base brakes still work)'],
    causes: ['Faulty or dirty wheel speed sensor', 'Damaged sensor wiring or connector', 'Damaged or rusty tone ring / wheel bearing', 'Wrong tyre size or air gap incorrect'],
    fixes: ['Inspect the sensor, its wiring and the tone ring', 'Compare wheel speeds in live data on a test drive', 'Replace the wheel speed sensor or wheel bearing'],
  },
  absHyd: {
    system: 'ABS / Brakes',
    symptoms: ['ABS and traction control lights on', 'ABS or stability control disabled', 'Pedal feel may change'],
    causes: ['Faulty ABS pump motor, valve or relay', 'Low brake-system voltage or poor ground', 'Blown ABS fuse', 'Faulty ABS control module'],
    fixes: ['Check ABS fuses, relays and battery voltage', 'Perform ABS actuator tests with a scan tool', 'Replace the failed component or hydraulic unit'],
  },
  airbag: {
    system: 'Airbag / SRS',
    symptoms: ['Airbag (SRS) warning light on', 'Airbags may not deploy', 'Seat belt pretensioners may be disabled'],
    causes: ['Faulty airbag, squib or clockspring', 'Damaged connector under seat or in steering column', 'Faulty crash sensor', 'Previous crash with unreplaced components', 'Low system voltage'],
    fixes: ['Do not probe SRS circuits with a test lamp - use a scan tool', 'Inspect connectors (disconnect battery first and wait as per the manual)', 'Have a qualified technician replace the failed component'],
  },
  bodyElec: {
    system: 'Body Electrical',
    symptoms: ['Related feature not working', 'Warning light or message', 'Intermittent electrical behaviour'],
    causes: ['Faulty switch, sensor or actuator', 'Wiring damage or corroded connector', 'Blown fuse', 'Faulty body control module'],
    fixes: ['Check related fuses', 'Inspect wiring and connectors', 'Test the component and replace if faulty'],
  },
  canBus: {
    system: 'Network / CAN Bus',
    symptoms: ['Multiple warning lights', 'Modules not communicating', 'Possible no-start or limp mode', 'Dead instrument cluster or gauges'],
    causes: ['Damaged CAN wiring or shorted CAN-H / CAN-L', 'Faulty module pulling the bus down', 'Poor ground or low battery voltage', 'Water in connectors', 'Missing terminating resistor'],
    fixes: ['Check battery voltage and grounds first', 'Measure CAN-H / CAN-L resistance (about 60 ohm across the bus)', 'Unplug modules one by one to find the one disturbing the bus', 'Repair wiring or replace the faulty module'],
  },
  netModule: {
    system: 'Network / Communication',
    symptoms: ['Related system inoperative', 'Warning lights on the dashboard', 'Multiple U-codes stored in other modules'],
    causes: ['Module has no power or poor ground', 'Blown fuse', 'CAN/LIN wiring fault', 'Faulty or unprogrammed module', 'Low battery voltage'],
    fixes: ['Check the affected module fuse, power and ground', 'Scan all modules to see which ones are missing', 'Inspect the CAN wiring and connectors', 'Replace or reprogram the module if it is dead'],
  },
  acSystem: {
    system: 'Climate Control',
    symptoms: ['A/C blows warm', 'Compressor not cycling', 'Idle changes when A/C is on'],
    causes: ['Low refrigerant', 'Faulty pressure sensor or clutch relay', 'Wiring fault', 'Failed compressor'],
    fixes: ['Check refrigerant pressure', 'Test relay, clutch and sensor', 'Repair leaks and recharge'],
  },
  immo: {
    system: 'Immobilizer / Security',
    symptoms: ['Engine cranks but will not start', 'Security/key light flashing', 'Engine starts then stalls after 1 - 2 seconds'],
    causes: ['Key transponder not recognised', 'Faulty immobilizer antenna / coil', 'Low key fob battery or battery voltage', 'ECM and immobilizer not matched'],
    fixes: ['Try the spare key', 'Check the antenna coil and wiring', 'Re-register keys with the proper tool'],
  },
  fuelLevel: {
    system: 'Fuel Delivery',
    symptoms: ['Fuel gauge inaccurate', 'Low-fuel light on unexpectedly', 'EVAP monitor may not run'],
    causes: ['Faulty fuel level sender', 'Wiring or connector fault', 'Corroded sender contacts'],
    fixes: ['Compare gauge to actual fuel level', 'Inspect the connector at the tank', 'Replace the sender unit'],
  },
  sensorRef: {
    system: 'Engine Control Module',
    symptoms: ['Multiple sensor codes at once', 'Rough running or limp mode', 'Check-engine light'],
    causes: ['Shorted sensor on the 5 V reference circuit', 'Wiring harness damage', 'Faulty ECM reference supply'],
    fixes: ['Unplug sensors sharing the reference line one at a time', 'Check the reference voltage (about 5 V)', 'Repair the harness or replace the shorted sensor'],
  },
};

export const DEFAULT_DRIVE: Record<Severity, string> = {
  low: 'Safe to drive. Have it checked at your next service.',
  medium: 'Drive gently and get it diagnosed within a few days.',
  high: 'Avoid driving except to a workshop - risk of further damage.',
  critical: 'Stop driving. Do not continue until it has been inspected.',
};

export const sectionOf = (code: string): Section => {
  switch (code[0]) {
    case 'P': return 'Powertrain';
    case 'C': return 'Chassis';
    case 'B': return 'Body';
    case 'U': return 'Network';
    default: return 'Powertrain';
  }
};

/**
 * Compact row: [code, title, severity, template, description, extraCauses?, canDrive?]
 */
export type Row = [
  code: string,
  title: string,
  severity: Severity,
  tpl: TplKey,
  description: string,
  extraCauses?: string[],
  canDrive?: string,
];

export function build(rows: Row[], makes?: string[]): DtcInfo[] {
  return rows.map(([code, title, severity, tpl, description, extra, canDrive]) => {
    const t = TEMPLATES[tpl];
    return {
      code,
      title,
      section: sectionOf(code),
      system: t.system,
      severity,
      description,
      symptoms: t.symptoms,
      causes: extra ? [...extra, ...t.causes] : t.causes,
      fixes: t.fixes,
      canDrive: canDrive ?? DEFAULT_DRIVE[severity],
      ...(makes ? { makes } : {}),
    };
  });
}
