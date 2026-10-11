import { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'

const Ctx = createContext(null)

export function SubjectProvider({ children }) {
  const [subjects, setSubjects] = useState([])
  const [subject, setSubjectState] = useState(localStorage.getItem('smartattend_active_subject') || '')

  const loadSubjects = () => {
    api.get('/academic/subjects')
      .then(res => {
        setSubjects(res.data)
        if (res.data.length > 0) {
          const currentValid = res.data.find(s => s.id === localStorage.getItem('smartattend_active_subject'))
          if (!currentValid) {
            setSubjectState(res.data[0].id)
            localStorage.setItem('smartattend_active_subject', res.data[0].id)
          }
        } else {
          setSubjectState('')
          localStorage.removeItem('smartattend_active_subject')
        }
      })
      .catch(console.error)
  }

  useEffect(() => {
    loadSubjects()
  }, [])

  const setSubject = (id) => {
    setSubjectState(id)
    localStorage.setItem('smartattend_active_subject', id)
  }

  return (
    <Ctx.Provider value={{ subject, setSubject, subjects, reloadSubjects: loadSubjects }}>
      {children}
    </Ctx.Provider>
  )
}

export const useSubject = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSubject must be used within SubjectProvider')
  return ctx
}
