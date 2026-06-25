import './Badge.css';

export function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info';
}) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
