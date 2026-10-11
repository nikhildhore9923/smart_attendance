import { useState, useEffect } from 'react'
import { 
  User, Lock, Info, CheckCircle2, Shield, BookOpen, Building, 
  Calendar, Award, Key, Sparkles, Check, ChevronRight 
} from 'lucide-react'
import { changePassword, getHealth } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user } = useAuth()
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState(null)

  useEffect(() => {
    getHealth().then(res => setConfig(res.data.config)).catch(() => {})
  }, [])

  const handlePw = async e => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm) { 
      toast.error('Passwords do not match')
      return 
    }
    if (pwForm.new_password.length < 6) { 
      toast.error('Password must be at least 6 characters')
      return 
    }
    setSaving(true)
    try {
      await changePassword({ old_password: pwForm.old_password, new_password: pwForm.new_password })
      toast.success('Password updated successfully')
      setPwForm({ old_password: '', new_password: '', confirm: '' })
    } catch (err) { 
      toast.error(err.response?.data?.error || 'Old password is incorrect') 
    } finally { 
      setSaving(false) 
    }
  }

  const specs = [
    ['Face Feature Extractor', config?.embeddingModel || 'ArcFace (512-D float vectors)'],
    ['Face Detection Engine',   config?.faceDetector || 'YOLOv8-Face / MTCNN'],
    ['Comparison Metric',      'Cosine Distance (1 - dot product)'],
    ['Acceptance Threshold',   config?.recognitionThreshold || '0.50 Cosine'],
    ['Anti-Spoofing Engine',    'Liveness Quality Variance + Brightness Check'],
    ['Enrollment Requirement', '5 Verified Angles per Student'],
    ['Database & ORM',         'MySQL (Prisma Engine)'],
    ['Authentication',         'Signed JWT (HS256)'],
  ]

  const isAdmin = user?.role === 'ADMIN' || user?.is_admin
  const isFaculty = user?.role === 'FACULTY'

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Title */}
      <div>
        <h1 className="page-title">Profile & Settings</h1>
        <p className="page-desc">
          Manage your personal account details, credentials, and inspect institutional system configurations.
        </p>
      </div>

      {/* Hero User Identity Card */}
      <div className="card" style={{ padding: '28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: isAdmin ? 'linear-gradient(90deg, #10B981, #3B82F6)' : 'linear-gradient(90deg, #3B82F6, #8B5CF6)'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{
            width: '68px', height: '68px', borderRadius: '50%',
            background: isAdmin ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px', fontWeight: 800, color: '#fff',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)', flexShrink: 0
          }}>
            {(user?.full_name || user?.email || 'U')[0]?.toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                {user?.full_name || user?.email}
              </h2>
              <span className={`badge ${isAdmin ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: '12px' }}>
                {isAdmin ? 'System Administrator' : 'Faculty Member'}
              </span>
            </div>
            
            <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: 'var(--muted)' }}>
              {user?.email}
            </p>

            {user?.department && (
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building size={14} color="var(--primary)" /> Department: <strong>{user.department}</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Faculty Academic Allocation Details Card */}
      {isFaculty && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--info)' }}>
              <BookOpen size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                Teaching Assignments & Allocated Courses
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                Subjects assigned to your profile for conducting live face recognition attendance.
              </p>
            </div>
          </div>

          {user?.subjects && user.subjects.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {user.subjects.map(sub => (
                <div key={sub.id} style={{
                  padding: '14px 16px', borderRadius: '10px',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  display: 'flex', flexDirection: 'column', gap: 6
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{sub.name}</span>
                    <span className="badge badge-purple" style={{ fontSize: '11px' }}>{sub.code}</span>
                  </div>
                  {sub.classes && sub.classes.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {sub.classes.map(c => (
                        <span key={c.id} style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--surface)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '16px', background: 'var(--surface2)', borderRadius: '10px', color: 'var(--muted)', fontSize: '13px' }}>
              No subjects allocated yet. Contact your System Administrator to map subjects to your faculty profile.
            </div>
          )}
        </div>
      )}

      {/* Administrator Privileges Card */}
      {isAdmin && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
              <Shield size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                Administrator Access Permissions
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                Unrestricted institutional controls enabled for your account.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {[
              'Student Database & Biometric Enrolment',
              'Faculty Account Provisioning & Allocations',
              'Academic Structure (Programs, Years, Divisions)',
              'Institution-Wide Attendance Reports & Matrix',
              'Permanent Student Deletion & Record Cleanup',
              'Security Audit Logs & System Inspection'
            ].map(perm => (
              <div key={perm} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: '8px', background: 'var(--surface2)',
                fontSize: '12.5px', color: 'var(--text)', fontWeight: 500
              }}>
                <Check size={14} color="var(--success)" />
                <span>{perm}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change Password Form */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
            <Key size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
              Security & Password
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>
              Keep your credentials secure. Must be at least 6 characters.
            </p>
          </div>
        </div>

        <form onSubmit={handlePw} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: '480px' }}>
          <div>
            <label className="field-label">Current Password</label>
            <input 
              className="input" 
              type="password" 
              placeholder="••••••••" 
              required
              value={pwForm.old_password} 
              onChange={e => setPwForm(p => ({ ...p, old_password: e.target.value }))} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="field-label">New Password</label>
              <input 
                className="input" 
                type="password" 
                placeholder="••••••••" 
                required
                value={pwForm.new_password} 
                onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))} 
              />
            </div>
            <div>
              <label className="field-label">Confirm New Password</label>
              <input 
                className="input" 
                type="password" 
                placeholder="••••••••" 
                required
                value={pwForm.confirm} 
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} 
              />
            </div>
          </div>

          <div style={{ marginTop: 6 }}>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* System Technical Specifications */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)' }}>
            <Info size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
              System & Biometric Architecture
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>
              Technical pipeline specifications powering SmartAttend AI.
            </p>
          </div>
          <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>Read Only</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '8px' }}>
          {specs.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8 }}>
              <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>{k}</span>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
