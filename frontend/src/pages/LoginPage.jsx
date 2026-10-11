import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CheckCircle, ShieldCheck, UserCheck, Key, Lock, Loader2, Sparkles, Moon, Sun, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { dark, toggle } = useTheme()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Signed in successfully')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDemo = async (role) => {
    const dEmail = role === 'admin' ? 'admin@college.edu' : 'faculty@college.edu';
    const dPass = 'admin123';
    setEmail(dEmail);
    setPassword(dPass);
    try {
      setLoading(true);
      await login(dEmail, dPass);
      toast.success('Demonstration access granted');
    } catch (err) {
      toast.error('Demo login failed');
    } finally {
      if (window.location.pathname === '/login') {
        setLoading(false);
      }
    }
  }

  return (
    <div className="login-shell">
      <div className="login-showcase hidden lg:flex">
        <div className="login-showcase-bg"></div>
        <div className="login-showcase-content">
          <h1 className="login-showcase-title">Campus Attendance,<br/>Automated.</h1>
          <p className="login-showcase-desc">
            SmartAttend provides institutions with a rigorous, biometric-backed attendance management portal. Secure, verifiable, and seamlessly integrated.
          </p>
          
          <div className="login-features">
            <div className="login-feature">
              <div className="login-feature-icon"><UserCheck size={24} color="#fff" /></div>
              <div>
                <h3 className="login-feature-title">Live Biometric Scanning</h3>
                <p className="login-feature-desc">Frictionless classroom attendance using MTCNN and ArcFace deep learning models.</p>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon"><ShieldCheck size={24} color="#fff" /></div>
              <div>
                <h3 className="login-feature-title">Anti-Spoofing & Liveness</h3>
                <p className="login-feature-desc">Active depth and liveness confirmation powered by EfficientNetB0 prevents presentation attacks.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="login-panel">
        <button onClick={toggle} className="btn-icon" style={{ position: 'absolute', top: 32, right: 32 }} title="Toggle Theme">
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        <div className="login-form-wrap">
          <div className="login-logo-block">
            <div className="login-logo"><Lock size={28} color="#fff" /></div>
            <h2 className="login-brand">Sign In</h2>
            <p className="login-tagline">Enter your credentials to access the portal</p>
          </div>

          <form onSubmit={handleLogin} className="form-stack">
            <div>
              <label className="field-label">Institutional Email</label>
              <input 
                type="email" required 
                value={email} onChange={e => setEmail(e.target.value)}
                className="input" 
                placeholder="faculty@college.edu" 
              />
            </div>
            
            <div>
              <label className="field-label">Password</label>
              <input 
                  type="password" required 
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="input" 
                  placeholder="********" 
                />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '12px' }}>
              {loading ? <Loader2 className="spinner" size={18} /> : 'Access Portal'}
            </button>
          </form>

          <div style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginBottom: 16 }}>Demonstration Access</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button onClick={() => handleDemo('admin')} className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                Admin Demo
              </button>
              <button onClick={() => handleDemo('faculty')} className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                Faculty Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
