import clsx from 'clsx'

export default function LoadingSpinner({ size = 'md', className }) {
  const sizes = { sm: 20, md: 28, lg: 40 }
  const px = sizes[size] || sizes.md
  return (
    <div
      className={clsx('loading-spinner', className)}
      style={{ width: px, height: px }}
      role="status"
      aria-label="Loading"
    />
  )
}

export function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div className="loading-screen">
      <LoadingSpinner size="lg" />
      <p className="loading-screen-text">{message}</p>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <LoadingSpinner />
    </div>
  )
}
