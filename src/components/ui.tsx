import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, LoaderCircle, OctagonAlert, TriangleAlert } from 'lucide-react';
import type { Section, Severity } from '../data/dtc';

type Variant = 'default' | 'primary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'md', icon, className = '', children, type = 'button', ...rest },
  ref,
) {
  const cls = ['btn', variant !== 'default' ? variant : '', size === 'sm' ? 'sm' : '', className].filter(Boolean).join(' ');
  return (
    <button ref={ref} type={type} className={cls} {...rest}>
      {icon}
      {children}
    </button>
  );
});

export function Card({ children, className = '', ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Spinner({ size = 18, label }: { size?: number; label?: string }) {
  return (
    <span role="status" aria-live="polite" style={{ display: 'inline-flex' }}>
      <LoaderCircle className="spin" size={size} aria-hidden />
      <span className="sr-only">{label ?? 'Loading'}</span>
    </span>
  );
}

const SEV_ICON = { low: Info, medium: TriangleAlert, high: OctagonAlert, critical: OctagonAlert } as const;

/** Severity is shown with icon + text, never colour alone. */
export function SeverityPill({ severity }: { severity: Severity }) {
  const Icon = SEV_ICON[severity];
  return (
    <span className={`sev ${severity}`}>
      <Icon size={14} aria-hidden />
      {severity}
      <span className="sr-only"> severity</span>
    </span>
  );
}

export function SectionBadge({ section }: { section: Section }) {
  return <span className="badge">{section}</span>;
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty card">
      <div className="ico" aria-hidden>
        {icon}
      </div>
      <h2>{title}</h2>
      {children && <p style={{ maxWidth: 520 }}>{children}</p>}
      {action}
    </div>
  );
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'warn' | 'err' | 'ok'; children: ReactNode }) {
  const Icon = kind === 'ok' ? CircleCheck : kind === 'err' ? CircleAlert : kind === 'warn' ? TriangleAlert : Info;
  return (
    <div className={`notice ${kind === 'info' ? '' : kind}`} role={kind === 'err' ? 'alert' : undefined}>
      <Icon size={18} aria-hidden />
      <div>{children}</div>
    </div>
  );
}
