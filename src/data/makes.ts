export type Region = 'Korean' | 'German' | 'Japanese' | 'Chinese';

export interface MakeInfo {
  name: string;
  region: Region;
  /** WMI prefixes (2 or 3 characters) used for offline VIN decoding. */
  wmi: string[];
}

export const MAKES: MakeInfo[] = [
  { name: 'Hyundai', region: 'Korean', wmi: ['KMH', '5NP', '5NM', 'KM8', 'TMA'] },
  { name: 'Kia', region: 'Korean', wmi: ['KNA', 'KND', 'KNM', 'KNC', '5XY', '5XX', 'U5Y'] },
  { name: 'Genesis', region: 'Korean', wmi: ['KMT', 'KMU'] },
  { name: 'Volkswagen', region: 'German', wmi: ['WVW', 'WVG', '3VW', '1VW', 'WV1', 'WV2', 'AAV'] },
  { name: 'Audi', region: 'German', wmi: ['WAU', 'WA1', 'WUA', 'TRU'] },
  { name: 'BMW', region: 'German', wmi: ['WBA', 'WBS', 'WBX', 'WBY', '5UX', '5YM', '4US'] },
  { name: 'Mini', region: 'German', wmi: ['WMW', 'WMZ'] },
  { name: 'Mercedes-Benz', region: 'German', wmi: ['WDB', 'WDD', 'WDC', 'W1K', 'W1N', 'W1V', '4JG', '55S'] },
  { name: 'Porsche', region: 'German', wmi: ['WP0', 'WP1'] },
  { name: 'Skoda', region: 'German', wmi: ['TMB'] },
  { name: 'Seat', region: 'German', wmi: ['VSS'] },
  { name: 'Opel', region: 'German', wmi: ['W0L', 'W0V'] },
  { name: 'Toyota', region: 'Japanese', wmi: ['JT', '4T', '5T', '2T', '1NX', 'SB1', 'JTD', 'JTE', 'JTM', 'JTN'] },
  { name: 'Lexus', region: 'Japanese', wmi: ['JTH', 'JTJ', '2T2'] },
  { name: 'Honda', region: 'Japanese', wmi: ['JHM', '1HG', '2HG', 'SHH', '5FN', 'SHS'] },
  { name: 'Acura', region: 'Japanese', wmi: ['19U', 'JH4', '19X'] },
  { name: 'Nissan', region: 'Japanese', wmi: ['JN', '1N', '3N', '5N1', 'SJN'] },
  { name: 'Infiniti', region: 'Japanese', wmi: ['JNK', 'JNR'] },
  { name: 'Mazda', region: 'Japanese', wmi: ['JM1', 'JM3', 'JMZ', '4F2'] },
  { name: 'Subaru', region: 'Japanese', wmi: ['JF1', 'JF2', '4S3', '4S4'] },
  { name: 'Mitsubishi', region: 'Japanese', wmi: ['JA3', 'JA4', 'ML3', 'JA'] },
  { name: 'Suzuki', region: 'Japanese', wmi: ['JS', 'TSM'] },
  // MG: SAIC-built cars (LSJ) and 2002-2005 MG Rover cars built in the UK (SAR).
  { name: 'MG', region: 'Chinese', wmi: ['LSJ', 'SAR'] },
  { name: 'Chery', region: 'Chinese', wmi: ['LVV'] },
  { name: 'Geely', region: 'Chinese', wmi: ['L6T', 'LB3'] },
  { name: 'BYD', region: 'Chinese', wmi: ['LGX', 'LC0'] },
  { name: 'Great Wall / Haval', region: 'Chinese', wmi: ['LGW'] },
  { name: 'Changan', region: 'Chinese', wmi: ['LS5'] },
  { name: 'JAC', region: 'Chinese', wmi: ['LJ1'] },
];

export const REGIONS: Region[] = ['Korean', 'German', 'Japanese', 'Chinese'];

export const makesByRegion = (r: Region): MakeInfo[] => MAKES.filter((m) => m.region === r);
export const findMake = (name: string): MakeInfo | undefined => MAKES.find((m) => m.name.toLowerCase() === name.toLowerCase());

export function modelYears(from = 2002, to = new Date().getFullYear() + 1): number[] {
  const out: number[] = [];
  for (let y = to; y >= from; y--) out.push(y);
  return out;
}
