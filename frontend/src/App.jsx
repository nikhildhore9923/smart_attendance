import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SubjectProvider } from './context/SubjectContext'
import { ThemeProvider } from './context/ThemeContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import { LoadingScreen } from './components/LoadingSpinner'
import LoginPage         from './pages/LoginPage'
import DashboardPage     from './pages/DashboardPage'
import LivePage          from './pages/LivePage'
import StudentsPage      from './pages/StudentsPage'
import EnrollPage        from './pages/EnrollPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import ReportsPage       from './pages/ReportsPage'
import AttendanceLogPage from './pages/AttendanceLogPage'
import SettingsPage      from './pages/SettingsPage'
import ClassesPage       from './pages/ClassesPage'
import SubjectsPage      from './pages/SubjectsPage'
import FacultyPage       from './pages/FacultyPage'

function Guard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen message="Starting SmartAttend..." />
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ConfirmProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                fontSize: '13.5px',
                padding: '12px 16px',
                boxShadow: 'var(--shadow-md)',
              },
              success: { iconTheme: { primary: 'var(--success)', secondary: 'rgba(16,185,129,0.1)' } },
              error:   { iconTheme: { primary: 'var(--danger)', secondary: 'rgba(239,68,68,0.1)' } },
            }}
          />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Guard><SubjectProvider><Layout /></SubjectProvider></Guard>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"  element={<DashboardPage />} />
              <Route path="live"       element={<LivePage />} />
              <Route path="students"   element={<StudentsPage />} />
              <Route path="classes"    element={<ClassesPage />} />
              <Route path="subjects"   element={<SubjectsPage />} />
              <Route path="faculty"    element={<FacultyPage />} />
              <Route path="enroll"     element={<ErrorBoundary><EnrollPage /></ErrorBoundary>} />
              <Route path="reports"    element={<ReportsPage />} />
              <Route path="log"        element={<AttendanceLogPage />} />
              <Route path="settings"   element={<SettingsPage />} />
            </Route>
          </Routes>
        </ConfirmProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
