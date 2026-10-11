import clsx from 'clsx'

export default function PageHeader({ title, subtitle, children, badge }) {
  return (
    <div className="page-header animate-fade-up">
      <div className="page-header-text">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="page-title">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </div>
  )
}

export function LiveBadge() {
  return (
    <span className="badge badge-green live-badge">
      <span className="pulse-dot" style={{ width: 6, height: 6 }} />
      Live
    </span>
  )
}

export function SectionCard({ title, icon: Icon, action, children, className }) {
  return (
    <div className={clsx('card', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={16} className="text-muted-icon" />}
            {title && <p className="card-title">{title}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
