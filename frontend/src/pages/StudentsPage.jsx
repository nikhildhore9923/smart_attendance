import { useEffect, useState } from 'react'
import { 
  Users, Trash2, RotateCcw, Search, UserPlus, FileX, Edit, X, 
  BarChart2, CheckCircle2, AlertTriangle, Filter, ArrowUpDown, ShieldAlert, Sparkles, BookOpen 
} from 'lucide-react'
import api, { getStudents, deleteStudent, deleteStudentRecords, activateStudent, getStudentReport } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSubject } from '../context/SubjectContext'
import { useConfirm } from '../context/ConfirmContext'
import toast from 'react-hot-toast'

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#06B6D4', '#EC4899', '#6366F1']

export default function StudentsPage() {
  const { user } = useAuth()
  const { subject, subjects } = useSubject()
  const { confirm } = useConfirm()
  const navigate  = useNavigate()
  const [students, setStudents] = useState([])
  const [classes,  setClasses]  = useState([])
  const [loading,  setLoading]  = useState(true)

  // Filters & Organization
  const [search,           setSearch]           = useState('')
  const [selectedDivision, setSelectedDivision] = useState('ALL')
  const [statusFilter,     setStatusFilter]     = useState('ALL')
  const [sortBy,           setSortBy]           = useState('ROLL_ASC')

  // Modals
  const [editing,                  setEditing]                  = useState(null)
  const [deleteTarget,             setDeleteTarget]             = useState(null)
  const [deleting,                 setDeleting]                 = useState(false)
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null)
  const [studentReportData,        setStudentReportData]        = useState(null)
  const [loadingReport,            setLoadingReport]            = useState(false)

  const activeSubjectObj = subjects.find(s => s.id === subject)

  const load = async () => {
    setLoading(true)
    try { 
      const params = {}
      if (subject) params.subjectId = subject
      const [studentsRes, classesRes] = await Promise.all([
        getStudents(params),
        api.get('/academic/classes').catch(() => ({ data: [] }))
      ])
      setStudents(studentsRes.data) 
      setClasses(classesRes.data)
    }
    catch (err) { toast.error('Failed to load students') }
    finally { setLoading(false) }
  }

  useEffect(() => { 
    load(); 
  }, [subject])

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/students/${editing.id || editing.roll_no}`, editing)
      toast.success('Updated student successfully')
      setEditing(null)
      load()
    } catch(err) {
      toast.error('Failed to update student: ' + (err.response?.data?.error || err.message))
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteStudent(deleteTarget.id || deleteTarget.roll_no, true)
      toast.success(`Student ${deleteTarget.name} removed permanently`)
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error('Failed to delete student: ' + (err.response?.data?.error || err.message))
    } finally {
      setDeleting(false)
    }
  }

  const handleClearRecords = async (s) => {
    const ok = await confirm({
      title: 'Clear Attendance Records?',
      message: `Clear all attendance records for ${s.name}? Their biometric status will be reset to pending.`,
      confirmText: 'Clear Records',
      type: 'danger'
    })
    if (!ok) return
    try { 
      await deleteStudentRecords(s.id || s.roll_no)
      toast.success(`Records cleared for ${s.name}`)
      load() 
    } catch (err) { 
      toast.error('Failed to clear records') 
    }
  }

  const handleActivate = async (s) => {
    try { 
      await activateStudent(s.id || s.roll_no)
      toast.success(`${s.name} re-activated`)
      load() 
    } catch (err) { 
      toast.error('Failed to activate') 
    }
  }

  const handleViewAttendance = async (s) => {
    setSelectedStudentForReport(s)
    setLoadingReport(true)
    try {
      const res = await getStudentReport(s.id || s.roll_no)
      setStudentReportData(res.data)
    } catch (err) {
      toast.error('Failed to load student attendance breakdown')
    } finally {
      setLoadingReport(false)
    }
  }

  // Filter & Sort Logic
  const filtered = students.filter(s => {
    // Division filter
    if (selectedDivision !== 'ALL') {
      const matchClass = (s.className === selectedDivision) || (s.classId === selectedDivision)
      if (!matchClass) return false
    }

    // Status filter
    if (statusFilter === 'ENROLLED' && !s.is_active) return false
    if (statusFilter === 'NOT_ENROLLED' && s.is_active) return false
    if (statusFilter === 'DEFAULTER' && (!s.attendanceStats?.isDefaulter || s.attendanceStats.totalSessions === 0)) return false

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = (s.name || '').toLowerCase().includes(q)
      const matchRoll = (s.roll_no || s.rollNumber || '').toLowerCase().includes(q)
      const matchEmail = (s.email || '').toLowerCase().includes(q)
      if (!matchName && !matchRoll && !matchEmail) return false
    }

    return true
  }).sort((a, b) => {
    if (sortBy === 'ROLL_ASC') {
      const rA = parseInt(a.roll_no || a.rollNumber, 10) || 0
      const rB = parseInt(b.roll_no || b.rollNumber, 10) || 0
      return rA - rB
    }
    if (sortBy === 'ROLL_DESC') {
      const rA = parseInt(a.roll_no || a.rollNumber, 10) || 0
      const rB = parseInt(b.roll_no || b.rollNumber, 10) || 0
      return rB - rA
    }
    if (sortBy === 'NAME_ASC') {
      return (a.name || '').localeCompare(b.name || '')
    }
    if (sortBy === 'ATTENDANCE_DESC') {
      return (b.attendanceStats?.percentage || 0) - (a.attendanceStats?.percentage || 0)
    }
    if (sortBy === 'ATTENDANCE_ASC') {
      return (a.attendanceStats?.percentage || 0) - (b.attendanceStats?.percentage || 0)
    }
    return 0
  })

  // Calculate unique divisions present in current students dataset
  const divisionsList = Array.from(new Set(
    students.map(s => s.className).filter(Boolean)
  )).sort()

  const isAdmin = user?.is_admin || user?.role === 'ADMIN'

  // Students scoped to selected division
  const divisionScopedStudents = students.filter(s => {
    if (selectedDivision === 'ALL') return true
    return (s.className === selectedDivision) || (s.classId === selectedDivision)
  })

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="page-title">Student Management</h1>
            {activeSubjectObj && (
              <span className="badge badge-blue" style={{ fontSize: '12px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <BookOpen size={12} /> {activeSubjectObj.name} {activeSubjectObj.classes?.length > 0 ? `(${activeSubjectObj.classes.map(c=>c.name).join(', ')})` : ''}
              </span>
            )}
          </div>
          <p className="page-desc">
            {activeSubjectObj 
              ? `Viewing students for allocated course ${activeSubjectObj.name} • ${activeSubjectObj.classes?.map(c=>c.name).join(', ') || 'All Divisions'}`
              : 'Organized student registry with biometrics, division mappings, and subject-wise attendance tracking.'}
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => navigate('/enroll?mode=create')}>
            <UserPlus size={16}/> Enroll New Student
          </button>
        )}
      </div>

      {/* KPI Overview Cards (Scoped to Selected Division) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {[
          { l: selectedDivision === 'ALL' ? 'Total Students' : `Students in ${selectedDivision}`, v: divisionScopedStudents.length, c: '#10B981', sub: selectedDivision === 'ALL' ? 'All divisions combined' : 'Registered in this class' },
          { l: 'Biometric Ready', v: divisionScopedStudents.filter(s => (s.photo_count >= 5 || s.is_active)).length, c: '#3B82F6', sub: 'Face profile active' },
          { l: 'Pending Enrollment', v: divisionScopedStudents.filter(s => (!s.is_active && (s.photo_count || 0) < 5)).length, c: '#F59E0B', sub: 'Needs face capture' },
          { l: 'Attendance Defaulters', v: divisionScopedStudents.filter(s => s.attendanceStats?.isDefaulter).length, c: '#EF4444', sub: '< 75% overall rate' },
        ].map(({ l, v, c, sub }) => (
          <div key={l} className="card" style={{ padding: '18px 20px', borderLeft: `4px solid ${c}` }}>
            <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>{v}</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', margin: '4px 0 0 0' }}>{l}</p>
            <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '2px 0 0 0' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Filters Bar: Division Filter, Status, Search, and Sort */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Division Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Filter size={14} /> Division:
            </span>
            <button
              onClick={() => setSelectedDivision('ALL')}
              className={`badge ${selectedDivision === 'ALL' ? 'badge-green' : ''}`}
              style={{ 
                cursor: 'pointer', 
                border: '1px solid var(--border)',
                background: selectedDivision === 'ALL' ? 'var(--primary)' : 'var(--surface2)',
                color: selectedDivision === 'ALL' ? '#FFFFFF' : 'var(--text)',
                padding: '5px 12px',
                borderRadius: '8px'
              }}
            >
              All Divisions ({students.length})
            </button>
            {divisionsList.map(div => {
              const count = students.filter(s => s.className === div).length
              const isActive = selectedDivision === div
              return (
                <button
                  key={div}
                  onClick={() => setSelectedDivision(div)}
                  className="badge"
                  style={{
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    background: isActive ? 'var(--primary)' : 'var(--surface2)',
                    color: isActive ? '#FFFFFF' : 'var(--text)',
                    padding: '5px 12px',
                    borderRadius: '8px'
                  }}
                >
                  {div} ({count})
                </button>
              )
            })}
          </div>

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowUpDown size={13} /> Sort:
            </span>
            <select 
              className="input" 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              style={{ width: 'auto', padding: '6px 10px', fontSize: '13px', height: '36px' }}
            >
              <option value="ROLL_ASC">Roll Number (Ascending)</option>
              <option value="ROLL_DESC">Roll Number (Descending)</option>
              <option value="NAME_ASC">Student Name (A → Z)</option>
              <option value="ATTENDANCE_DESC">Attendance % (High → Low)</option>
              <option value="ATTENDANCE_ASC">Attendance % (Low → High)</option>
            </select>
          </div>
        </div>

        {/* Search & Status Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input 
              className="input" 
              style={{ paddingLeft: 40 }} 
              placeholder="Search by student name, roll number, or email..."
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select 
              className="input" 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: 'auto', padding: '8px 12px', fontSize: '13px' }}
            >
              <option value="ALL">All Status</option>
              <option value="ENROLLED">Enrolled (Biometrics Active)</option>
              <option value="NOT_ENROLLED">Pending Face Enrollment</option>
              <option value="DEFAULTER">Defaulters (&lt; 75%)</option>
            </select>
            {(search || selectedDivision !== 'ALL' || statusFilter !== 'ALL') && (
              <button 
                className="btn btn-secondary" 
                onClick={() => { setSearch(''); setSelectedDivision('ALL'); setStatusFilter('ALL'); }}
                style={{ padding: '6px 12px', fontSize: '12.5px' }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Student Table */}
      <div className="table-card">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 12 }}>
            <div className="spinner" style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading student profiles...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Users size={44} style={{ margin: '0 auto 14px', color: 'var(--muted)', opacity: 0.5 }} />
            <p style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600 }}>No students found</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              {search || selectedDivision !== 'ALL' ? 'Try adjusting your division filter or search terms.' : 'Get started by enrolling students into the system.'}
            </p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/enroll?mode=create')}>
              Enroll First Student
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Student Profile</th>
                  <th>Roll No</th>
                  <th>Division</th>
                  <th>Attendance %</th>
                  <th>Face Biometrics</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id || s.roll_no}>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ 
                          width: 38, height: 38, borderRadius: 10, 
                          background: `${COLORS[i % COLORS.length]}18`, 
                          border: `1px solid ${COLORS[i % COLORS.length]}35`, 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          fontSize: 14, fontWeight: 700, color: COLORS[i % COLORS.length], 
                          flexShrink: 0 
                        }}>
                          {(s.name || s.firstName || 'S')[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', margin: 0 }}>{s.name || `${s.firstName} ${s.lastName}`}</p>
                          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '1px 0 0 0' }}>{s.email || `Roll ${s.roll_no}`}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-blue" style={{ fontWeight: 700 }}>
                        {s.roll_no || s.rollNumber}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-purple" style={{ fontWeight: 600 }}>
                        {s.className || 'Unassigned'}
                      </span>
                    </td>

                    {/* Attendance % Column */}
                    <td>
                      {s.attendanceStats?.totalSessions > 0 ? (
                        <button 
                          onClick={() => handleViewAttendance(s)}
                          style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                          title="Click to view subject-wise breakdown"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontWeight: 700,
                              fontSize: 13,
                              color: s.attendanceStats.isDefaulter ? 'var(--danger)' : 'var(--success)'
                            }}>
                              {s.attendanceStats.percentage}%
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                              ({s.attendanceStats.presentSessions}/{s.attendanceStats.totalSessions})
                            </span>
                          </div>
                          <div style={{ width: 72, height: 5, background: 'var(--surface2)', borderRadius: 3, marginTop: 4 }}>
                            <div style={{
                              width: `${Math.min(100, s.attendanceStats.percentage)}%`,
                              height: '100%',
                              background: s.attendanceStats.isDefaulter ? 'var(--danger)' : 'var(--success)',
                              borderRadius: 3
                            }} />
                          </div>
                        </button>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>No sessions</span>
                      )}
                    </td>

                    {/* Face Biometrics Progress */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 56, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${Math.min(100, ((s.photo_count || 0) / 5) * 100)}%`, 
                            background: (s.photo_count >= 5 || s.is_active) ? 'var(--success)' : 'var(--warning)' 
                          }} />
                        </div>
                        <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>
                          {s.photo_count || 0}/5
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      {s.is_active || s.photo_count >= 5
                        ? <span className="badge badge-green">Enrolled</span>
                        : <span className="badge badge-amber">Pending</span>}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        {/* Attendance Breakdown Button */}
                        <button 
                          className="btn-icon" 
                          title="View Subject-wise Attendance Breakdown" 
                          onClick={() => handleViewAttendance(s)}
                          style={{ color: 'var(--primary)' }}
                        >
                          <BarChart2 size={16} />
                        </button>

                        {isAdmin && (
                          <>
                            <button 
                              className="btn-icon" 
                              title="Edit Student Info" 
                              onClick={() => setEditing({ 
                                id: s.id,
                                roll_no: s.roll_no || s.rollNumber, 
                                firstName: s.firstName || s.name?.split(' ')[0] || '', 
                                lastName: s.lastName || s.name?.split(' ')[1] || '', 
                                classId: s.classId || '' 
                              })}
                            >
                              <Edit size={16} />
                            </button>
                            
                            <button 
                              className="btn-icon" 
                              title="Clear Attendance Records" 
                              onClick={() => handleClearRecords(s)}
                            >
                              <FileX size={16} />
                            </button>

                            {/* DELETE STUDENT BUTTON */}
                            <button 
                              className="btn-icon" 
                              title="Delete Student Permanently" 
                              onClick={() => setDeleteTarget(s)}
                              style={{ color: 'var(--danger)' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modern Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottomColor: 'var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
                  <ShieldAlert size={18} />
                </div>
                <h2 style={{ fontSize: 17, color: 'var(--text)' }}>Delete Student Profile?</h2>
              </div>
              <button className="btn-icon" onClick={() => setDeleteTarget(null)}><X size={18} /></button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to delete <strong style={{ color: 'var(--text)' }}>{deleteTarget.name}</strong>?
              </p>

              <div style={{ 
                margin: '16px 0', 
                padding: '14px', 
                borderRadius: '10px', 
                background: 'var(--surface2)', 
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                  {(deleteTarget.name || 'S')[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{deleteTarget.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Roll: {deleteTarget.roll_no || deleteTarget.rollNumber} • Div: {deleteTarget.className || 'Unassigned'}
                  </div>
                </div>
              </div>

              <div style={{ 
                background: 'rgba(239, 68, 68, 0.08)', 
                border: '1px solid rgba(239, 68, 68, 0.25)', 
                padding: '12px', 
                borderRadius: '8px',
                fontSize: '12.5px',
                color: 'var(--danger)',
                lineHeight: 1.4
              }}>
                ⚠️ <strong>Warning:</strong> This permanently deletes their 5 biometric face embeddings, all past attendance records, and student user account. This cannot be undone.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete Student'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Student Details</h2>
              <button className="btn-icon" onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ padding: '20px 24px' }} className="form-stack">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="field-label">First Name</label>
                  <input className="input" required value={editing.firstName} onChange={e => setEditing({...editing, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="field-label">Last Name</label>
                  <input className="input" required value={editing.lastName} onChange={e => setEditing({...editing, lastName: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="field-label">Roll Number</label>
                <input className="input" required value={editing.roll_no} onChange={e => setEditing({...editing, roll_no: e.target.value, rollNumber: e.target.value})} />
              </div>

              <div>
                <label className="field-label">Assigned Division</label>
                <select className="input" value={editing.classId} onChange={e => setEditing({...editing, classId: e.target.value})}>
                  <option value="">-- No Division Assigned --</option>
                  {classes
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.academicSem ? `(Sem ${c.academicSem.number})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject-wise Attendance Breakdown Modal */}
      {selectedStudentForReport && (
        <div className="modal-overlay" onClick={() => { setSelectedStudentForReport(null); setStudentReportData(null); }}>
          <div className="modal-content" style={{ maxWidth: 740, width: '92%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: 18 }}>{selectedStudentForReport.name}</h2>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
                  Roll {selectedStudentForReport.roll_no || selectedStudentForReport.rollNumber} • Division: {selectedStudentForReport.className || 'N/A'} • {selectedStudentForReport.email}
                </p>
              </div>
              <button className="btn-icon" onClick={() => { setSelectedStudentForReport(null); setStudentReportData(null); }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {loadingReport ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                  <div className="spinner" style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 10px' }} />
                  Loading attendance matrix...
                </div>
              ) : studentReportData ? (
                <>
                  {/* KPI summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
                    <div className="card" style={{ padding: 14 }}>
                      <p className="field-label" style={{ fontSize: 12 }}>Overall Average</p>
                      <h3 style={{
                        fontSize: 22, fontWeight: 800, margin: '4px 0 0',
                        color: studentReportData.overall?.isDefaulter ? 'var(--danger)' : 'var(--success)'
                      }}>
                        {studentReportData.overall?.percentage ?? 0}%
                      </h3>
                    </div>

                    <div className="card" style={{ padding: 14 }}>
                      <p className="field-label" style={{ fontSize: 12 }}>Total Conducted</p>
                      <h3 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 0', color: 'var(--text)' }}>
                        {studentReportData.overall?.totalSessions ?? 0}
                      </h3>
                    </div>

                    <div className="card" style={{ padding: 14 }}>
                      <p className="field-label" style={{ fontSize: 12 }}>Sessions Present</p>
                      <h3 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 0', color: 'var(--success)' }}>
                        {studentReportData.overall?.present ?? 0}
                      </h3>
                    </div>

                    <div className="card" style={{ padding: 14 }}>
                      <p className="field-label" style={{ fontSize: 12 }}>Academic Status</p>
                      <div style={{ marginTop: 6 }}>
                        {studentReportData.overall?.isDefaulter ? (
                          <span className="badge badge-red" style={{ fontSize: 11 }}>
                            <AlertTriangle size={12} /> Defaulter (&lt;75%)
                          </span>
                        ) : (
                          <span className="badge badge-green" style={{ fontSize: 11 }}>
                            <CheckCircle2 size={12} /> Safe (≥75%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Subject Matrix Table */}
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    Subject-wise Attendance Breakdown
                  </h4>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
                    <table className="table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Faculty</th>
                          <th style={{ textAlign: 'center' }}>Sessions</th>
                          <th style={{ textAlign: 'center' }}>Percentage</th>
                          <th style={{ textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(studentReportData.subjects || []).length === 0 ? (
                          <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>No subjects mapped to this division.</td></tr>
                        ) : (
                          studentReportData.subjects.map(sub => (
                            <tr key={sub.id}>
                              <td>
                                <div style={{ fontWeight: 600 }}>{sub.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub.code}</div>
                              </td>
                              <td style={{ color: 'var(--text)' }}>{sub.faculty}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ fontWeight: 600 }}>{sub.present}</span> / {sub.totalSessions}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {sub.totalSessions > 0 ? (
                                  <div>
                                    <span style={{ fontWeight: 700, color: sub.isDefaulter ? 'var(--danger)' : 'var(--success)' }}>
                                      {sub.percentage}%
                                    </span>
                                    <div style={{ width: 64, height: 4, background: 'var(--surface2)', borderRadius: 2, margin: '3px auto 0' }}>
                                      <div style={{
                                        width: `${Math.min(100, sub.percentage)}%`,
                                        height: '100%',
                                        background: sub.isDefaulter ? 'var(--danger)' : 'var(--success)',
                                        borderRadius: 2
                                      }} />
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--muted)' }}>-</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {sub.totalSessions === 0 ? (
                                  <span style={{ color: 'var(--muted)', fontSize: 11 }}>No sessions</span>
                                ) : sub.isDefaulter ? (
                                  <span className="badge badge-red" style={{ fontSize: 11 }}>&lt;75% Defaulter</span>
                                ) : (
                                  <span className="badge badge-green" style={{ fontSize: 11 }}>Safe</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
