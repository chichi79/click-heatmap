export default function DashboardCard({ title, subtitle, action, children, className = '', bodyClassName = '' }) {
  const hasHeader = title || subtitle || action;

  return (
    <div className={`card dashboard-card border-0 shadow-sm mb-4 ${className}`.trim()}>
      {hasHeader && (
        <div className="card-header bg-transparent border-bottom d-flex align-items-start justify-content-between gap-3 py-3">
          <div className="min-w-0">
            {title && <h2 className="h6 mb-0 fw-semibold">{title}</h2>}
            {subtitle && <p className="small text-muted mb-0 mt-1">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={`card-body ${bodyClassName}`.trim()}>{children}</div>
    </div>
  );
}
