const fs = require('fs');

const code = `import { useEffect, useState } from 'react'
import { Users, Trash2, RotateCcw, Search, UserPlus, FileX, Info, Edit, X } from 'lucide-react'
import api, { getStudents, deleteStudent, deleteStudentRecords, activateStudent } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const COLORS = ['var(--primary)','var(--success)','var(--warning)','var(--danger)','var(--info)','var(--muted2)']

export default function StudentsPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [students, setStudents] = useState([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(null)
  const [classes,  setClasses]  = useState([])

  const load = async () => {
    setLoading(true)
    try { 
      const r = await getStudents(); 
      setStudents(r.data) 
    }
    catch (err) { toast.error('Failed to load students') }
    finally { setLoading(false) }
  }

  useEffect(() => { 
    load(); 
    api.get('/academic/classes').then(res => setClasses(res.data)).catch(console.error); 
  }, [])

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.put(\`/students/\${editing.roll_no}\`, editing)
      toast.success('Updated student')
      setEditing(null)
      load()
    } catch(err) {
      toast.error('Failed to update student')
    }
  }

  const handleDelete = async (roll_no, name) => {
    if (!confirm(\`Remove \${name} from the system?\\n\\nThis will:\\n- Delete their face images\\n- Delete ALL their attendance records\\n\\nThis cannot be undone.\`)) return
    try { await deleteStudent(roll_no, true); toast.success(\`\${name} removed\`); load() }
    catch (err) { toast.error('Failed to remove') }
  }

  const handleClearRecords = async (roll_no, name) => {
    if (!confirm(\`Clear ALL attendance records for \${name}?\\nThis cannot be undone.\`)) return
    try { await deleteStudentRecords(roll_no); toast.success(\`Records cleared for \${name}\`); load() }
    catch (err) { toast.error('Failed to clear records') }
  }

  const handleActivate = async (roll_no, name) => {
    try { await activateStudent(roll_no); toast.success(\`\${name} re-activated\`); load() }
    catch (err) { toast.error('Failed to activate') }
  }

  const filtered = students.filter(s =>
    (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.roll_no || '').includes(search)
  )

  return (
    <div className="page-container">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-desc">{students.length} enrolled student{students.length!==1?'s':''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/enroll?mode=create')}>
          <UserPlus size={16}/> Enroll New Student
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { l:'Total Enrolled', v:students.length,                              c:'var(--primary)' },
          { l:'Active',         v:students.filter(s=>s.is_active).length,      c:'var(--success)' },
          { l:'Fully Enrolled', v:students.filter(s=>s.photo_count>=8).length, c:'var(--info)' },
          { l:'Needs Photos',   v:students.filter(s=>s.photo_count<8).length,  c:'var(--warning)' },
        ].map(({ l, v, c }) => (
          <div key={l} className="table-card" style={{ padding:'20px', borderLeft:\`4px solid \${c}\` }}>
            <p style={{ fontSize:28, fontWeight:700, color: 'var(--text)', margin: 0 }}>{v}</p>
            <p className="field-label" style={{ marginTop:4 }}>{l}</p>
          </div>
        ))}
      </div>

      <div style={{ position:'relative' }}>
        <Search size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }} />
        <input className="input" style={{ paddingLeft:40 }} placeholder="Search by name or roll number..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="table-card" style={{ overflow:'hidden' }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60 }}>
            <div className="spinner" style={{ width:28, height:28, border:'3px solid var(--border)', borderTopColor:'var(--primary)', borderRadius:'50%' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <Users size={48} color="var(--border)" style={{ margin:'0 auto 16px', display:'block' }} />
            <p style={{ fontSize:15, color:'var(--muted)', fontWeight:500 }}>{search ? 'No students match your search' : 'No students enrolled yet'}</p>
            {!search && <button className="btn btn-primary" style={{ marginTop:16 }} onClick={()=>navigate('/enroll?mode=create')}>Enroll First Student</button>}
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Roll No</th>
                  <th>Photos</th>
                  <th>Enrolled On</th>
                  <th>Status</th>
                  {user?.is_admin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.roll_no}>
                    <td>{i+1}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:36, height:36, borderRadius:8, background:\`\${COLORS[i%COLORS.length]}20\`, border:\`1px solid \${COLORS[i%COLORS.length]}40\`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:600, color:COLORS[i%COLORS.length], flexShrink:0 }}>
                          {s.name[0]}
                        </div>
                        <div>
                          <p style={{ fontWeight:600, fontSize:14, color: 'var(--text)' }}>{s.name}</p>
                          <p style={{ fontSize:12, color:'var(--muted)' }}>Roll {s.roll_no}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-blue">{s.roll_no}</span></td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:60, height:6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width:\`\${Math.min(100,(s.photo_count/8)*100)}%\`, background: 'var(--primary)' }} />
                        </div>
                        <span style={{ fontSize:13, color:'var(--muted)', fontWeight: 500 }}>{s.photo_count}/8</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text2)', fontSize: 14 }}>{s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString('en-IN') : '-'}</span>
                    </td>
                    <td>
                      {s.is_active
                        ? <span className="badge badge-green">Active</span>
                        : <span className="badge badge-red">Inactive</span>}
                    </td>
                    {user?.is_admin && (
                      <td>
                        <div style={{ display:'flex', gap:8 }}>
                          {s.is_active ? (
                            <>
                              <button className="btn-icon" title="Edit student" onClick={() => setEditing({ roll_no: s.roll_no, firstName: s.firstName || s.name.split(' ')[0], lastName: s.lastName || s.name.split(' ')[1] || '', classId: s.classId || '' })}>
                                <Edit size={16} />
                              </button>
                              <button className="btn-icon" title="Clear attendance records" onClick={() => handleClearRecords(s.roll_no, s.name)}>
                                <FileX size={16} />
                              </button>
                              <button className="btn-icon" title="Remove student" onClick={() => handleDelete(s.roll_no, s.name)}>
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <button className="btn-icon" title="Re-activate" onClick={() => handleActivate(s.roll_no, s.name)}>
                              <RotateCcw size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Edit Modal */}
      {editing && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Student</h2>
              <button className="btn-icon" onClick={() => setEditing(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ padding: '24px' }} className="form-stack">
              <div>
                <label className="field-label">First Name</label>
                <input className="input" required value={editing.firstName} onChange={e => setEditing({...editing, firstName: e.target.value})} />
              </div>
              <div>
                <label className="field-label">Last Name</label>
                <input className="input" required value={editing.lastName} onChange={e => setEditing({...editing, lastName: e.target.value})} />
              </div>
              <div>
                <label className="field-label">Class</label>
                <select className="input" value={editing.classId} onChange={e => setEditing({...editing, classId: e.target.value})}>
                  <option value="">No Class Assigned</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary">Save Changes</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
`

fs.writeFileSync('frontend/src/pages/StudentsPage.jsx', code);
console.log('Fixed StudentsPage.jsx syntax and runtime bugs.');
