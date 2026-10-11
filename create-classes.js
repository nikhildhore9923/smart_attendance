const fs = require('fs');

const classesPage = `
import { useState, useEffect } from 'react'
import { BookOpen, Plus, Trash2, Edit } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'

export default function ClassesPage() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  
  const [form, setForm] = useState({ name: '', semester: 1, isActive: true })

  const load = async () => {
    try {
      const res = await api.get('/academic/classes')
      setClasses(res.data)
    } catch(e) { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) await api.put(\`/academic/classes/\${editing.id}\`, form)
      else await api.post('/academic/classes', form)
      toast.success(editing ? 'Updated' : 'Created')
      setShowModal(false)
      load()
    } catch(e) { toast.error('Failed to save') }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(\`Deactivate class \${name}?\nStudents will remain in the database but the class will be inactive.\`)) return
    try {
      await api.delete(\`/academic/classes/\${id}\`)
      toast.success('Deactivated')
      load()
    } catch(e) { toast.error('Failed') }
  }

  const openNew = () => { setEditing(null); setForm({ name: '', semester: 1, isActive: true }); setShowModal(true); }
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, semester: c.semester, isActive: c.isActive }); setShowModal(true); }

  const filtered = classes.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)' }}>Classes</h1>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16}/> New Class</button>
      </div>

      <input className="input" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
              <th style={{ padding: '12px' }}>Name</th>
              <th style={{ padding: '12px' }}>Semester</th>
              <th style={{ padding: '12px' }}>Students</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.name}</td>
                <td style={{ padding: '12px' }}>{c.semester}</td>
                <td style={{ padding: '12px' }}>{c._count?.students || 0}</td>
                <td style={{ padding: '12px' }}>{c.isActive ? <span className="badge badge-green">Active</span> : <span className="badge badge-gray">Inactive</span>}</td>
                <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                  <button className="btn-icon" onClick={()=>openEdit(c)}><Edit size={16}/></button>
                  {c.isActive && <button className="btn-icon" onClick={()=>handleDelete(c.id, c.name)}><Trash2 size={16}/></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 100 }}>
          <div className="card" style={{ width: '400px', padding: '24px' }}>
            <h2>{editing ? 'Edit Class' : 'New Class'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <input required className="input" placeholder="Class Name (e.g. FY AI)" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
              <input required type="number" min="1" className="input" placeholder="Semester" value={form.semester} onChange={e=>setForm({...form, semester: e.target.value})} />
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
fs.writeFileSync('frontend/src/pages/ClassesPage.jsx', classesPage);
console.log('ClassesPage created');
