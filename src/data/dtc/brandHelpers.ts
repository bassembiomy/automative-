import { build, type Row, type TplKey } from './build';
import { generic } from './generic';
import type { DtcInfo, Severity } from './types';

/** Brand-specific note layered on a standard SAE code: [code, severity, template, description, extraCauses?, canDrive?] */
export type BrandRow = [
  code: string,
  severity: Severity,
  tpl: TplKey,
  description: string,
  extraCauses?: string[],
  canDrive?: string,
];

const genericTitles = new Map(generic.map((g) => [g.code, g.title]));

/** Build entries for standard SAE codes that carry brand-specific context. Title is taken from the generic set. */
export function buildBrandNotes(rows: BrandRow[], makes: string[]): DtcInfo[] {
  const full: Row[] = rows.map(([code, severity, tpl, description, extra, drive]) => {
    const title = genericTitles.get(code);
    if (!title) throw new Error(`brand note for unknown generic code ${code}`);
    return [code, title, severity, tpl, description, extra, drive];
  });
  return build(full, makes);
}
