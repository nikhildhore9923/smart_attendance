const fs = require('fs');

// Layout.jsx Redesign
let layout = fs.readFileSync('frontend/src/components/Layout.jsx', 'utf8');

// Strip out the old purple/violet glow themes and replace with the solid app-shell classes
layout = layout.replace(
  /<div className="min-h-screen bg-bg text-text flex overflow-hidden">/, 
  '<div className="app-shell">'
);

// Sidebar update
layout = layout.replace(
  /<aside\s+className=\{clsx\([\s\S]*?<div className="p-6 flex items-center justify-between border-b border-border\/50">/,
  `<aside className={clsx("sidebar", sidebarOpen ? "sidebar-open" : "sidebar-closed", "md:sidebar-open md:translate-x-0 fixed md:relative")}>
        <div className="sidebar-brand">`
);

layout = layout.replace(
  /<div className="w-8 h-8 rounded bg-gradient-to-br from-accent to-purple flex items-center justify-center shadow-lg shadow-accent\/20">/,
  '<div className="sidebar-logo">'
);

layout = layout.replace(
  /<span className="ml-3 font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text to-text2">SmartAttend<\/span>/,
  '<div className="sidebar-brand-text"><div className="sidebar-brand-name">SmartAttend</div></div>'
);

layout = layout.replace(
  /<button onClick=\{\(\) => setSidebarOpen\(false\)\} className="md:hidden text-muted hover:text-text transition-colors">[\s\S]*?<\/button>/,
  '<button onClick={() => setSidebarOpen(false)} className="md:hidden text-white opacity-70 hover:opacity-100 transition-opacity"><X size={20} /></button>'
);

layout = layout.replace(
  /<nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">/,
  '<nav className="sidebar-scroll">'
);

layout = layout.replace(
  /className=\{clsx\(\s*'flex items-center px-3 py-2\.5 rounded-lg transition-all duration-200 group relative',[\s\S]*?\)\}/g,
  `className={({ isActive }) => clsx("sidebar-link", isActive && "active")}`
);

// Fix the active link render logic since we just replaced the className function
layout = layout.replace(
  /\{isActive => \([\s\S]*?<span className="ml-3 font-medium text-sm">\{item\.label\}<\/span>[\s\S]*?<\/div>[\s\S]*?\)\}/g,
  `
    <>
      <item.icon size={18} />
      <span>{item.label}</span>
      {item.dot && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s infinite' }} />}
    </>
  `
);

// Topbar update
layout = layout.replace(
  /<header className="h-16 border-b border-border\/50 bg-surface\/50 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 z-10">/,
  '<header className="topbar">'
);

layout = layout.replace(
  /<main className="flex-1 overflow-y-auto relative p-4 lg:p-8">/,
  '<main className="main-content">'
);

fs.writeFileSync('frontend/src/components/Layout.jsx', layout);

// LoginPage.jsx Redesign
let login = fs.readFileSync('frontend/src/pages/LoginPage.jsx', 'utf8');
const newLogin = `import { useState } from 'react'
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

  const handleDemo = (role) => {
    if (role === 'admin') {
      setEmail('admin@college.edu')
      setPassword('admin123')
    } else {
      setEmail('faculty@college.edu')
      setPassword('faculty123')
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
                placeholder="••••••••" 
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
`;
fs.writeFileSync('frontend/src/pages/LoginPage.jsx', newLogin);
console.log('Layout.jsx and LoginPage.jsx updated');
