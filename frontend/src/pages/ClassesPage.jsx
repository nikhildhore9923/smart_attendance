import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Plus, Trash2, Edit, ChevronDown, ChevronRight, GraduationCap, Folder, Library, Users, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { useConfirm } from '../context/ConfirmContext'

export default function AcademicSetupPage() {
  const navigate = useNavigate()
  const { confirm } = useConfirm()
  const [hierarchy, setHierarchy] = useState([])
  const [stats, setStats] = useState({})
  const [facultyList, setFacultyList] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal states
  const [classModal, setClassModal] = useState({ show: false, edit: null, semesterId: '' })
  const [subjectModal, setSubjectModal] = useState({ show: false, edit: null, classId: '', semesterId: '', facultyIds: [] })
  const [yearModal, setYearModal] = useState({ show: false })
  const [programModal, setProgramModal] = useState({ show: false })
  const [semModal, setSemModal] = useState({ show: false, yearId: '' })
  
  const [programs, setPrograms] = useState([])
  const [expandedYears, setExpandedYears] = useState({})
  const [expandedSems, setExpandedSems] = useState({})

  const load = async () => {
    try {
      const [res, progRes, statsRes, facRes] = await Promise.all([
        api.get('/academic/hierarchy'),
        api.get('/academic/programs'),
        api.get('/academic/hierarchy/stats'),
        api.get('/faculty').catch(() => ({ data: [] }))
      ])
      
      setHierarchy(res.data)
      setPrograms(progRes.data)
      setStats(statsRes.data)
      setFacultyList(facRes.data || [])
      
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

  // Root Actions
  const saveYear = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    try {
      await api.post('/academic/years', { name: fd.get('name'), startDate: fd.get('startDate'), endDate: fd.get('endDate') })
      toast.success('Academic Year Created')
      setYearModal({ show: false })
      load()
    } catch(err) { toast.error('Failed to create year') }
  }

  const saveProgram = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const name = fd.get('name')?.trim()
    if (!name) return
    try {
      await api.post('/academic/programs', { name })
      toast.success('Program Created')
      e.target.reset()
      load()
    } catch(err) { toast.error(err.response?.data?.error || 'Failed to create program') }
  }

  const deleteYear = async (id, name) => {
    const ok = await confirm({
      title: 'Delete Academic Year?',
      message: `Permanently delete ${name}? This will remove associated semesters, divisions, and curriculum subjects.`,
      confirmText: 'Delete Year',
      type: 'danger'
    })
    if (!ok) return
    try {
      await api.delete('/academic/years/' + id)
      toast.success('Academic Year deleted')
      load()
    } catch(err) {
      toast.error(err.response?.data?.error || 'Failed to delete academic year')
    }
  }

  const deleteProgram = async (id, name) => {
    const ok = await confirm({
      title: 'Delete Degree Program?',
      message: `Permanently delete program "${name}" and all its linked academic semesters?`,
      confirmText: 'Delete Program',
      type: 'danger'
    })
    if (!ok) return
    try {
      await api.delete('/academic/programs/' + id)
      toast.success('Program deleted')
      load()
    } catch(err) {
      toast.error(err.response?.data?.error || 'Failed to delete program')
    }
  }

  const deleteSemester = async (id, name) => {
    const ok = await confirm({
      title: 'Delete Semester?',
      message: `Permanently remove semester "${name}" and all its divisions & subjects?`,
      confirmText: 'Delete Semester',
      type: 'danger'
    })
    if (!ok) return
    try {
      await api.delete('/academic/semesters/' + id)
      toast.success('Semester deleted')
      load()
    } catch(err) {
      toast.error(err.response?.data?.error || 'Failed to delete semester')
    }
  }

  const saveSem = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    try {
      await api.post('/academic/semesters', { number: fd.get('number'), academicYearId: semModal.yearId, programId: fd.get('programId') })
      toast.success('Semester Created')
      setSemModal({ show: false })
      load()
    } catch(err) { toast.error('Failed to create semester') }
  }

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
    const ok = await confirm({
      title: 'Delete Division?',
      message: `Delete division "${name}"? Enrolled students will be unlinked from this division.`,
      confirmText: 'Delete Division',
      type: 'danger'
    })
    if (!ok) return
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
      facultyIds: subjectModal.facultyIds || [],
      isActive: true 
    }
    try {
      if (subjectModal.edit) await api.patch('/academic/subjects/' + subjectModal.edit.id, payload)
      else await api.post('/academic/subjects', payload)
      toast.success('Subject saved')
      setSubjectModal({ show: false, edit: null, classId: '', semesterId: '', facultyIds: [] })
      load()
    } catch(err) { toast.error('Save failed') }
  }

  const deleteSubject = async (id, name) => {
    const ok = await confirm({
      title: 'Delete Subject?',
      message: `Are you sure you want to delete subject "${name}"?`,
      confirmText: 'Delete Subject',
      type: 'danger'
    })
    if (!ok) return
    try {
      await api.delete('/academic/subjects/' + id)
      toast.success('Subject deleted')
      load()
    } catch(err) { toast.error('Failed to delete') }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="page-container" style={{ paddingBottom: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Academic Organization</h1>
          <p className="page-desc" style={{ marginBottom: 0 }}>Manage your institution's hierarchy: Years, Programs, Divisions, and Subjects.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/faculty')}><Users size={16} /> Faculty & Allocations</button>
          <button className="btn btn-secondary" onClick={() => setProgramModal({show:true})}><Folder size={16} /> Programs</button>
          <button className="btn btn-primary" onClick={() => setYearModal({show:true})}><Plus size={16} /> Academic Year</button>
        </div>
      </div>

      {hierarchy.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', borderRadius: '12px' }}>
          <p style={{ color: 'var(--muted)' }}>No academic data configured. Please set up Years and Programs first.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {hierarchy.map(year => (
            <div key={year.id} className="table-card" style={{ border: '1px solid var(--primary)', overflow: 'hidden' }}>
              
              <div 
                style={{ background: 'var(--surface2)', padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: expandedYears[year.id] ? '1px solid var(--border)' : 'none' }}
                onClick={() => setExpandedYears(p => ({...p, [year.id]: !p[year.id]}))}
              >
                {expandedYears[year.id] ? <ChevronDown size={20} color="var(--primary)" /> : <ChevronRight size={20} color="var(--primary)" />}
                <GraduationCap size={24} color="var(--primary)" />
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text)', flex: 1 }}>Academic Year {year.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={(e) => { e.stopPropagation(); setSemModal({ show: true, yearId: year.id }) }}>
                    <Plus size={14} /> Add Semester
                  </button>
                  <button 
                    className="btn-icon" 
                    style={{ color: 'var(--danger)', padding: '6px' }}
                    title={`Delete Academic Year ${year.name}`}
                    onClick={(e) => { e.stopPropagation(); deleteYear(year.id, year.name); }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedYears[year.id] && (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {year.semesters.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 14 }}>No programs/semesters configured for this year.</p>}
                  
                  {[...(year.semesters || [])]
                    .sort((a, b) => {
                      if (a.number !== b.number) return a.number - b.number;
                      return (a.program?.name || '').localeCompare(b.program?.name || '');
                    })
                    .map(sem => (
                    <div key={sem.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)' }}>
                      
                      <div 
                        style={{ background: 'var(--surface2)', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                        onClick={() => setExpandedSems(p => ({...p, [sem.id]: !p[sem.id]}))}
                      >
                        {expandedSems[sem.id] ? <ChevronDown size={18} color="var(--muted)" /> : <ChevronRight size={18} color="var(--muted)" />}
                        <Folder size={18} color="var(--muted)" />
                        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--text)', flex: 1 }}>
                          {sem.program?.name || 'Program'} - Semester {sem.number}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={(e) => { e.stopPropagation(); setClassModal({ show: true, edit: null, semesterId: sem.id }) }}
                          >
                            <Plus size={14} /> Add Division
                          </button>
                          <button 
                            className="btn-icon" 
                            style={{ color: 'var(--danger)', padding: '6px' }}
                            title={`Delete Semester ${sem.number}`}
                            onClick={(e) => { e.stopPropagation(); deleteSemester(sem.id, `${sem.program?.name || 'Program'} - Semester ${sem.number}`); }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {expandedSems[sem.id] && (
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {sem.classes.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No divisions created yet.</p>}
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                            {[...(sem.classes || [])]
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map(cls => (
                              <div key={cls.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                
                                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-info)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Library size={16} color="var(--info)" />
                                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>Div {cls.name}</span>
                                    {stats[cls.id] && stats[cls.id].overall.total > 0 && (
                                      <span className="badge badge-blue" style={{ marginLeft: 8 }}>
                                        {Math.round((stats[cls.id].overall.present / stats[cls.id].overall.total) * 100)}% Avg Attendance
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button className="btn-icon" onClick={() => setClassModal({ show: true, edit: cls, semesterId: sem.id })}><Edit size={14} /></button>
                                    <button className="btn-icon" onClick={() => deleteClass(cls.id, cls.name)}><Trash2 size={14} /></button>
                                  </div>
                                </div>
                                
                                <div style={{ padding: '12px', background: 'var(--bg)' }}>
                                  {cls.subjects.length === 0 ? (
                                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px 0' }}>No subjects assigned.</p>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                       {cls.subjects.map(sub => (
                                        <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                          <div>
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{sub.name}</p>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                              <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>{sub.code}</p>
                                              {sub.faculties && sub.faculties.length > 0 ? (
                                                <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
                                                  • {sub.faculties.map(f => `${f.user?.firstName || ''} ${f.user?.lastName || ''}`).join(', ')}
                                                </span>
                                              ) : (
                                                <span style={{ fontSize: 11, color: 'var(--warning)' }}>
                                                  • Unallocated
                                                </span>
                                              )}
                                              {stats[cls.id] && stats[cls.id][sub.id] && stats[cls.id][sub.id].total > 0 && (
                                                <span style={{ fontSize: 11, fontWeight: 600, color: (stats[cls.id][sub.id].present / stats[cls.id][sub.id].total) > 0.75 ? 'var(--success)' : 'var(--danger)' }}>
                                                  • {Math.round((stats[cls.id][sub.id].present / stats[cls.id][sub.id].total) * 100)}% Attendance
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div style={{ display: 'flex' }}>
                                            <button className="btn-icon" onClick={() => setSubjectModal({ show: true, edit: sub, classId: cls.id, semesterId: sem.id, facultyIds: sub.faculties?.map(f => f.id) || [] })}><Edit size={12} /></button>
                                            <button className="btn-icon" onClick={() => deleteSubject(sub.id, sub.name)}><Trash2 size={12} /></button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <button className="btn btn-secondary" style={{ width: '100%', fontSize: '12px', padding: '6px' }} onClick={() => setSubjectModal({ show: true, edit: null, classId: cls.id, semesterId: sem.id, facultyIds: [] })}>
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

      {yearModal.show && (
        <div className="modal-overlay" onClick={() => setYearModal({show: false})}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Add Academic Year</h2></div>
            <form onSubmit={saveYear} className="form-stack p-6">
              <div><label className="field-label">Year Name</label><input name="name" className="input" required placeholder="e.g. 2026-2027" /></div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
                <div><label className="field-label">Start Date</label><input type="date" name="startDate" className="input" required /></div>
                <div><label className="field-label">End Date</label><input type="date" name="endDate" className="input" required /></div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}><button type="submit" className="btn btn-primary">Save Year</button><button type="button" className="btn btn-secondary" onClick={() => setYearModal({show: false})}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {programModal.show && (
        <div className="modal-overlay" onClick={() => setProgramModal({show: false})}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Manage Academic Programs</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Existing Programs</h4>
                {programs.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--muted)' }}>No programs created yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                    {programs.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>{p.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{p._count?.semesters || 0} Semester(s) configured</div>
                        </div>
                        <button 
                          className="btn-icon" 
                          style={{ color: 'var(--danger)', padding: '6px' }}
                          title={`Delete Program ${p.name}`}
                          onClick={() => deleteProgram(p.id, p.name)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add New Program</h4>
                <form onSubmit={saveProgram} style={{ display: 'flex', gap: '10px' }}>
                  <input name="name" className="input" required placeholder="e.g. B.Tech Computer Science" style={{ flex: 1 }} />
                  <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                    <Plus size={15} /> Add Program
                  </button>
                </form>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setProgramModal({show: false})}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {semModal.show && (
        <div className="modal-overlay" onClick={() => setSemModal({show: false})}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Add Semester to Year</h2></div>
            <form onSubmit={saveSem} className="form-stack p-6">
              <div>
                <label className="field-label">Program</label>
                <select name="programId" className="input" required>
                  <option value="">Select a program...</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className="field-label">Semester Number</label><input type="number" name="number" className="input" required placeholder="e.g. 1" min="1" max="10" /></div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}><button type="submit" className="btn btn-primary">Save Semester</button><button type="button" className="btn btn-secondary" onClick={() => setSemModal({show: false})}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}

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
              <div>
                <label className="field-label">Assigned Faculty Instructor</label>
                <select 
                  className="input"
                  value={subjectModal.facultyIds?.[0] || ''}
                  onChange={e => setSubjectModal({ ...subjectModal, facultyIds: e.target.value ? [e.target.value] : [] })}
                >
                  <option value="">-- No Faculty Assigned (Unallocated) --</option>
                  {facultyList.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.user?.firstName} {f.user?.lastName} ({f.department || 'General'})
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px', marginBottom: 0 }}>
                  You can also allocate multiple courses per faculty under the <strong>Faculty & Allocations</strong> tab.
                </p>
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
