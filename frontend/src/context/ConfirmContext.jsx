import { createContext, useContext, useState, useCallback } from 'react'
import ConfirmModal from '../components/ConfirmModal'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
    resolve: null
  })

  const confirm = useCallback(({ 
    title = 'Are you sure?', 
    message = 'This action cannot be undone.', 
    confirmText = 'Confirm', 
    cancelText = 'Cancel', 
    type = 'danger' 
  }) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        resolve
      })
    })
  }, [])

  const handleConfirm = () => {
    modalState.resolve?.(true)
    setModalState(prev => ({ ...prev, isOpen: false }))
  }

  const handleCancel = () => {
    modalState.resolve?.(false)
    setModalState(prev => ({ ...prev, isOpen: false }))
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        type={modalState.type}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return ctx
}
