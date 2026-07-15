import { X } from 'lucide-react'

export function AdminStatus({ type = 'info', children }) {
  if (!children) return null
  return <div className={`admin-status admin-status--${type}`} role={type === 'error' ? 'alert' : 'status'}>{children}</div>
}

export function AdminModal({ title, children, onClose }) {
  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div className="admin-modal__panel">
        <div className="admin-modal__head">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть форму"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function AdminEmpty({ children }) {
  return <div className="admin-empty">{children}</div>
}
