import { useEffect, useState, useMemo } from 'react'
import { 
  Search, Download, ChevronLeft, ChevronRight, Calendar, 
  Users, BookOpen, Clock, ShieldCheck, ChevronDown, ChevronUp, 
  CheckCircle2, User, FileSpreadsheet, FileText, Layers, RefreshCw, X 
} from 'lucide-react'
import api, { getFullLog, exportCSV, exportPDF, getClasses } from '../lib/api'
import { useSubject } from '../context/SubjectContext'
import toast from 'react-hot-toast'

const pctColor = p => p >= 80 ? 'conf-high' : p >= 60 ? 'conf-mid' : 'conf-low'

export default function AttendanceLogPage() {
  const { subjects } = useSubject()
  const [classes, setClasses] = useState([])
  const [rawRecords, setRawRecords] = useState([])
  const [paginatedData, setPaginatedData] = useState([])
  const [totalCount, setTotalCount] = useState(0)

  // View mode: 'sessions' (By Lecture Session), 'students' (Student-wise Master Roster), 'events' (Chronological Stream)
  const [viewMode, setViewMode] = useState('sessions')
  
  // Filters
  const [search, setSearch] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [selectedDivision, setSelectedDivision] = useState('All')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  
  // Loading & Export state
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(null) // 'csv' | 'pdf' | null

  // Expandable state for session cards and student rows
  const [expandedSessions, setExpandedSessions] = useState({})
  const [expandedStudents, setExpandedStudents] = useState({})

  const PAGE_SIZE = 25

  // Load available academic classes/divisions for filter
  useEffect(() => {
    getClasses()
      .then(res => setClasses(res.data || []))
      .catch(err => console.error('Failed to load classes for log filter:', err))
  }, [])

  // Fetch attendance records matching filters
  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getFullLog({
        page,
        page_size: PAGE_SIZE,
        ...(search && { search }),
        ...(selectedSubject !== 'All' && { subject: selectedSubject }),
        ...(selectedDivision !== 'All' && { classId: selectedDivision }),
        ...(from && { date_from: from }),
        ...(to && { date_to: to }),
      })
      
      const resData = res.data || {}
      setPaginatedData(resData.data || [])
      setTotalCount(resData.total || 0)
      setRawRecords(resData.all || [])

      // Auto-expand the first session if any exist
      if (resData.all && resData.all.length > 0) {
        const firstSessionId = resData.all[0].sessionId || 'first'
        setExpandedSessions(prev => ({ [firstSessionId]: true, ...prev }))
      }
    } catch (err) {
      console.error('Failed to load attendance logs:', err)
      toast.error('Failed to load attendance records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page, search, selectedSubject, selectedDivision, from, to])

  // Reset page when filters change
  const handleFilterChange = (setter, val) => {
    setter(val)
    setPage(1)
  }

  const clearAllFilters = () => {
    setSearch('')
    setSelectedSubject('All')
    setSelectedDivision('All')
    setFrom('')
    setTo('')
    setPage(1)
  }

  // 1. Group by Lecture Session (Zero student repetition per session)
  const sessionGroups = useMemo(() => {
    const map = new Map()
    rawRecords.forEach(r => {
      const key = r.sessionId || `${r.date}_${r.subjectId || 'sess'}`
      if (!map.has(key)) {
        map.set(key, {
          sessionId: r.sessionId,
          key,
          date: r.date,
          subject: r.subject || 'Course',
          subjectCode: r.subjectCode || '',
          facultyName: r.facultyName || 'Faculty',
          className: r.class || 'All Divisions',
          sessionStartTime: r.sessionStartTime,
          sessionStatus: r.sessionStatus || 'COMPLETED',
          records: []
        })
      }
      const group = map.get(key)
      // Prevent duplicate student in same session
      if (!group.records.some(existing => existing.studentId === r.studentId)) {
        group.records.push(r)
      }
    })

    return Array.from(map.values()).sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [rawRecords])

  // 2. Group by Student (Unique row per student, aggregated stats & expandable history)
  const studentSummaries = useMemo(() => {
    const map = new Map()
    const totalDistinctSessions = new Set(rawRecords.map(r => r.sessionId || `${r.date}_${r.subjectId}`)).size

    rawRecords.forEach(r => {
      const key = r.studentId || r.roll_no || r.name
      if (!map.has(key)) {
        map.set(key, {
          studentId: r.studentId,
          name: r.name,
          roll_no: r.roll_no,
          email: r.email,
          className: r.class,
          sessionsAttended: 0,
          totalSessions: totalDistinctSessions,
          lastAttendedDate: r.date,
          lastAttendedTime: r.time,
          lastAttendedSubject: r.subject,
          records: []
        })
      }
      const st = map.get(key)
      // Only count each distinct session once per student
      if (!st.records.some(existing => existing.sessionId && existing.sessionId === r.sessionId)) {
        st.sessionsAttended += 1
        st.records.push(r)
        // Check latest time
        const currentRecDate = new Date(`${r.date}T${r.time || '00:00:00'}`)
        const prevRecDate = new Date(`${st.lastAttendedDate}T${st.lastAttendedTime || '00:00:00'}`)
        if (currentRecDate >= prevRecDate) {
          st.lastAttendedDate = r.date
          st.lastAttendedTime = r.time
          st.lastAttendedSubject = r.subject
        }
      }
    })

    return Array.from(map.values()).map(st => {
      const pct = st.totalSessions > 0 ? (st.sessionsAttended / st.totalSessions) * 100 : 100
      return {
        ...st,
        percentage: pct
      }
    }).sort((a, b) => (a.roll_no || '').localeCompare(b.roll_no || '', undefined, { numeric: true }))
  }, [rawRecords])

  // High-level KPI metrics for the current filtered scope
  const stats = useMemo(() => {
    const uniqueStudents = new Set(rawRecords.map(r => r.studentId || r.roll_no)).size
    const uniqueSessions = new Set(rawRecords.map(r => r.sessionId || `${r.date}_${r.subjectId}`)).size
    const totalRecords = rawRecords.length
    const avgConfidence = totalRecords > 0
      ? (rawRecords.reduce((acc, curr) => acc + (curr.confidence || 0), 0) / totalRecords).toFixed(1)
      : '0'
    return { uniqueStudents, uniqueSessions, totalRecords, avgConfidence }
  }, [rawRecords])

  // Handle Export CSV
  const handleExportCSV = async () => {
    try {
      setExporting('csv')
      const params = {
        ...(from && { fromDate: from }),
        ...(to && { toDate: to }),
        ...(selectedSubject !== 'All' && { subjectId: selectedSubject }),
        ...(selectedDivision !== 'All' && { classId: selectedDivision }),
      }
      const res = await exportCSV(params)
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `SmartAttend_Attendance_Register_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Attendance CSV register downloaded!')
    } catch (err) {
      console.error('CSV export failed:', err)
      toast.error('Failed to export CSV register')
    } finally {
      setExporting(null)
    }
  }

  // Handle Export Official PDF Report
  const handleExportPDF = async () => {
    try {
      setExporting('pdf')
      const params = {
        ...(from && { fromDate: from }),
        ...(to && { toDate: to }),
        ...(selectedSubject !== 'All' && { subjectId: selectedSubject }),
        ...(selectedDivision !== 'All' && { classId: selectedDivision }),
      }
      const res = await exportPDF(params)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `SmartAttend_Official_Register_${new Date().toISOString().split('T')[0]}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Official institutional PDF report generated!')
    } catch (err) {
      console.error('PDF export failed:', err)
      toast.error('Failed to export PDF report')
    } finally {
      setExporting(null)
    }
  }

  const toggleSession = (id) => {
    setExpandedSessions(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleStudent = (id) => {
    setExpandedStudents(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const isFilterActive = search || selectedSubject !== 'All' || selectedDivision !== 'All' || from || to

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 23, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Attendance Log & Registers
            </h1>
            <span className="badge badge-blue" style={{ fontSize: 11, fontWeight: 700 }}>
              Official Academic Records
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            Organized muster rolls, per-lecture registers, student rosters, and audit logs.
          </p>
        </div>

        {/* Dual Export Actions */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            style={{ fontSize: 12.5, fontWeight: 600, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }} 
            onClick={handleExportCSV}
            disabled={exporting !== null || stats.totalRecords === 0}
            title="Download complete structured CSV dataset for spreadsheets"
          >
            <FileSpreadsheet size={15} style={{ color: '#10b981' }} />
            {exporting === 'csv' ? 'Exporting...' : 'Export CSV'}
          </button>
          <button 
            className="btn btn-primary" 
            style={{ fontSize: 12.5, fontWeight: 600, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }} 
            onClick={handleExportPDF}
            disabled={exporting !== null || stats.totalRecords === 0}
            title="Generate verified college-format PDF attendance sheet"
          >
            <FileText size={15} />
            {exporting === 'pdf' ? 'Generating PDF...' : 'Export Official PDF'}
          </button>
        </div>
      </div>

      {/* KPI Insight Chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Attendance Records
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 1 }}>
              {stats.totalRecords}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Unique Students
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 1 }}>
              {stats.uniqueStudents}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Conducted Lectures
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 1 }}>
              {stats.uniqueSessions}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Avg AI Confidence
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 1 }}>
              {stats.avgConfidence}%
            </div>
          </div>
        </div>
      </div>

      {/* View Classification Mode Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 6, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setViewMode('sessions')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              border: 'none',
              background: viewMode === 'sessions' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'sessions' ? '#ffffff' : 'var(--muted)',
              transition: 'all 150ms ease'
            }}
          >
            <BookOpen size={14} />
            <span>By Lecture Session</span>
            <span style={{ fontSize: 11, background: viewMode === 'sessions' ? 'rgba(255,255,255,0.25)' : 'var(--surface2)', color: viewMode === 'sessions' ? '#fff' : 'var(--text)', padding: '2px 7px', borderRadius: 999 }}>
              {sessionGroups.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode('students')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              border: 'none',
              background: viewMode === 'students' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'students' ? '#ffffff' : 'var(--muted)',
              transition: 'all 150ms ease'
            }}
          >
            <Users size={14} />
            <span>Student-Wise Summary</span>
            <span style={{ fontSize: 11, background: viewMode === 'students' ? 'rgba(255,255,255,0.25)' : 'var(--surface2)', color: viewMode === 'students' ? '#fff' : 'var(--text)', padding: '2px 7px', borderRadius: 999 }}>
              {studentSummaries.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode('events')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              border: 'none',
              background: viewMode === 'events' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'events' ? '#ffffff' : 'var(--muted)',
              transition: 'all 150ms ease'
            }}
          >
            <Clock size={14} />
            <span>Chronological Feed</span>
            <span style={{ fontSize: 11, background: viewMode === 'events' ? 'rgba(255,255,255,0.25)' : 'var(--surface2)', color: viewMode === 'events' ? '#fff' : 'var(--text)', padding: '2px 7px', borderRadius: 999 }}>
              {stats.totalRecords}
            </span>
          </button>
        </div>

        {viewMode === 'sessions' && sessionGroups.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => {
                const all = {}
                sessionGroups.forEach(s => { all[s.sessionId || s.key] = true })
                setExpandedSessions(all)
              }}
            >
              Expand All
            </button>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => setExpandedSessions({})}
            >
              Collapse All
            </button>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input 
            className="input" 
            style={{ paddingLeft: 32, fontSize: 13 }} 
            placeholder="Search by student name, roll no, or email..."
            value={search} 
            onChange={e => handleFilterChange(setSearch, e.target.value)} 
          />
        </div>

        {/* Course / Subject Filter */}
        <select 
          className="select" 
          style={{ width: 'auto', minWidth: '220px', fontSize: 12.5 }} 
          value={selectedSubject} 
          onChange={e => handleFilterChange(setSelectedSubject, e.target.value)}
        >
          <option value="All">All Courses / Subjects</option>
          {subjects.map(s => {
            const code = s.code ? ` (${s.code})` : ''
            return (
              <option key={s.id} value={s.id}>
                {s.name}{code}
              </option>
            )
          })}
        </select>

        {/* Division Filter */}
        <select 
          className="select" 
          style={{ width: 'auto', minWidth: '160px', fontSize: 12.5 }} 
          value={selectedDivision} 
          onChange={e => handleFilterChange(setSelectedDivision, e.target.value)}
        >
          <option value="All">All Divisions</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Date From & To */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input 
            type="date" 
            className="input" 
            style={{ width: 'auto', fontSize: 12, padding: '6px 10px' }} 
            value={from} 
            title="From Date"
            onChange={e => handleFilterChange(setFrom, e.target.value)} 
          />
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>to</span>
          <input 
            type="date" 
            className="input" 
            style={{ width: 'auto', fontSize: 12, padding: '6px 10px' }} 
            value={to} 
            title="To Date"
            onChange={e => handleFilterChange(setTo, e.target.value)} 
          />
        </div>

        {isFilterActive && (
          <button 
            className="btn btn-ghost" 
            style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }} 
            onClick={clearAllFilters}
          >
            <X size={13} /> Clear filters
          </button>
        )}
      </div>

      {/* Main Content Area Based on Active View Mode */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 28, height: 28, border: '3px solid rgba(5,150,105,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
            Loading attendance records...
          </div>
        </div>
      ) : rawRecords.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Calendar size={36} style={{ margin: '0 auto 12px', color: 'var(--muted2)' }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            No Attendance Records Found
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {isFilterActive ? 'Try adjusting your search criteria, course, division, or date range filters.' : 'No lectures or attendance punches have been recorded yet.'}
          </div>
          {isFilterActive && (
            <button className="btn btn-secondary" style={{ marginTop: 14, fontSize: 12.5 }} onClick={clearAllFilters}>
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* VIEW 1: BY LECTURE SESSION (Zero Student Duplication within Session) */}
          {viewMode === 'sessions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sessionGroups.map((session, sIdx) => {
                const sid = session.sessionId || session.key
                const isExpanded = !!expandedSessions[sid]
                const presentCount = session.records.length

                return (
                  <div key={sid} className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {/* Session Header Card Banner */}
                    <div 
                      onClick={() => toggleSession(sid)}
                      style={{ 
                        padding: '14px 18px', 
                        background: 'var(--surface2)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        userSelect: 'none',
                        borderBottom: isExpanded ? '1px solid var(--border)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: 13 }}>
                          #{sIdx + 1}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                              {session.subject}
                            </span>
                            {session.subjectCode && (
                              <span className="badge badge-cyan" style={{ fontSize: 11 }}>
                                {session.subjectCode}
                              </span>
                            )}
                            <span className="badge badge-blue" style={{ fontSize: 11 }}>
                              {session.className}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 3, fontSize: 12, color: 'var(--muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <User size={12} /> {session.facultyName}
                            </span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Calendar size={12} /> {session.date}
                            </span>
                            {session.sessionStartTime && (
                              <>
                                <span>•</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Clock size={12} /> {session.sessionStartTime}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ textAlign: 'right' }}>
                          <span className="badge badge-green" style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px' }}>
                            {presentCount} Present
                          </span>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            0 Duplicates
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp size={18} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--muted)' }} />}
                      </div>
                    </div>

                    {/* Collapsible Session Register Table */}
                    {isExpanded && (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ margin: 0 }}>
                          <thead>
                            <tr style={{ background: 'var(--surface)' }}>
                              <th style={{ width: 45 }}>#</th>
                              <th>Roll No</th>
                              <th>Student Name</th>
                              <th>Division</th>
                              <th>Marked Time</th>
                              <th>AI Biometrics</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {session.records.map((r, rIdx) => (
                              <tr key={r.id || rIdx} className="table-row">
                                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{rIdx + 1}</td>
                                <td>
                                  <span className="badge badge-blue" style={{ fontWeight: 700 }}>
                                    {r.roll_no}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
                                      {r.name?.[0] || 'S'}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                                        {r.name}
                                      </div>
                                      {r.email && (
                                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                          {r.email}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontSize: 12, color: 'var(--muted2)' }}>{r.class}</span>
                                </td>
                                <td>
                                  <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>{r.time}</span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div className="progress-bar" style={{ width: 44, height: 5 }}>
                                      <div className={`progress-fill ${pctColor(r.confidence)}`} style={{ width: `${r.confidence}%` }} />
                                    </div>
                                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>
                                      {r.confidence?.toFixed(0)}%
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <span className="badge badge-green" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <CheckCircle2 size={11} /> {r.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* VIEW 2: STUDENT-WISE MASTER ROSTER (Each Student Appears ONCE) */}
          {viewMode === 'students' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 45 }}>#</th>
                      <th>Student</th>
                      <th>Roll No</th>
                      <th>Division</th>
                      <th>Attended Lectures</th>
                      <th>Attendance Rate</th>
                      <th>Last Marked Lecture</th>
                      <th style={{ textAlign: 'center' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentSummaries.map((st, i) => {
                      const isExpanded = !!expandedStudents[st.studentId || st.roll_no]
                      const isGood = st.percentage >= 75

                      return (
                        <>
                          <tr key={st.studentId || i} className="table-row">
                            <td style={{ color: 'var(--muted)', fontSize: 12 }}>{i + 1}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                                  {st.name?.[0] || 'S'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>
                                    {st.name}
                                  </div>
                                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                                    {st.email || 'Student'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-blue" style={{ fontSize: 12, fontWeight: 700 }}>
                                {st.roll_no}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: 12, color: 'var(--muted2)' }}>{st.className}</span>
                            </td>
                            <td>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                                {st.sessionsAttended}
                              </span>
                              <span style={{ fontSize: 11.5, color: 'var(--muted)', marginLeft: 3 }}>
                                / {st.totalSessions} lectures
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className="progress-bar" style={{ width: 55, height: 6 }}>
                                  <div 
                                    className="progress-fill" 
                                    style={{ 
                                      width: `${Math.min(100, st.percentage)}%`, 
                                      background: isGood ? 'var(--success)' : 'var(--danger)' 
                                    }} 
                                  />
                                </div>
                                <span className={`badge ${isGood ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 11, fontWeight: 700 }}>
                                  {st.percentage.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                                {st.lastAttendedSubject}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                {st.lastAttendedDate} at {st.lastAttendedTime}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                className="btn btn-ghost" 
                                style={{ fontSize: 11.5, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                onClick={() => toggleStudent(st.studentId || st.roll_no)}
                              >
                                {isExpanded ? 'Hide' : 'Breakdown'}
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                            </td>
                          </tr>

                          {/* Accordion breakdown for this specific student */}
                          {isExpanded && (
                            <tr style={{ background: 'var(--surface2)' }}>
                              <td colSpan={8} style={{ padding: '12px 24px' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Clock size={13} style={{ color: 'var(--primary)' }} />
                                  Lectures Attended by {st.name} ({st.records.length} records):
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                                  {st.records.map((r, rIndex) => (
                                    <div 
                                      key={r.id || rIndex} 
                                      style={{ 
                                        padding: '9px 12px', 
                                        borderRadius: 8, 
                                        background: 'var(--surface)', 
                                        border: '1px solid var(--border)',
                                        fontSize: 12 
                                      }}
                                    >
                                      <div style={{ fontWeight: 600, color: 'var(--text)', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{r.subject}</span>
                                        <span className="badge badge-green" style={{ fontSize: 10 }}>{r.status}</span>
                                      </div>
                                      <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 3, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{r.date} • {r.time}</span>
                                        <span>AI: {r.confidence?.toFixed(0)}%</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 3: CHRONOLOGICAL DETAILED EVENT LOG */}
          {viewMode === 'events' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 45 }}>#</th>
                      <th>Student</th>
                      <th>Roll No</th>
                      <th>Division</th>
                      <th>Subject / Course</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>AI Confidence</th>
                      <th>Method</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((r, i) => (
                      <tr key={r.id || i} className="table-row">
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                              {r.name?.[0] || 'S'}
                            </div>
                            <div>
                              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{r.name}</span>
                              {r.email && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-blue">{r.roll_no}</span></td>
                        <td><span style={{ fontSize: 12, color: 'var(--muted2)' }}>{r.class}</span></td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text)' }}>{r.subject}</div>
                          {r.subjectCode && <span className="badge badge-cyan" style={{ fontSize: 10 }}>{r.subjectCode}</span>}
                        </td>
                        <td style={{ fontSize: 12 }}>{r.date}</td>
                        <td style={{ fontSize: 12 }}>{r.time}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div className="progress-bar" style={{ width: 44, height: 5 }}>
                              <div className={`progress-fill ${pctColor(r.confidence)}`} style={{ width: `${r.confidence}%` }} />
                            </div>
                            <span style={{ fontSize: 11.5, color: 'var(--muted2)', minWidth: 28 }}>{r.confidence?.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                            {r.method || 'AI Biometrics'}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-green" style={{ fontSize: 11 }}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} records
                  </span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button className="btn-icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft size={13} />
                    </button>
                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                      const pg = Math.max(1, Math.min(page - 3, totalPages - 6)) + i
                      if (pg < 1 || pg > totalPages) return null
                      return (
                        <button
                          key={pg}
                          onClick={() => setPage(pg)}
                          style={{
                            minWidth: 30,
                            height: 28,
                            borderRadius: 6,
                            border: `1px solid ${page === pg ? 'var(--primary)' : 'var(--border)'}`,
                            background: page === pg ? 'rgba(5,150,105,0.15)' : 'transparent',
                            color: page === pg ? 'var(--primary)' : 'var(--muted2)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {pg}
                        </button>
                      )
                    })}
                    <button className="btn-icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
