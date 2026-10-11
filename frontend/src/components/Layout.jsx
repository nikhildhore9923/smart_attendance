import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSubject } from '../context/SubjectContext'
import { useTheme } from '../context/ThemeContext'
import useMediaQuery from '../hooks/useMediaQuery'
import SubjectSelect from './SubjectSelect'
import {
  LayoutDashboard, BookOpen, Video, Users, UserPlus, BarChart3,
  ClipboardList, Settings, LogOut, GraduationCap, Menu, X,
  ChevronRight, Sparkles, Sun, Moon
} from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { getStats } from '../lib/api'

const NAV = [
  { section: 'Main', roles: ['ADMIN', 'FACULTY', 'STUDENT'] },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'FACULTY', 'STUDENT'] },
  
  { section: 'Attendance', roles: ['FACULTY', 'ADMIN'] },
  { to: '/live',      icon: Video,           label: 'Live Recognition', dot: 'green', roles: ['FACULTY'] },
  { to: '/log',       icon: ClipboardList,   label: 'Attendance Log', roles: ['FACULTY', 'ADMIN'] },
  
  { section: 'Students', roles: ['ADMIN', 'FACULTY'] },
  { to: '/students',  icon: Users,           label: 'All Students', roles: ['ADMIN', 'FACULTY'] },
  { to: '/enroll',    icon: UserPlus,        label: 'Enroll Student', roles: ['ADMIN', 'FACULTY'] },
  
  { section: 'Academics', roles: ['ADMIN'] },
  { to: '/classes',   icon: BookOpen,        label: 'Academic Setup', roles: ['ADMIN'] },
  { to: '/faculty',   icon: GraduationCap,   label: 'Faculty & Allocation', roles: ['ADMIN'] },
  
  { section: 'Analytics', roles: ['ADMIN', 'FACULTY'] },
  { to: '/reports',   icon: BarChart3,       label: 'Reports', roles: ['ADMIN', 'FACULTY'] },
  
  { section: 'System', roles: ['ADMIN', 'FACULTY'] },
  { to: '/settings',  icon: Settings,        label: 'Settings & Profile', roles: ['ADMIN', 'FACULTY'] },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const { subject } = useSubject()
  const navigate  = useNavigate()
  const location  = useLocation()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [open,    setOpen]    = useState(false)
  const [stats,   setStats]   = useState(null)
  const [time,    setTime]    = useState(new Date())

  useEffect(() => {
    getStats().then(r => setStats(r.data)).catch(() => {})
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [location.pathname, subject])

  useEffect(() => {
    if (isDesktop) setOpen(false)
  }, [isDesktop])

  const pageTitle = NAV.find(n => n.to === location.pathname)?.label || 'SmartAttend'

  return (
    <div className="app-shell">
      {open && !isDesktop && (
        <div className="sidebar-overlay" onClick={() => setOpen(false)} />
      )}

      <aside className={clsx('sidebar', open || isDesktop ? 'sidebar-open' : 'sidebar-closed')}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <GraduationCap size={20} color="#fff" />
          </div>
          <div className="sidebar-brand-text">
            <p className="sidebar-brand-name">SmartAttend</p>
            <p className="sidebar-brand-tag">AI Attendance ERP</p>
          </div>
          {!isDesktop && (
            <button className="btn-icon" onClick={() => setOpen(false)} style={{ color: '#fff' }}>
              <X size={16} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav sidebar-scroll">
          {NAV.map((item, i) => {
            // Role-based filtering
            if (item.roles && user && !item.roles.includes(user.role)) return null;

            if (item.section) {
              return <div key={'sec'+i} className="sidebar-section">{item.section}</div>
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({isActive}) => clsx('sidebar-link', isActive && 'active')}
                onClick={() => setOpen(false)}
              >
                <item.icon size={17} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.dot === 'green' && <span className="pulse-dot" style={{ width: 6, height: 6 }} />}
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div 
            className="sidebar-user" 
            onClick={() => navigate('/settings')}
            style={{ cursor: 'pointer', padding: '6px', borderRadius: '8px', transition: 'background 0.15s ease' }}
            title="Click to view full Account Profile"
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div className="sidebar-user-avatar">
              {(user?.full_name || user?.email || 'A')[0].toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{user?.full_name || user?.email}</p>
              <p className="sidebar-user-role">
                {user?.role === 'ADMIN' || user?.is_admin ? 'Administrator' : user?.role === 'FACULTY' ? 'Faculty' : 'Student'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="sidebar-link sidebar-logout"
          >
            <LogOut size={15} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="btn-icon mobile-menu-btn" onClick={() => setOpen(o => !o)}>
            <Menu size={18} />
          </button>

          <div className="topbar-breadcrumb">
            <Sparkles size={14} style={{ color: 'var(--primary)' }} />
            <span className="breadcrumb-root">SmartAttend</span>
            <ChevronRight size={12} className="text-muted-icon" />
            <span className="breadcrumb-current">{pageTitle}</span>
          </div>

          <div className="topbar-subject" style={{ marginLeft: 'auto' }}>
            <SubjectSelect compact />
          </div>

          <div className="topbar-clock">
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>

          <div className="topbar-date">
            {time.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>

          <div className="topbar-live">
            <span className="pulse-dot" />
            <span className="topbar-live-text">LIVE</span>
          </div>

          <button 
            className="btn-icon theme-toggle" 
            onClick={toggle} 
            title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{ 
              background: 'var(--surface2)', 
              border: '1px solid var(--border)', 
              cursor: 'pointer', 
              padding: '6px',
              borderRadius: '8px',
              display: 'flex', 
              alignItems: 'center' 
            }}
          >
            {dark ? <Sun size={17} style={{ color: '#FBBF24' }} /> : <Moon size={17} style={{ color: 'var(--muted)' }} />}
          </button>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
