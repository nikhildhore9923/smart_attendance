const fs = require('fs');
const code = `import { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'

const Ctx = createContext(null)

export function SubjectProvider({ children }) {
  const [subjects, setSubjects] = useState([])
  const [subject, setSubjectState] = useState(localStorage.getItem('smartattend_active_subject') || '')

  useEffect(() => {
    api.get('/academic/subjects')
      .then(res => {
        setSubjects(res.data)
        if (res.data.length > 0 && !res.data.find(s => s.id === localStorage.getItem('smartattend_active_subject'))) {
          setSubjectState(res.data[0].id)
        }
      })
      .catch(console.error)
  }, [])

  const setSubject = (id) => {
    setSubjectState(id)
    localStorage.setItem('smartattend_active_subject', id)
  }

  return (
    <Ctx.Provider value={{ subject, setSubject, subjects }}>
      {children}
    </Ctx.Provider>
  )
}

export const useSubject = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSubject must be used within SubjectProvider')
  return ctx
}
`
fs.writeFileSync('frontend/src/context/SubjectContext.jsx', code);
console.log('Fixed SubjectContext to use API.');
