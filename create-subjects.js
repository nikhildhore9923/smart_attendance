const fs = require('fs');
const subjectsPage = `
import { useState, useEffect } from 'react'
import { Book, Plus, Trash2, Edit } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  
  const [form, setForm] = useState({ name: '', code: '', classId: '', isActive: true })

  const load = async () => {
    try {
      const [subRes, clsRes] = await Promise.all([
        api.get('/academic/subjects'),
        api.get('/academic/classes')
      ])
      setSubjects(subRes.data)
      setClasses(clsRes.data)
    } catch(e) { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) await api.put(\`/academic/subjects/\${editing.id}\`, form)
      else await api.post('/academic/subjects', form)
      toast.success(editing ? 'Updated' : 'Created')
      setShowModal(false)
      load()
    } catch(e) { toast.error(e.response?.data?.error || 'Failed to save') }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(\`Deactivate subject \${name}?\`)) return
    try {
      await api.delete(\`/academic/subjects/\${id}\`)
      toast.success('Deactivated')
      load()
    } catch(e) { toast.error('Failed') }
  }

  const openNew = () => { setEditing(null); setForm({ name: '', code: '', classId: classes[0]?.id || '', isActive: true }); setShowModal(true); }
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, code: s.code, classId: s.classId, isActive: s.isActive }); setShowModal(true); }

  const filtered = subjects.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)' }}>Subjects</h1>
        <button className="btn btn-primary" onClick={openNew} disabled={classes.length===0}><Plus size={16}/> New Subject</button>
      </div>

      <input className="input" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
              <th style={{ padding: '12px' }}>Code</th>
              <th style={{ padding: '12px' }}>Name</th>
              <th style={{ padding: '12px' }}>Class</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{s.code}</td>
                <td style={{ padding: '12px' }}>{s.name}</td>
                <td style={{ padding: '12px' }}>{s.class?.name} (Sem {s.class?.semester})</td>
                <td style={{ padding: '12px' }}>{s.isActive ? <span className="badge badge-green">Active</span> : <span className="badge badge-gray">Inactive</span>}</td>
                <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                  <button className="btn-icon" onClick={()=>openEdit(s)}><Edit size={16}/></button>
                  {s.isActive && <button className="btn-icon" onClick={()=>handleDelete(s.id, s.name)}><Trash2 size={16}/></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 100 }}>
          <div className="card" style={{ width: '400px', padding: '24px' }}>
            <h2>{editing ? 'Edit Subject' : 'New Subject'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <input required className="input" placeholder="Subject Code (e.g. CS101)" value={form.code} onChange={e=>setForm({...form, code: e.target.value})} />
              <input required className="input" placeholder="Subject Name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
              <select required className="input" value={form.classId} onChange={e=>setForm({...form, classId: e.target.value})}>
                <option value="" disabled>Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} (Sem {c.semester})</option>)}
              </select>
              {editing && (
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="checkbox" checked={form.isActive} onChange={e=>setForm({...form, isActive: e.target.checked})} />
                  Active
                </label>
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
`;
fs.writeFileSync('frontend/src/pages/SubjectsPage.jsx', subjectsPage);
console.log('SubjectsPage created');
