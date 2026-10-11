const fs = require('fs');
const code = `import { useState, useEffect } from 'react'
import { BookOpen, Plus, Trash2, Edit, ChevronDown, ChevronRight, GraduationCap, Folder, Library } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import LoadingSpinner from '../components/LoadingSpinner'

export default function AcademicSetupPage() {
  const [hierarchy, setHierarchy] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal states
  const [classModal, setClassModal] = useState({ show: false, edit: null, semesterId: '' })
  const [subjectModal, setSubjectModal] = useState({ show: false, edit: null, classId: '', semesterId: '' })
  
  const [expandedYears, setExpandedYears] = useState({})
  const [expandedSems, setExpandedSems] = useState({})

  const load = async () => {
    try {
      const res = await api.get('/academic/hierarchy')
      setHierarchy(res.data)
      
      // Auto-expand first year and its semesters
      if (res.data.length > 0) {
        const firstYear = res.data[0]
        setExpandedYears(prev => ({ ...prev, [firstYear.id]: true }))
        firstYear.semesters.forEach(s => {
          setExpandedSems(prev => ({ ...prev, [s.id]: true }))
        })
      }
    } catch(e) { toast.error('Failed to load academic structure') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Class Actions
  const saveClass = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const payload = { name: fd.get('name'), semesterId: classModal.semesterId, isActive: true }
    try {
      if (classModal.edit) await api.patch('/academic/classes/' + classModal.edit.id, payload)
      else await api.post('/academic/classes', payload)
      toast.success('Division saved')
      setClassModal({ show: false })
      load()
    } catch(err) { toast.error('Save failed') }
  }

  const deleteClass = async (id, name) => {
    if(!confirm(\`Delete Division: \${name}?\\nThis will unlink students.\`)) return
    try {
      await api.delete('/academic/classes/' + id)
      toast.success('Division deleted')
      load()
    } catch(err) { toast.error('Failed to delete') }
  }

  // Subject Actions
  const saveSubject = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const payload = { 
      name: fd.get('name'), 
      code: fd.get('code'),
      semesterId: subjectModal.semesterId,
      classIds: [subjectModal.classId],
      isActive: true 
    }
    try {
      if (subjectModal.edit) await api.patch('/academic/subjects/' + subjectModal.edit.id, payload)
      else await api.post('/academic/subjects', payload)
      toast.success('Subject saved')
      setSubjectModal({ show: false })
      load()
    } catch(err) { toast.error('Save failed') }
  }

  const deleteSubject = async (id, name) => {
    if(!confirm(\`Delete Subject: \${name}?\`)) return
    try {
      await api.delete('/academic/subjects/' + id)
      toast.success('Subject deleted')
      load()
    } catch(err) { toast.error('Failed to delete') }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="page-container" style={{ paddingBottom: 60 }}>
      <div className="page-header">
        <h1 className="page-title">Academic Organization</h1>
        <p className="page-desc">Manage your institution's hierarchy: Years, Programs, Divisions, and Subjects.</p>
      </div>

      {hierarchy.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', borderRadius: '12px' }}>
          <p style={{ color: 'var(--muted)' }}>No academic data configured. Please set up Years and Programs first.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {hierarchy.map(year => (
            <div key={year.id} className="table-card" style={{ border: '1px solid var(--primary)', overflow: 'hidden' }}>
              
              {/* Year Header */}
              <div 
                style={{ background: 'var(--surface2)', padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: expandedYears[year.id] ? '1px solid var(--border)' : 'none' }}
                onClick={() => setExpandedYears(p => ({...p, [year.id]: !p[year.id]}))}
              >
                {expandedYears[year.id] ? <ChevronDown size={20} color="var(--primary)" /> : <ChevronRight size={20} color="var(--primary)" />}
                <GraduationCap size={24} color="var(--primary)" />
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Academic Year {year.name}</h2>
              </div>

              {expandedYears[year.id] && (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {year.semesters.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 14 }}>No programs/semesters configured for this year.</p>}
                  
                  {year.semesters.map(sem => (
                    <div key={sem.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)' }}>
                      
                      {/* Semester Header */}
                      <div 
                        style={{ background: 'var(--surface2)', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                        onClick={() => setExpandedSems(p => ({...p, [sem.id]: !p[sem.id]}))}
                      >
                        {expandedSems[sem.id] ? <ChevronDown size={18} color="var(--muted)" /> : <ChevronRight size={18} color="var(--muted)" />}
                        <Folder size={18} color="var(--muted)" />
                        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--text)', flex: 1 }}>
                          {sem.program.name} - Semester {sem.number}
                        </h3>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={(e) => { e.stopPropagation(); setClassModal({ show: true, edit: null, semesterId: sem.id }) }}
                        >
                          <Plus size={14} /> Add Division
                        </button>
                      </div>

                      {/* Classes / Divisions */}
                      {expandedSems[sem.id] && (
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {sem.classes.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No divisions created yet.</p>}
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                            {sem.classes.map(cls => (
                              <div key={cls.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                {/* Class Header */}
                                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-info)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Library size={16} color="var(--info)" />
                                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>Div {cls.name}</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button className="btn-icon" onClick={() => setClassModal({ show: true, edit: cls, semesterId: sem.id })}><Edit size={14} /></button>
                                    <button className="btn-icon" onClick={() => deleteClass(cls.id, cls.name)}><Trash2 size={14} /></button>
                                  </div>
                                </div>
                                
                                {/* Subjects List */}
                                <div style={{ padding: '12px', background: 'var(--bg)' }}>
                                  {cls.subjects.length === 0 ? (
                                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px 0' }}>No subjects assigned.</p>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                      {cls.subjects.map(sub => (
                                        <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                          <div>
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{sub.name}</p>
                                            <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>{sub.code}</p>
                                          </div>
                                          <div style={{ display: 'flex' }}>
                                            <button className="btn-icon" onClick={() => setSubjectModal({ show: true, edit: sub, classId: cls.id, semesterId: sem.id })}><Edit size={12} /></button>
                                            <button className="btn-icon" onClick={() => deleteSubject(sub.id, sub.name)}><Trash2 size={12} /></button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <button 
                                    className="btn btn-secondary" 
                                    style={{ width: '100%', fontSize: '12px', padding: '6px' }}
                                    onClick={() => setSubjectModal({ show: true, edit: null, classId: cls.id, semesterId: sem.id })}
                                  >
                                    <Plus size={14} /> Add Subject
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Class/Division Modal */}
      {classModal.show && (
        <div className="modal-overlay" onClick={() => setClassModal({show: false})}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{classModal.edit ? 'Edit Division' : 'Add New Division'}</h2>
            </div>
            <form onSubmit={saveClass} className="form-stack p-6">
              <div>
                <label className="field-label">Division Name</label>
                <input name="name" className="input" defaultValue={classModal.edit?.name || ''} required placeholder="e.g. A, B, C" />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary">Save Division</button>
                <button type="button" className="btn btn-secondary" onClick={() => setClassModal({show: false})}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {subjectModal.show && (
        <div className="modal-overlay" onClick={() => setSubjectModal({show: false})}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{subjectModal.edit ? 'Edit Subject' : 'Add New Subject'}</h2>
            </div>
            <form onSubmit={saveSubject} className="form-stack p-6">
              <div>
                <label className="field-label">Subject Name</label>
                <input name="name" className="input" defaultValue={subjectModal.edit?.name || ''} required placeholder="e.g. Database Systems" />
              </div>
              <div>
                <label className="field-label">Subject Code</label>
                <input name="code" className="input" defaultValue={subjectModal.edit?.code || ''} required placeholder="e.g. CS302" />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary">Save Subject</button>
                <button type="button" className="btn btn-secondary" onClick={() => setSubjectModal({show: false})}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
`

fs.writeFileSync('frontend/src/pages/ClassesPage.jsx', code);
console.log('Created unified AcademicOrganizationPage via ClassesPage.jsx.');
