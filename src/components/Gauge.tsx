interface GaugeProps {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  unit: string;
  decimals?: number;
  /** fraction of the range (0..1) above which the arc turns amber / red */
  warnAt?: number;
  dangerAt?: number;
}

const START = 150; // degrees, measured clockwise from 3 o'clock
const SWEEP = 240;
const CX = 60;
const CY = 58;
const R = 46;

function polar(deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [CX + R * Math.cos(rad), CY + R * Math.sin(rad)];
}

function arc(fromDeg: number, toDeg: number): string {
  const [x1, y1] = polar(fromDeg);
  const [x2, y2] = polar(toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** SVG arc gauge. The value is always printed as text too. */
export function Gauge({ label, value, min, max, unit, decimals = 0, warnAt = 0.8, dangerAt = 0.92 }: GaugeProps) {
  const has = value !== undefined && Number.isFinite(value);
  const frac = has ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const color = frac >= dangerAt ? 'var(--sev-critical)' : frac >= warnAt ? 'var(--mil)' : 'var(--accent)';
  const shown = has ? value.toFixed(decimals) : '--';
  return (
    <div className="gauge" role="meter" aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={has ? value : undefined} aria-valuetext={has ? `${shown} ${unit}` : 'no data'}>
      <svg viewBox="0 0 120 96" aria-hidden>
        <path d={arc(START, START + SWEEP)} fill="none" stroke="var(--gauge-track)" strokeWidth="9" strokeLinecap="round" />
        {has && frac > 0.002 && <path d={arc(START, START + SWEEP * frac)} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />}
        <text x={CX} y={CY + 4} textAnchor="middle" className="val" fontSize="20">
          {shown}
        </text>
        <text x={CX} y={CY + 20} textAnchor="middle" className="unit" fontSize="9">
          {unit}
        </text>
        <text x={polar(START)[0] - 2} y={92} textAnchor="middle" className="unit" fontSize="7">
          {min}
        </text>
        <text x={polar(START + SWEEP)[0] + 2} y={92} textAnchor="middle" className="unit" fontSize="7">
          {max}
        </text>
      </svg>
      <div className="g-label">{label}</div>
    </div>
  );
}

export function Sparkline({ data, color = 'var(--accent)' }: { data: number[]; color?: string }) {
  if (data.length < 2) return <svg className="spark" viewBox="0 0 100 30" aria-hidden />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * 100).toFixed(1)},${(28 - ((v - min) / span) * 26).toFixed(1)}`).join(' ');
  return (
    <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
