import { useState, useEffect } from 'react'
import { 
  Users, UserPlus, BookOpen, Edit, Trash2, Key, Check, Copy, 
  Search, Shield, GraduationCap, AlertTriangle, X, CheckSquare, Square,
  Building, Mail, ExternalLink, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import api, { 
  getFacultyList, createFacultyMember, updateFacultyMember, 
  deleteFacultyMember, allocateFacultyCourses, getSubjects 
} from '../lib/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { useConfirm } from '../context/ConfirmContext'

export default function FacultyPage() {
  const { confirm } = useConfirm()
  const [facultyList, setFacultyList] = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modals
  const [facultyModal, setFacultyModal] = useState({ show: false, edit: null })
  const [allocateModal, setAllocateModal] = useState({ show: false, faculty: null, selectedSubjectIds: [] })
  const [credentialsModal, setCredentialsModal] = useState({ show: false, creds: null })

  // Form states for Create/Edit Faculty
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: 'Computer Science',
    password: '',
    subjectIds: []
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [facRes, subRes] = await Promise.all([
        getFacultyList(),
        api.get('/academic/subjects?all=true')
      ])
      setFacultyList(facRes.data)
      setAllSubjects(subRes.data)
    } catch (err) {
      toast.error('Failed to load faculty records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Open Create Modal
  const openCreateModal = () => {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      department: 'Computer Science',
      password: generateRandomPassword(),
      subjectIds: []
    })
    setFacultyModal({ show: true, edit: null })
  }

  // Open Edit Modal
  const openEditModal = (fac) => {
    setForm({
      firstName: fac.user?.firstName || '',
      lastName: fac.user?.lastName || '',
      email: fac.user?.email || '',
      department: fac.department || '',
      password: '', // Blank unless updating password
      subjectIds: (fac.subjects || []).map(s => s.id)
    })
    setFacultyModal({ show: true, edit: fac })
  }

  // Open Allocate Modal
  const openAllocateModal = (fac) => {
    setAllocateModal({
      show: true,
      faculty: fac,
      selectedSubjectIds: (fac.subjects || []).map(s => s.id)
    })
  }

  // Helper password generator
  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
    let pass = 'Teach@'
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pass
  }

  // Handle Create or Update
  const handleSaveFaculty = async (e) => {
    e.preventDefault()
    try {
      if (facultyModal.edit) {
        // Update
        const payload = {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          department: form.department,
          subjectIds: form.subjectIds
        }
        if (form.password && form.password.trim().length >= 6) {
          payload.password = form.password.trim()
        }
        await updateFacultyMember(facultyModal.edit.id, payload)
        toast.success('Faculty profile updated')
        setFacultyModal({ show: false, edit: null })
      } else {
        // Create
        if (!form.password || form.password.length < 6) {
          return toast.error('Password must be at least 6 characters')
        }
        const res = await createFacultyMember(form)
        toast.success('Faculty account created!')
        setFacultyModal({ show: false, edit: null })
        // Show credentials card immediately for easy sharing
        const allocatedSubjectNames = allSubjects
          .filter(s => form.subjectIds.includes(s.id))
          .map(s => `${s.name} (${s.code})`)
        setCredentialsModal({
          show: true,
          creds: {
            name: `${form.firstName} ${form.lastName}`,
            email: form.email,
            password: form.password,
            department: form.department,
            subjects: allocatedSubjectNames
          }
        })
      }
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Operation failed')
    }
  }

  // Handle Quick Course Allocation Save
  const handleSaveAllocation = async () => {
    if (!allocateModal.faculty) return
    try {
      await allocateFacultyCourses(allocateModal.faculty.id, allocateModal.selectedSubjectIds)
      toast.success('Courses allocated successfully')
      setAllocateModal({ show: false, faculty: null, selectedSubjectIds: [] })
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to allocate courses')
    }
  }

  // Handle Delete
  const handleDeleteFaculty = async (fac) => {
    const fullName = `${fac.user?.firstName || ''} ${fac.user?.lastName || ''}`.trim() || fac.user?.email
    const ok = await confirm({
      title: 'Remove Faculty Member?',
      message: `Are you sure you want to remove faculty member ${fullName} (${fac.user?.email})? This will revoke their teaching allocation and login access.`,
      confirmText: 'Remove Faculty',
      type: 'danger'
    })
    if (!ok) return
    try {
      await deleteFacultyMember(fac.id)
      toast.success(`${fullName} removed`)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove faculty member')
    }
  }

  // Copy text to clipboard helper
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  // Filtered faculty list
  const filteredFaculty = facultyList.filter(f => {
    const term = search.toLowerCase()
    const name = `${f.user?.firstName || ''} ${f.user?.lastName || ''}`.toLowerCase()
    const email = (f.user?.email || '').toLowerCase()
    const dept = (f.department || '').toLowerCase()
    const subjects = (f.subjects || []).map(s => `${s.name} ${s.code}`).join(' ').toLowerCase()
    return name.includes(term) || email.includes(term) || dept.includes(term) || subjects.includes(term)
  })

  // Aggregate stats
  const totalAllocations = facultyList.reduce((acc, f) => acc + (f.subjects?.length || 0), 0)
  const departments = Array.from(new Set(facultyList.map(f => f.department).filter(Boolean)))

  if (loading) return <LoadingSpinner />

  return (
    <div className="page-container" style={{ paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Faculty & Course Allocation</h1>
          <p className="page-desc" style={{ marginBottom: 0 }}>
            Manage teaching staff credentials and allocate multiple subjects/courses per instructor.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <UserPlus size={16} /> Add New Faculty
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="table-card" style={{ padding: '20px', borderLeft: '4px solid var(--primary)' }}>
          <p style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>{facultyList.length}</p>
          <p className="field-label" style={{ marginTop: 4 }}>Total Faculty Members</p>
        </div>
        <div className="table-card" style={{ padding: '20px', borderLeft: '4px solid var(--success)' }}>
          <p style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>{totalAllocations}</p>
          <p className="field-label" style={{ marginTop: 4 }}>Active Course Allocations</p>
        </div>
        <div className="table-card" style={{ padding: '20px', borderLeft: '4px solid var(--info)' }}>
          <p style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>{departments.length}</p>
          <p className="field-label" style={{ marginTop: 4 }}>Departments Represented</p>
        </div>
        <div className="table-card" style={{ padding: '20px', borderLeft: '4px solid var(--warning)' }}>
          <p style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            {facultyList.filter(f => (f.subjects?.length || 0) === 0).length}
          </p>
          <p className="field-label" style={{ marginTop: 4 }}>Unallocated Faculty</p>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
        <input 
          className="input" 
          style={{ paddingLeft: '40px' }} 
          placeholder="Search faculty by name, institutional email, department, or course..."
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      {/* Faculty Table / Directory */}
      <div className="table-card" style={{ overflow: 'hidden' }}>
        {filteredFaculty.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Users size={48} color="var(--border)" style={{ margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontSize: '15px', color: 'var(--muted)', fontWeight: 500 }}>
              {search ? 'No faculty match your search criteria' : 'No faculty members registered yet'}
            </p>
            {!search && (
              <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={openCreateModal}>
                <UserPlus size={16} /> Register First Faculty
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Faculty Member</th>
                  <th>Department</th>
                  <th>Allocated Courses / Subjects</th>
                  <th>Sessions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaculty.map((fac) => {
                  const initials = `${fac.user?.firstName?.[0] || 'F'}${fac.user?.lastName?.[0] || ''}`.toUpperCase()
                  const fullName = `${fac.user?.firstName || 'Faculty'} ${fac.user?.lastName || ''}`
                  const subjects = fac.subjects || []

                  return (
                    <tr key={fac.id}>
                      {/* Name & Email */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '40px', height: '40px', borderRadius: '10px', 
                            background: 'var(--surface2)', border: '1px solid var(--border)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            fontSize: '14px', fontWeight: 700, color: 'var(--primary)', flexShrink: 0 
                          }}>
                            {initials}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)', margin: 0 }}>
                              {fullName}
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Mail size={12} /> {fac.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td>
                        <span className="badge badge-gray" style={{ fontWeight: 600 }}>
                          {fac.department || 'General'}
                        </span>
                      </td>

                      {/* Allocated Courses */}
                      <td>
                        {subjects.length === 0 ? (
                          <span style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: 500 }}>
                            ⚠️ No courses allocated
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {subjects.map(s => {
                              const classNames = s.classes?.map(c => c.name).join(', ')
                              return (
                                <span 
                                  key={s.id} 
                                  className="badge badge-blue" 
                                  style={{ fontSize: '12px', padding: '4px 8px' }}
                                  title={`${s.name} (${s.code})${classNames ? ` for ${classNames}` : ''}`}
                                >
                                  {s.code}: {s.name}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </td>

                      {/* Sessions Conducted */}
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                          {fac._count?.sessions || 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="btn-icon" 
                            title="Allocate / Manage Courses"
                            onClick={() => openAllocateModal(fac)}
                          >
                            <BookOpen size={16} color="var(--primary)" />
                          </button>
                          
                          <button 
                            className="btn-icon" 
                            title="Generate / View Login Credentials"
                            onClick={() => {
                              const assigned = (fac.subjects || []).map(s => `${s.name} (${s.code})`)
                              setCredentialsModal({
                                show: true,
                                creds: {
                                  name: fullName,
                                  email: fac.user?.email,
                                  password: '(Saved securely - use Reset Password to set new)',
                                  department: fac.department,
                                  subjects: assigned
                                }
                              })
                            }}
                          >
                            <Key size={16} color="var(--info)" />
                          </button>

                          <button 
                            className="btn-icon" 
                            title="Edit Profile"
                            onClick={() => openEditModal(fac)}
                          >
                            <Edit size={16} />
                          </button>

                          <button 
                            className="btn-icon" 
                            title="Remove Faculty"
                            onClick={() => handleDeleteFaculty(fac)}
                          >
                            <Trash2 size={16} color="var(--danger)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT FACULTY MODAL */}
      {facultyModal.show && (
        <div className="modal-overlay" onClick={() => setFacultyModal({ show: false, edit: null })}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{facultyModal.edit ? 'Edit Faculty Profile' : 'Add New Faculty & Issue Credentials'}</h2>
              <button className="btn-icon" onClick={() => setFacultyModal({ show: false, edit: null })}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveFaculty} className="form-stack p-6">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="field-label">First Name *</label>
                  <input 
                    className="input" 
                    required 
                    placeholder="e.g. Ramesh"
                    value={form.firstName} 
                    onChange={e => setForm({ ...form, firstName: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="field-label">Last Name *</label>
                  <input 
                    className="input" 
                    required 
                    placeholder="e.g. Sharma"
                    value={form.lastName} 
                    onChange={e => setForm({ ...form, lastName: e.target.value })} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="field-label">Institutional Email *</label>
                  <input 
                    type="email" 
                    className="input" 
                    required 
                    placeholder="e.g. ramesh.sharma@college.edu"
                    value={form.email} 
                    onChange={e => setForm({ ...form, email: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="field-label">Department *</label>
                  <input 
                    className="input" 
                    required 
                    placeholder="e.g. Computer Science"
                    value={form.department} 
                    onChange={e => setForm({ ...form, department: e.target.value })} 
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="field-label">
                    {facultyModal.edit ? 'New Password (Leave blank to keep unchanged)' : 'Initial Password *'}
                  </label>
                  {!facultyModal.edit && (
                    <button 
                      type="button" 
                      onClick={() => setForm({ ...form, password: generateRandomPassword() })}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Generate Random
                    </button>
                  )}
                </div>
                <input 
                  type="text" 
                  className="input" 
                  placeholder={facultyModal.edit ? '••••••••' : 'Min 6 characters'}
                  value={form.password} 
                  required={!facultyModal.edit}
                  onChange={e => setForm({ ...form, password: e.target.value })} 
                />
              </div>

              {/* Course Allocation Section */}
              <div>
                <label className="field-label">Allocate Courses / Subjects (Can assign multiple)</label>
                <div style={{ 
                  maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', 
                  borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
                  background: 'var(--bg)'
                }}>
                  {allSubjects.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                      No subjects configured yet. Create subjects in Academic Setup first.
                    </p>
                  ) : (
                    allSubjects.map(sub => {
                      const isChecked = form.subjectIds.includes(sub.id)
                      const classNames = sub.classes?.map(c => `Div ${c.name}`).join(', ')
                      return (
                        <label 
                          key={sub.id} 
                          style={{ 
                            display: 'flex', alignItems: 'center', gap: '10px', 
                            padding: '6px 8px', borderRadius: '6px', cursor: 'pointer',
                            background: isChecked ? 'var(--surface-info)' : 'transparent'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm({ ...form, subjectIds: [...form.subjectIds, sub.id] })
                              } else {
                                setForm({ ...form, subjectIds: form.subjectIds.filter(id => id !== sub.id) })
                              }
                            }} 
                          />
                          <span style={{ fontSize: '13px', fontWeight: isChecked ? 600 : 400, color: 'var(--text)' }}>
                            <strong>{sub.code}:</strong> {sub.name} {classNames ? `• (${classNames})` : ''}
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {facultyModal.edit ? 'Save Changes' : 'Create & Issue Credentials'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setFacultyModal({ show: false, edit: null })}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ALLOCATE COURSES MODAL */}
      {allocateModal.show && allocateModal.faculty && (
        <div className="modal-overlay" onClick={() => setAllocateModal({ show: false, faculty: null, selectedSubjectIds: [] })}>
          <div className="modal-content" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Allocate Courses for {allocateModal.faculty.user?.firstName} {allocateModal.faculty.user?.lastName}</h2>
              <button className="btn-icon" onClick={() => setAllocateModal({ show: false, faculty: null, selectedSubjectIds: [] })}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', marginTop: 0, marginBottom: '16px' }}>
                Select all subjects that this faculty member is assigned to teach. During live attendance sessions, they will only be able to mark attendance for these assigned courses.
              </p>

              <div style={{ 
                maxHeight: '260px', overflowY: 'auto', border: '1px solid var(--border)', 
                borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
                background: 'var(--bg)', marginBottom: '20px'
              }}>
                {allSubjects.map(sub => {
                  const isChecked = allocateModal.selectedSubjectIds.includes(sub.id)
                  const classNames = sub.classes?.map(c => `Div ${c.name}`).join(', ')

                  return (
                    <label 
                      key={sub.id} 
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '10px', 
                        padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                        border: '1px solid',
                        borderColor: isChecked ? 'var(--primary)' : 'var(--border)',
                        background: isChecked ? 'var(--surface-info)' : 'var(--surface)'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={(e) => {
                          const current = allocateModal.selectedSubjectIds
                          if (e.target.checked) {
                            setAllocateModal({ ...allocateModal, selectedSubjectIds: [...current, sub.id] })
                          } else {
                            setAllocateModal({ ...allocateModal, selectedSubjectIds: current.filter(id => id !== sub.id) })
                          }
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>
                          {sub.code} - {sub.name}
                        </p>
                        {classNames && (
                          <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--muted)' }}>
                            Classes: {classNames}
                          </p>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-primary" onClick={handleSaveAllocation} style={{ flex: 1 }}>
                  Save Course Allocation ({allocateModal.selectedSubjectIds.length} Assigned)
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setAllocateModal({ show: false, faculty: null, selectedSubjectIds: [] })}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREDENTIALS SHARE CARD MODAL */}
      {credentialsModal.show && credentialsModal.creds && (
        <div className="modal-overlay" onClick={() => setCredentialsModal({ show: false, creds: null })}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Faculty Access Credentials</h2>
              <button className="btn-icon" onClick={() => setCredentialsModal({ show: false, creds: null })}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ 
                background: 'var(--surface-info)', border: '1px solid var(--info)', 
                borderRadius: '10px', padding: '16px', marginBottom: '20px' 
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} color="var(--primary)" /> Ready-to-Send Access Information
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text2)', margin: 0 }}>
                  You can copy and send these login credentials directly to the instructor.
                </p>
              </div>

              {/* Formatted Letter / Card */}
              <div style={{ 
                background: 'var(--surface)', border: '1px solid var(--border)', 
                borderRadius: '8px', padding: '16px', fontFamily: 'monospace', fontSize: '13px',
                lineHeight: 1.6, color: 'var(--text)', marginBottom: '20px', whiteSpace: 'pre-wrap'
              }}>
{`=========================================
  SMARTATTEND FACULTY PORTAL CREDENTIALS
=========================================
Faculty Name:  ${credentialsModal.creds.name}
Department:    ${credentialsModal.creds.department}
Portal URL:    ${window.location.origin}/login
Email:         ${credentialsModal.creds.email}
Password:      ${credentialsModal.creds.password}

Assigned Courses:
${credentialsModal.creds.subjects?.length > 0 ? credentialsModal.creds.subjects.map(s => ` - ${s}`).join('\n') : ' (No courses assigned yet)'}
=========================================`}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    const text = `SMARTATTEND FACULTY CREDENTIALS\nName: ${credentialsModal.creds.name}\nPortal URL: ${window.location.origin}/login\nEmail: ${credentialsModal.creds.email}\nPassword: ${credentialsModal.creds.password}\nDepartment: ${credentialsModal.creds.department}\nAssigned Courses:\n${credentialsModal.creds.subjects?.map(s => ` - ${s}`).join('\n')}`
                    copyToClipboard(text)
                  }}
                >
                  <Copy size={16} /> Copy Credentials to Clipboard
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setCredentialsModal({ show: false, creds: null })}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
