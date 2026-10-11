const fs = require('fs');
const content = `
import { useState, useEffect } from 'react'
import { Book, Plus, Edit } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([])
  const [hierarchy, setHierarchy] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  
  const [form, setForm] = useState({ name: '', code: '', semesterId: '', classIds: [], isActive: true })

  const load = async () => {
    try {
      const [sRes, hRes] = await Promise.all([
        api.get('/academic/subjects'),
        api.get('/academic/hierarchy')
      ])
      setSubjects(sRes.data)
      setHierarchy(hRes.data)
    } catch(e) { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) await api.patch('/academic/subjects/' + editing.id, form)
      else await api.post('/academic/subjects', form)
      toast.success('Saved successfully')
      setShowModal(false)
      load()
    } catch(e) { toast.error('Save failed') }
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({ name: s.name, code: s.code, semesterId: s.semesterId || '', classIds: s.classes.map(c => c.id), isActive: s.isActive })
    setShowModal(true)
  }

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', code: '', semesterId: '', classIds: [], isActive: true })
    setShowModal(true)
  }
  
  const selectedSemester = form.semesterId 
    ? hierarchy.flatMap(y => y.semesters).find(s => s.id === form.semesterId)
    : null;

  if (loading) return <LoadingSpinner />

  return (
    <div className="page-container">
      <PageHeader title="Subjects" icon={Book} action={{label: 'New Subject', onClick: openNew, icon: Plus}} />
      
      {subjects.length === 0 ? (
        <EmptyState icon={Book} title="No subjects found" desc="Create a subject to get started" />
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Subject Name</th>
                <th>Semester Context</th>
                <th>Assigned Classes</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map(s => (
                <tr key={s.id}>
                  <td className="font-mono text-sm">{s.code}</td>
                  <td className="font-medium">{s.name}</td>
                  <td>
                    {s.academicSem 
                      ? \`\${s.academicSem.academicYear.name} / \${s.academicSem.program.name} / Sem \${s.academicSem.number}\` 
                      : 'Legacy'}
                  </td>
                  <td>{s.classes?.map(c => c.name).join(', ') || 'None'}</td>
                  <td><span className={\`badge \${s.isActive ? 'badge-green' : 'badge-red'}\`}>{s.isActive ? 'Active' : 'Archived'}</span></td>
                  <td>
                    <button className="btn-icon" onClick={() => openEdit(s)}><Edit size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: 600}}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Subject' : 'New Subject'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="form-stack p-6">
              <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:12}}>
                <div>
                  <label className="field-label">Subject Code</label>
                  <input className="input" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required placeholder="e.g. CS401" />
                </div>
                <div>
                  <label className="field-label">Subject Name</label>
                  <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. Database Systems" />
                </div>
              </div>
              
              <div>
                <label className="field-label">Semester Context</label>
                <select className="input" value={form.semesterId} onChange={e => setForm({...form, semesterId: e.target.value, classIds: []})} required>
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
              
              {selectedSemester && selectedSemester.classes && (
                <div>
                  <label className="field-label">Assign to Classes in this Semester</label>
                  <div style={{display:'flex', gap:10, flexWrap:'wrap', marginTop:8}}>
                    {selectedSemester.classes.map(c => (
                      <label key={c.id} style={{display:'flex', alignItems:'center', gap:6, background:'var(--surface2)', padding:'6px 12px', borderRadius:20, border:'1px solid var(--border)'}}>
                        <input type="checkbox" checked={form.classIds.includes(c.id)} onChange={(e) => {
                          const ids = e.target.checked ? [...form.classIds, c.id] : form.classIds.filter(id => id !== c.id);
                          setForm({...form, classIds: ids});
                        }} />
                        <span style={{fontSize:13}}>{c.name}</span>
                      </label>
                    ))}
                    {selectedSemester.classes.length === 0 && <span className="text-muted" style={{fontSize:13}}>No classes available in this semester.</span>}
                  </div>
                </div>
              )}

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
                <button type="submit" className="btn btn-primary">Save Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
`;
fs.writeFileSync('frontend/src/pages/SubjectsPage.jsx', content);
console.log('SubjectsPage rewritten');
