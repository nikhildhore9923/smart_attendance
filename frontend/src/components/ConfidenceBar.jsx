import clsx from 'clsx'

export default function ConfidenceBar({ value, className, showLabel = true }) {
  const pct = Math.min(100, Math.max(0, value ?? 0))
  const level = pct >= 80 ? 'high' : pct >= 60 ? 'mid' : 'low'

  return (
    <div className={clsx('confidence-bar-wrap', className)}>
      <div className="progress-bar" style={{ maxWidth: showLabel ? 80 : '100%' }}>
        <div
          className={clsx('progress-fill', `conf-${level}`)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className={clsx('confidence-label', `conf-text-${level}`)}>
          {pct.toFixed(0)}%
        </span>
      )}
    </div>
  )
}
