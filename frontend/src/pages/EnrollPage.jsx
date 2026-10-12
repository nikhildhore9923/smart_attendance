import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  CheckCircle2, Camera, User, RefreshCw, AlertCircle, Search, 
  Trash2, UserPlus, Filter, ShieldAlert, X, ChevronRight 
} from 'lucide-react'
import toast from 'react-hot-toast'
import api, { 
  getStudents, getEnrollmentStatus, startEnrollment, 
  addEnrollmentSample, createStudent, deleteStudent 
} from '../lib/api'

export default function EnrollPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="page-container" style={{ padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          maxWidth: '600px',
          width: '100%',
          textAlign: 'center',
          background: 'var(--surface)',
          padding: '40px 32px',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
        }}>
          <ShieldAlert size={56} color="var(--warning)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>Admin-Only Feature</h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6', marginBottom: '24px' }}>
            Student biometric enrollment and face registration are restricted to <strong>Administrators</strong>.
            <br /><br />
            As <strong>Faculty</strong>, you can conduct live attendance sessions for your allocated courses and view attendance reports.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => navigate('/students')} className="btn btn-primary">
              View My Students
            </button>
            <button onClick={() => navigate('/live')} className="btn btn-secondary">
              Go to Live Recognition
            </button>
          </div>
        </div>
      </div>
    );
  }
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)

  // Filters & Organization
  const [selectedDivision, setSelectedDivision] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  
  // Biometric status
  const [status, setStatus] = useState(null) // { isEnrolled: boolean }
  
  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Camera & Mode State
  const location = useLocation()
  const [mode, setMode] = useState(new URLSearchParams(location.search).get('mode') === 'create' ? 'CREATE' : 'SELECT')
  const [newStudent, setNewStudent] = useState({ 
    firstName: '', lastName: '', email: '', rollNumber: '', classId: '', password: 'Password123!' 
  })
  const [progress, setProgress] = useState(0) // 0 to 5
  const [processing, setProcessing] = useState(false)
  const [feedback, setFeedback] = useState("Look directly at the camera and keep your face steady.")
  
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    fetchInitialData()
    return () => stopCamera()
  }, [])

  useEffect(() => {
    if (mode === 'ENROLLING' && videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.log("Video play error:", e));
    }
  }, [mode])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [studentsRes, classesRes] = await Promise.all([
        getStudents(),
        api.get('/academic/classes').catch(() => ({ data: [] }))
      ])
      setStudents(studentsRes.data)
      setClasses(classesRes.data)
    } catch (err) {
      toast.error('Failed to load initial data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await createStudent(newStudent);
      toast.success('Student created successfully!');
      setNewStudent({ firstName: '', lastName: '', email: '', rollNumber: '', classId: '', password: 'Password123!' });
      
      const updatedList = await getStudents();
      setStudents(updatedList.data);
      
      const found = updatedList.data.find(s => s.roll_no === res.data.rollNumber || s.rollNumber === res.data.rollNumber);
      if (found) {
        selectStudent(found);
      } else {
        setMode('SELECT');
        navigate('/enroll');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create student');
    } finally {
      setLoading(false);
    }
  }

  const selectStudent = async (student) => {
    setSelectedStudent(student)
    setMode('SELECT')
    try {
      setLoading(true)
      const res = await getEnrollmentStatus(student.id)
      setStatus(res.data)
    } catch (err) {
      setStatus({ isEnrolled: false })
    } finally {
      setLoading(false)
    }
  }

  const handleStartEnrollment = async (isReEnroll = false) => {
    try {
      setLoading(true)
      const action = isReEnroll ? 'RE_ENROLL' : 'ENROLL'
      await startEnrollment(selectedStudent.id, action)
      setMode('ENROLLING')
      setProgress(0)
      setFeedback("Look directly at the camera and keep your face steady.")
      startCamera()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start enrollment')
    } finally {
      setLoading(false)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } 
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      toast.error("Camera access denied or unavailable.")
      setMode('SELECT')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const captureFrame = async () => {
    if (!videoRef.current || processing) return
    setProcessing(true)
    setFeedback("Processing face frame & extracting ArcFace features...")
    
    try {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(videoRef.current, 0, 0)
      const base64Image = canvas.toDataURL('image/jpeg', 0.9)

      const res = await addEnrollmentSample(selectedStudent.id, base64Image)
      
      const newProgress = res.data.progress.split(' / ')[0]
      setProgress(Number(newProgress))
      
      toast.success(`Sample ${newProgress}/5 accepted ✓`)
      setFeedback("Sample accepted! Slightly tilt or adjust expression for the next sample.")

      if (Number(newProgress) === 5) {
        stopCamera()
        setMode('DONE')
        // Refresh student list in background
        getStudents().then(r => setStudents(r.data)).catch(() => {})
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to process sample'
      toast.error(errMsg)
      setFeedback(`Quality notice: ${errMsg}. Please steady your position and try again.`)
    } finally {
      setProcessing(false)
    }
  }

  const confirmDeleteStudent = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteStudent(deleteTarget.id || deleteTarget.roll_no, true)
      toast.success(`Student ${deleteTarget.name || deleteTarget.firstName} deleted successfully`)
      
      // If deleted student was currently selected, reset
      if (selectedStudent?.id === deleteTarget.id) {
        setSelectedStudent(null)
        setMode('SELECT')
      }
      
      setDeleteTarget(null)
      const res = await getStudents()
      setStudents(res.data)
    } catch (err) {
      toast.error('Failed to delete student: ' + (err.response?.data?.error || err.message))
    } finally {
      setDeleting(false)
    }
  }

  // Filter & Group Students
  const filteredStudents = students.filter(s => {
    // Division filter
    if (selectedDivision !== 'ALL') {
      const matchClass = (s.className === selectedDivision) || (s.classId === selectedDivision)
      if (!matchClass) return false
    }

    // Status filter
    if (statusFilter === 'ENROLLED' && !s.is_active && (s.photo_count || 0) < 5) return false
    if (statusFilter === 'PENDING' && (s.is_active || (s.photo_count || 0) >= 5)) return false

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase()
      const name = (s.name || `${s.firstName || ''} ${s.lastName || ''}`).toLowerCase()
      const roll = (s.rollNumber || s.roll_no || '').toLowerCase()
      if (!name.includes(q) && !roll.includes(q)) return false
    }

    return true
  }).sort((a, b) => {
    const rA = parseInt(a.rollNumber || a.roll_no, 10) || 0
    const rB = parseInt(b.rollNumber || b.roll_no, 10) || 0
    return rA - rB
  })

  // List of unique divisions
  const divisionsList = Array.from(new Set([
    ...classes.map(c => c.name),
    ...students.map(s => s.className).filter(Boolean)
  ])).filter(Boolean)

  // Students scoped to the selected division
  const divisionScopedStudents = students.filter(s => {
    if (selectedDivision === 'ALL') return true
    return (s.className === selectedDivision) || (s.classId === selectedDivision)
  })

  const enrolledCount = divisionScopedStudents.filter(s => s.is_active || (s.photo_count || 0) >= 5).length
  const pendingCount = divisionScopedStudents.length - enrolledCount

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 className="page-title">Biometric Face Enrollment</h1>
          <p className="page-desc">
            Register 512D ArcFace facial templates with anti-spoofing liveness checks.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Sidebar: Division Filters & Student Directory */}
        <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: 'calc(100vh - 130px)' }}>
          
          {/* Create Button */}
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => { setSelectedStudent(null); setMode('CREATE'); navigate('/enroll?mode=create'); }}
          >
            <UserPlus size={16} /> Create New Student
          </button>

          {/* Division Selector */}
          <div>
            <label className="field-label" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Filter size={13} /> Filter by Division
            </label>
            <select 
              className="input" 
              value={selectedDivision} 
              onChange={e => setSelectedDivision(e.target.value)}
              style={{ fontSize: '13px', padding: '7px 10px' }}
            >
              <option value="ALL">All Divisions ({students.length})</option>
              {divisionsList.map(div => {
                const count = students.filter(s => s.className === div).length
                return (
                  <option key={div} value={div}>
                    {div} ({count} students)
                  </option>
                )
              })}
            </select>
          </div>

          {/* Quick Status Filter Tabs (Scoped to Selected Division) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', background: 'var(--surface2)', padding: '3px', borderRadius: '8px' }}>
            {[
              { id: 'ALL', label: `All (${divisionScopedStudents.length})` },
              { id: 'ENROLLED', label: `Done (${enrolledCount})` },
              { id: 'PENDING', label: `Pending (${pendingCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  border: 'none',
                  background: statusFilter === tab.id ? 'var(--surface)' : 'transparent',
                  color: statusFilter === tab.id ? 'var(--text)' : 'var(--muted)',
                  fontWeight: statusFilter === tab.id ? 700 : 500,
                  fontSize: '11.5px',
                  padding: '5px 4px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: statusFilter === tab.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input 
              className="input" 
              placeholder="Search by name or roll..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '13px', padding: '7px 10px 7px 32px' }}
            />
          </div>

          {/* Scrollable Students List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
            {loading && students.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)', fontSize: 13 }}>
                Loading students...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--muted)', fontSize: 13 }}>
                No students match this filter.
              </div>
            ) : (
              filteredStudents.map(s => {
                const isSelected = selectedStudent?.id === s.id
                const isEnrolled = s.is_active || (s.photo_count || 0) >= 5
                const fullName = s.name || `${s.firstName || s.user?.firstName || ''} ${s.lastName || s.user?.lastName || ''}`.trim()
                const roll = s.rollNumber || s.roll_no

                return (
                  <div 
                    key={s.id} 
                    onClick={() => selectStudent(s)}
                    style={{ 
                      padding: '11px 12px', 
                      borderRadius: '10px', 
                      cursor: 'pointer',
                      background: isSelected ? 'var(--surface2)' : 'var(--surface)',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ 
                          width: 7, height: 7, borderRadius: '50%', 
                          background: isEnrolled ? 'var(--success)' : 'var(--warning)',
                          flexShrink: 0 
                        }} />
                        <p style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {fullName}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 500 }}>Roll {roll}</span>
                        <span style={{ fontSize: '10.5px', color: 'var(--muted2)' }}>•</span>
                        <span className="badge badge-purple" style={{ fontSize: '10px', padding: '1px 6px' }}>
                          {s.className || 'Unassigned'}
                        </span>
                      </div>
                    </div>

                    {/* Delete icon button directly in sidebar card */}
                    <button
                      className="btn-icon"
                      title="Delete Student"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}
                      style={{ color: 'var(--muted)', padding: 4 }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Main Content Pane */}
        <div className="card" style={{ padding: '28px', minHeight: '480px' }}>
          
          {/* CREATE STUDENT FORM */}
          {mode === 'CREATE' && (
            <div style={{ maxWidth: '540px', margin: '0 auto', width: '100%' }}>
              <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
                Register New Student Profile
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '22px' }}>
                Fill in the academic details before initiating the biometric webcam capture.
              </p>

              <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="field-label">First Name</label>
                    <input required className="input" placeholder="e.g. Yash" value={newStudent.firstName} onChange={e => setNewStudent({...newStudent, firstName: e.target.value})} />
                  </div>
                  <div>
                    <label className="field-label">Last Name</label>
                    <input required className="input" placeholder="e.g. Gaikwad" value={newStudent.lastName} onChange={e => setNewStudent({...newStudent, lastName: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="field-label">Institutional Email</label>
                  <input required type="email" className="input" placeholder="e.g. yash@college.edu" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="field-label">Roll Number</label>
                    <input required className="input" placeholder="e.g. 17" value={newStudent.rollNumber} onChange={e => setNewStudent({...newStudent, rollNumber: e.target.value})} />
                  </div>

                  <div>
                    <label className="field-label">Assigned Division</label>
                    <select 
                      className="input" 
                      required 
                      value={newStudent.classId} 
                      onChange={e => setNewStudent({...newStudent, classId: e.target.value})}
                    >
                      <option value="">-- Select Division --</option>
                      {classes
                        .slice()
                        .sort((a, b) => {
                          const semA = a.academicSem?.number ?? a.semester ?? 0;
                          const semB = b.academicSem?.number ?? b.semester ?? 0;
                          if (semA !== semB) return semA - semB;
                          return (a.name || '').localeCompare(b.name || '');
                        })
                        .map(c => {
                          const semNum = c.academicSem?.number || c.semester;
                          const semStr = semNum ? `Semester ${semNum}` : '';
                          const progStr = c.academicSem?.program?.name ? `${c.academicSem.program.name} • ` : '';
                          return (
                            <option key={c.id} value={c.id}>
                              {c.name} {semStr ? `(${progStr}${semStr})` : ''}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Creating...' : 'Create & Proceed to Enrollment'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setMode('SELECT'); navigate('/enroll'); }} disabled={loading}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* EMPTY SELECTION STATE */}
          {!selectedStudent && mode !== 'CREATE' && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={28} style={{ opacity: 0.6 }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>No Student Selected</h3>
              <p style={{ maxWidth: '340px', fontSize: 13, lineHeight: 1.5 }}>
                Select a student profile from the left directory to inspect biometrics, or click Create New Student.
              </p>
            </div>
          )}

          {/* SELECTED STUDENT DETAILS & ENROLL / DELETE ACTIONS */}
          {selectedStudent && mode === 'SELECT' && (
            <div>
              {/* Profile Header Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, borderBottom: '1px solid var(--border)', paddingBottom: '20px', marginBottom: '22px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                    {selectedStudent?.name || `${selectedStudent?.firstName || selectedStudent?.user?.firstName || ''} ${selectedStudent?.lastName || selectedStudent?.user?.lastName || ''}`}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 8 }}>
                    <span className="badge badge-blue">Roll {selectedStudent?.rollNumber || selectedStudent?.roll_no}</span>
                    <span className="badge badge-purple">Division: {selectedStudent?.className || 'Unassigned'}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{selectedStudent?.email || selectedStudent?.user?.email}</span>
                  </div>
                </div>

                {/* DELETE BUTTON */}
                <button 
                  className="btn btn-danger" 
                  onClick={() => setDeleteTarget(selectedStudent)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Trash2 size={16} /> Delete Student
                </button>
              </div>
              
              {loading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)' }}>
                  <div className="spinner" style={{ width: 22, height: 22, border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 8px' }} />
                  Verifying biometric database status...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Status Banner */}
                  <div style={{ 
                    background: status?.isEnrolled ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)', 
                    border: `1px solid ${status?.isEnrolled ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`, 
                    padding: '20px', 
                    borderRadius: '12px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {status?.isEnrolled ? <CheckCircle2 size={22} color="var(--success)" /> : <AlertCircle size={22} color="var(--warning)" />}
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                          Status: {status?.isEnrolled ? 'Biometrics Fully Enrolled ✓' : 'Face Biometrics Pending'}
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                          {status?.isEnrolled 
                            ? 'Student is verified and ready for real-time live multi-face attendance recognition.' 
                            : 'Requires capturing 5 biometric angles using the web camera.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Enrollment Action Card */}
                  <div style={{ background: 'var(--surface2)', padding: '22px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    {status?.isEnrolled ? (
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Re-Enroll Biometrics</h4>
                        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '18px' }}>
                          If recognition accuracy drops due to changes in appearance or lighting, re-enroll to capture a fresh 5-sample vector.
                        </p>
                        <button className="btn btn-primary" onClick={() => handleStartEnrollment(true)} disabled={loading}>
                          <RefreshCw size={16} /> Re-Enroll Face Profile
                        </button>
                      </div>
                    ) : (
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Begin Face Registration</h4>
                        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '18px' }}>
                          Face the camera directly in standard indoor lighting. 5 fast samples will be extracted.
                        </p>
                        <button className="btn btn-primary" onClick={() => handleStartEnrollment(false)} disabled={loading}>
                          <Camera size={16} /> Start Webcam Enrollment
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTIVE ENROLLING CAMERA VIEW */}
          {selectedStudent && mode === 'ENROLLING' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
                Capturing: {selectedStudent?.name || `${selectedStudent?.firstName} ${selectedStudent?.lastName}`}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '18px' }}>
                Roll {selectedStudent?.rollNumber || selectedStudent?.roll_no} • Division: {selectedStudent?.className || 'Unassigned'}
              </p>
              
              {/* Progress Stepper */}
              <div style={{ width: '100%', maxWidth: '440px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Sample Quality Progress</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>Sample {progress} of 5</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map(step => (
                    <div key={step} style={{
                      flex: 1, height: '8px', borderRadius: '4px',
                      background: step <= progress ? 'var(--success)' : 'var(--surface2)',
                      transition: 'all 0.25s ease'
                    }} />
                  ))}
                </div>
              </div>

              {/* Feedback Alert Box */}
              <div style={{
                background: processing ? 'rgba(59,130,246,0.1)' : 'var(--surface2)',
                border: `1px solid ${processing ? 'var(--primary)' : 'var(--border)'}`,
                padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', width: '100%', maxWidth: '440px', textAlign: 'center'
              }}>
                <p style={{ fontSize: '13px', color: processing ? 'var(--primary)' : 'var(--text)', fontWeight: 600, margin: 0 }}>
                  {feedback}
                </p>
              </div>

              {/* Live Camera View with Face Target Guide */}
              <div style={{ 
                position: 'relative', 
                width: '440px', 
                height: '330px', 
                background: '#0B0F19', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                marginBottom: '22px',
                border: '2px solid var(--border)',
                boxShadow: 'var(--shadow-md)'
              }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                
                {/* Visual Facial Framing Overlay */}
                <div style={{
                  position: 'absolute',
                  inset: '35px 75px',
                  border: '2px dashed rgba(16, 185, 129, 0.6)',
                  borderRadius: '100px',
                  pointerEvents: 'none',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.25)'
                }} />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={captureFrame} 
                  disabled={processing}
                  style={{ padding: '12px 28px', fontSize: '15px' }}
                >
                  <Camera size={18} /> {processing ? 'Analyzing Quality...' : `Capture Sample (${progress + 1}/5)`}
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => { stopCamera(); setMode('SELECT'); }}
                  disabled={processing}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* COMPLETED SUCCESS SCREEN */}
          {selectedStudent && mode === 'DONE' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={42} color="var(--success)" />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                Face Enrollment Completed!
              </h2>
              <p style={{ color: 'var(--muted)', maxWidth: '420px', fontSize: '14px', lineHeight: 1.5 }}>
                {selectedStudent?.name || `${selectedStudent?.firstName} ${selectedStudent?.lastName}`} has been registered with 5 biometric ArcFace embeddings. Live attendance can now recognize this student automatically.
              </p>
              <button className="btn btn-primary" onClick={() => selectStudent(selectedStudent)} style={{ marginTop: '10px' }}>
                Done & View Profile
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Delete Student Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
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
                Are you sure you want to permanently delete <strong style={{ color: 'var(--text)' }}>{deleteTarget.name || `${deleteTarget.firstName} ${deleteTarget.lastName}`}</strong>?
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
                  {(deleteTarget.name || deleteTarget.firstName || 'S')[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>
                    {deleteTarget.name || `${deleteTarget.firstName} ${deleteTarget.lastName}`}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Roll: {deleteTarget.rollNumber || deleteTarget.roll_no} • Div: {deleteTarget.className || 'Unassigned'}
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
                ⚠️ <strong>Warning:</strong> This permanently deletes their face embeddings, user account, and all associated session logs.
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
                  onClick={confirmDeleteStudent}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete Student'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
