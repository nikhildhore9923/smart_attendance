import React from 'react'
import { AlertTriangle, Trash2, X, HelpCircle, ShieldAlert } from 'lucide-react'

/**
 * Modern Custom Confirmation Modal
 * Replaces ugly browser window.confirm() dialogs with a sleek, themed modal.
 */
export default function ConfirmModal({
  isOpen,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger", // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel,
  loading = false
}) {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <ShieldAlert size={22} color="#EF4444" />
      case 'warning':
        return <AlertTriangle size={22} color="#F59E0B" />
      default:
        return <HelpCircle size={22} color="#3B82F6" />
    }
  }

  const getIconBg = () => {
    switch (type) {
      case 'danger':
        return 'rgba(239, 68, 68, 0.15)'
      case 'warning':
        return 'rgba(245, 158, 11, 0.15)'
      default:
        return 'rgba(59, 130, 246, 0.15)'
    }
  }

  const getConfirmBtnClass = () => {
    switch (type) {
      case 'danger':
        return 'btn btn-danger'
      case 'warning':
        return 'btn btn-primary'
      default:
        return 'btn btn-primary'
    }
  }

  return (
    <div 
      className="modal-overlay" 
      onClick={loading ? undefined : onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
    >
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '440px',
          width: '100%',
          background: 'var(--surface)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '24px 24px 20px 24px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: getIconBg(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {getIcon()}
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              {title}
            </h3>
            <p style={{ margin: '8px 0 0 0', fontSize: '13.5px', color: 'var(--muted)', lineHeight: 1.5 }}>
              {message}
            </p>
          </div>

          {!loading && (
            <button 
              className="btn-icon" 
              onClick={onCancel}
              style={{ color: 'var(--muted)', padding: '4px' }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div style={{
          padding: '16px 24px',
          background: 'var(--surface2)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={getConfirmBtnClass()}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
