import { build, type Row } from './build';
import { buildBrandNotes, type BrandRow } from './brandHelpers';
import type { DtcInfo } from './types';

const TOYOTA = ['Toyota', 'Lexus'];
const HONDA = ['Honda', 'Acura'];
const NISSAN = ['Nissan', 'Infiniti'];

const toyota: Row[] = [
  ['P1120', 'Accelerator Pedal Position Sensor Out of Range', 'high', 'pedal', 'Toyota/Lexus code: the accelerator pedal position sensor signal is outside its valid range.'],
  ['P1125', 'Throttle Control Motor Circuit', 'high', 'throttle', 'Toyota/Lexus code: the electronic throttle control motor circuit is open or shorted. Limp mode is common.'],
  ['P1129', 'Electric Throttle Control System', 'high', 'throttle', 'Toyota/Lexus code: the electronic throttle control system has a general malfunction.'],
  ['P1130', 'Air-Fuel Ratio Sensor Circuit Range/Performance (Bank 1 Sensor 1)', 'medium', 'o2', 'Toyota/Lexus code: the upstream air-fuel ratio sensor on bank 1 gives an implausible reading.'],
  ['P1133', 'Air-Fuel Ratio Sensor Response Malfunction (Bank 1 Sensor 1)', 'medium', 'o2response', 'Toyota/Lexus code: the upstream air-fuel ratio sensor on bank 1 responds too slowly.'],
  ['P1135', 'Air-Fuel Ratio Sensor Heater Circuit (Bank 1 Sensor 1)', 'medium', 'o2heater', 'Toyota/Lexus code: the heater circuit of the upstream air-fuel sensor on bank 1 has a fault.'],
  ['P1200', 'Fuel Pump Relay Circuit Malfunction', 'high', 'fuelPump', 'Toyota/Lexus code: the fuel pump relay / control circuit has a fault, which can cause a no-start.'],
  ['P1300', 'Igniter Circuit Malfunction No.1', 'high', 'ignition', 'Toyota/Lexus code: the igniter / ignition coil circuit for cylinder 1 has no confirmation signal (IGF) to the ECM.'],
  ['P1335', 'Crankshaft Position Sensor Circuit (No Signal)', 'high', 'crank', 'Toyota/Lexus code: no crankshaft position signal while the engine is cranking.'],
  ['P1346', 'VVT Sensor / Camshaft Position Sensor Range/Performance (Bank 1)', 'high', 'cam', 'Toyota/Lexus code: the VVT (camshaft) sensor signal on bank 1 does not match the crankshaft position.'],
  ['P1349', 'VVT System Malfunction (Bank 1)', 'medium', 'camTiming', 'Toyota/Lexus code: the VVT-i system on bank 1 is not reaching the commanded cam timing. Dirty oil and a clogged oil control valve are common causes.', ['Sludged engine oil / clogged OCV filter']],
  ['P1500', 'Starter Signal Circuit', 'medium', 'bodyElec', 'Toyota/Lexus code: the starter signal (STA) circuit seen by the ECM is faulty.'],
  ['P1520', 'Stop Light Switch Signal Malfunction', 'medium', 'cruise', 'Toyota/Lexus code: the stop (brake) light switch signal is implausible, which can affect cruise control and idle behaviour.'],
  ['P1600', 'ECM Battery Back-up Power Source Malfunction', 'medium', 'voltage', 'Toyota/Lexus code: the ECM back-up (memory) power supply was interrupted, e.g. by a battery disconnect or a blown fuse.'],
  ['P1605', 'Knock Control CPU Malfunction', 'high', 'ecm', 'Toyota/Lexus code: the knock-control processor inside the ECM has a fault.'],
  ['P1656', 'OCV Circuit Malfunction (Bank 1)', 'medium', 'camTiming', 'Toyota/Lexus code: the oil control valve (VVT-i solenoid) circuit on bank 1 is open or shorted.'],
  ['P1780', 'Park/Neutral Position Switch Malfunction', 'medium', 'trans', 'Toyota/Lexus code: the park/neutral position switch signal is inconsistent with the shift lever or engine start.'],
  ['P3000', 'HV Battery Malfunction', 'high', 'hybrid', 'Toyota/Lexus hybrid code: a fault was detected in the hybrid (HV) battery system.', undefined, 'Have the hybrid system checked promptly. Do not touch orange HV cables.'],
];

const honda: Row[] = [
  ['P1009', 'VTC Advance Malfunction', 'medium', 'camTiming', 'Honda/Acura code: the variable timing control (VTC) actuator is not advancing as commanded.', ['Dirty oil or clogged VTC oil control solenoid screen']],
  ['P1259', 'VTEC System Malfunction', 'medium', 'camTiming', 'Honda/Acura code: the VTEC system did not switch as commanded (oil pressure switch or spool valve).', ['Low oil level or wrong grade', 'Clogged VTEC solenoid screen']],
  ['P1297', 'Electrical Load Detector Circuit Low Voltage', 'medium', 'voltage', 'Honda/Acura code: the electrical load detector (ELD) circuit signal is low.'],
  ['P1298', 'Electrical Load Detector Circuit High Voltage', 'medium', 'voltage', 'Honda/Acura code: the electrical load detector (ELD) circuit signal is high.'],
  ['P1336', 'CKP Sensor Intermittent Interruption', 'high', 'crank', 'Honda/Acura code: the crankshaft position sensor signal drops out intermittently.'],
  ['P1337', 'CKP Sensor No Signal', 'high', 'crank', 'Honda/Acura code: no signal from the crankshaft position sensor.'],
  ['P1359', 'CKP/TDC Sensor Connector Disconnection', 'high', 'crank', 'Honda/Acura code: the crankshaft/TDC sensor connector or circuit is disconnected or open.'],
  ['P1361', 'TDC Sensor Intermittent Interruption', 'high', 'cam', 'Honda/Acura code: the TDC sensor signal drops out intermittently.'],
  ['P1362', 'TDC Sensor No Signal', 'high', 'cam', 'Honda/Acura code: no signal from the TDC sensor.'],
  ['P1381', 'CYP Sensor Intermittent Interruption', 'high', 'cam', 'Honda/Acura code: the cylinder position (CYP) sensor signal drops out intermittently.'],
  ['P1382', 'CYP Sensor No Signal', 'high', 'cam', 'Honda/Acura code: no signal from the cylinder position (CYP) sensor.'],
  ['P1456', 'EVAP Emission Control System Leak (Fuel Tank System)', 'low', 'evap', 'Honda/Acura code: a leak was detected in the fuel tank side of the EVAP system. Check the fuel cap, filler neck and the vapour lines first.', ['Loose or worn fuel cap seal', 'Faulty fuel tank pressure sensor or EVAP bypass solenoid']],
  ['P1457', 'EVAP Emission Control System Leak (Canister System)', 'low', 'evap', 'Honda/Acura code: a leak was detected in the canister side of the EVAP system.', ['Cracked canister or hose', 'Faulty canister vent shut valve']],
  ['P1491', 'EGR Valve Lift Insufficient Detected', 'medium', 'egr', 'Honda/Acura code: the EGR valve is not lifting enough, usually due to carbon in the valve or passages.'],
  ['P1498', 'EGR Valve Lift Sensor High Voltage', 'medium', 'egr', 'Honda/Acura code: the EGR valve lift sensor signal is too high.'],
  ['P1519', 'IAC Valve Circuit Failure', 'medium', 'idle', 'Honda/Acura code: the idle air control valve circuit has a fault, which can cause rough idle and stalling.'],
  ['P1607', 'ECM/PCM Internal Circuit Failure A', 'high', 'ecm', 'Honda/Acura code: the ECM/PCM has detected an internal circuit failure.'],
  ['P1768', 'A/T Clutch Pressure Control Solenoid Valve A Circuit Failure', 'medium', 'pressureSol', 'Honda/Acura code: the A/T clutch pressure control solenoid valve A circuit has a fault.'],
];

const nissan: Row[] = [
  ['P1111', 'Intake Valve Timing Control Solenoid Valve Circuit (Bank 1)', 'medium', 'camTiming', 'Nissan/Infiniti code: the intake valve timing (IVT) control solenoid circuit on bank 1 has a fault.'],
  ['P1121', 'Electric Throttle Control Actuator', 'high', 'throttle', 'Nissan/Infiniti code: the electric throttle control actuator is not working correctly.'],
  ['P1122', 'Electric Throttle Control Function', 'high', 'throttle', 'Nissan/Infiniti code: the electronic throttle control function is faulty, often followed by limp mode.'],
  ['P1211', 'TCS Control Unit', 'medium', 'absHyd', 'Nissan/Infiniti code: the traction control system control unit reports a fault.'],
  ['P1212', 'TCS Communication Line', 'medium', 'canBus', 'Nissan/Infiniti code: communication with the traction control system is faulty.'],
  ['P1217', 'Engine Over Temperature (Overheat)', 'critical', 'fan', 'Nissan/Infiniti code: the engine overheated.', ['Cooling fan failure', 'Low coolant or leaks', 'Blown head gasket'], 'Stop driving and let the engine cool. Do not continue until the cooling problem is fixed.'],
  ['P1225', 'CTP Learning Abnormal', 'medium', 'throttle', 'Nissan/Infiniti code: the closed throttle position learning could not be completed.', ['Dirty throttle body needing a throttle relearn']],
  ['P1229', 'Sensor Power Supply Circuit', 'high', 'sensorRef', 'Nissan/Infiniti code: the sensor 5 V power supply circuit is out of range.'],
  ['P1610', 'NATS Lock Mode', 'high', 'immo', 'Nissan/Infiniti code: the NATS anti-theft system has put the engine into lock mode.', undefined, 'The engine will not start or will stall. Try the registered spare key.'],
  ['P1611', 'NATS ID Discord, IMMU-ECM', 'high', 'immo', 'Nissan/Infiniti code: the immobilizer unit and ECM ID codes do not match.', undefined, 'The engine will not start until the immobilizer and ECM are re-registered.'],
  ['P1612', 'NATS Chain of ECM-IMMU', 'high', 'immo', 'Nissan/Infiniti code: the communication chain between ECM and immobilizer unit has failed.'],
  ['P1614', 'NATS Chain of IMMU-KEY', 'high', 'immo', 'Nissan/Infiniti code: the communication chain between key and immobilizer unit has failed.'],
  ['P1706', 'Park/Neutral Position Switch', 'medium', 'trans', 'Nissan/Infiniti code: the park/neutral position switch signal is faulty.'],
  ['P1730', 'A/T Interlock', 'high', 'trans', 'Nissan/Infiniti code: the A/T interlock function detected a fault.'],
  ['P1800', 'VIAS Control Solenoid Valve Circuit', 'medium', 'runner', 'Nissan/Infiniti code: the variable induction air system (VIAS) control solenoid valve circuit has a fault.'],
];

const other: Row[] = [
  ['P1443', 'Vent Control Solenoid Valve Function Problem', 'low', 'evap', 'Subaru code: the EVAP vent control solenoid valve does not operate as expected.'],
  ['P1560', 'Back-up Voltage Circuit Malfunction', 'medium', 'voltage', 'Subaru code: the ECM back-up (keep-alive) power supply is faulty or was interrupted.'],
  ['P1000', 'OBD-II Monitor Testing Not Complete', 'low', 'ecm', 'Mazda code: the OBD-II monitors have not yet completed after a battery disconnect or code clearing. Drive normally to complete them.'],
  ['P1450', 'Unable to Bleed Up Fuel Tank Vacuum', 'low', 'evap', 'Mazda code: the EVAP system could not build the expected vacuum in the fuel tank (blocked vent or loose cap).'],
  ['P1260', 'Theft Detected - Engine Disabled', 'high', 'immo', 'Mazda code: the anti-theft system has disabled the engine because the key was not recognised.', undefined, 'The engine will not run. Try the spare key and have the immobilizer checked.'],
];

const notes: BrandRow[] = [
  ['P0420', 'medium', 'cat', 'Catalyst efficiency below threshold. On Subaru boxer engines check for oil consumption and misfire first; Subaru, Mazda and Mitsubishi cars are also known to set this code from a lazy downstream sensor.', ['Aging downstream oxygen sensor reading slowly']],
  ['P0456', 'low', 'evap', 'Very small EVAP leak. Common on Mazda and Subaru vehicles: replace the fuel cap, then check the purge and vent valves and hoses.', ['Aged fuel cap seal or cracked vent hose']],
  ['P0128', 'low', 'thermostat', 'Thermostat below regulating temperature. Typical on Toyota, Honda, Nissan, Subaru and Mazda engines when the thermostat sticks open.'],
  ['P0171', 'medium', 'fuelTrim', 'Bank 1 too lean. On Japanese-brand engines check the MAF sensor, PCV hose and intake boot for leaks.'],
  ['P0300', 'high', 'misfire', 'Random misfire. Check ignition coils and spark plugs (iridium plugs have long intervals but still wear), then fuel delivery.', undefined, 'Drive gently to a workshop. Stop if the check-engine light is flashing.'],
];

export const japanese: DtcInfo[] = [
  ...build(toyota, TOYOTA),
  ...build(honda, HONDA),
  ...build(nissan, NISSAN),
  ...build(other.slice(0, 2), ['Subaru']),
  ...build(other.slice(2), ['Mazda']),
  ...buildBrandNotes(notes.slice(0, 2), ['Subaru', 'Mazda', 'Mitsubishi', 'Suzuki']),
  ...buildBrandNotes(notes.slice(2), ['Toyota', 'Lexus', 'Honda', 'Acura', 'Nissan', 'Infiniti', 'Subaru', 'Mazda', 'Mitsubishi', 'Suzuki']),
];
