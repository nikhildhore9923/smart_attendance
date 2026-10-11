const fs = require('fs');
const content = `
import { useState, useEffect } from 'react'
import { BookOpen, Plus, Trash2, Edit } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'

export default function ClassesPage() {
  const [classes, setClasses] = useState([])
  const [hierarchy, setHierarchy] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  
  const [form, setForm] = useState({ name: '', semesterId: '', isActive: true })

  const load = async () => {
    try {
      const [cRes, hRes] = await Promise.all([
        api.get('/academic/classes'),
        api.get('/academic/hierarchy')
      ])
      setClasses(cRes.data)
      setHierarchy(hRes.data)
    } catch(e) { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) await api.patch('/academic/classes/' + editing.id, form)
      else await api.post('/academic/classes', form)
      toast.success('Saved successfully')
      setShowModal(false)
      load()
    } catch(e) { toast.error('Save failed') }
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({ name: c.name, semesterId: c.semesterId || '', isActive: c.isActive })
    setShowModal(true)
  }

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', semesterId: '', isActive: true })
    setShowModal(true)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="page-container">
      <PageHeader title="Classes & Divisions" icon={BookOpen} action={{label: 'New Class', onClick: openNew, icon: Plus}} />
      
      {classes.length === 0 ? (
        <EmptyState icon={BookOpen} title="No classes found" desc="Create a class division to get started" />
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Class Name</th>
                <th>Academic Context</th>
                <th>Students</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map(c => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td>
                    {c.academicSem 
                      ? \`\${c.academicSem.academicYear.name} / \${c.academicSem.program.name} / Sem \${c.academicSem.number}\` 
                      : 'Legacy (No context)'}
                  </td>
                  <td>{c._count?.students || 0}</td>
                  <td><span className={\`badge \${c.isActive ? 'badge-green' : 'badge-red'}\`}>{c.isActive ? 'Active' : 'Archived'}</span></td>
                  <td>
                    <button className="btn-icon" onClick={() => openEdit(c)}><Edit size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Class' : 'New Class'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="form-stack p-6">
              <div>
                <label className="field-label">Class/Division Name</label>
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. Div A" />
              </div>
              
              <div>
                <label className="field-label">Semester Context</label>
                <select className="input" value={form.semesterId} onChange={e => setForm({...form, semesterId: e.target.value})} required>
                  <option value="">Select Semester Context...</option>
                  {hierarchy.map(y => (
                    <optgroup key={y.id} label={y.name}>
                      {y.semesters.map(s => (
                        <option key={s.id} value={s.id}>{s.program.name} - Sem {s.number}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {editing && (
                <div>
                  <label className="field-label" style={{display:'flex', alignItems:'center', gap:8}}>
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
                    Active Status
                  </label>
                </div>
              )}

              <div style={{display:'flex', gap:12, marginTop: 12}}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Class</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
`;
fs.writeFileSync('frontend/src/pages/ClassesPage.jsx', content);
console.log('ClassesPage rewritten');
