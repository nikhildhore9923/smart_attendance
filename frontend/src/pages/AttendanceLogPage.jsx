import { useEffect, useState } from 'react'
import { Search, Download, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import api, { getFullLog } from '../lib/api'
import { useSubject } from '../context/SubjectContext'
import toast from 'react-hot-toast'

const pctColor = p => p >= 80 ? 'conf-high' : p >= 50 ? 'conf-mid' : 'conf-low'

export default function AttendanceLogPage() {
  const { subjects } = useSubject()
  const [data,    setData]    = useState({ data: [], total: 0 })
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [from,    setFrom]    = useState('')
  const [to,      setTo]      = useState('')
  const [subject, setSubject] = useState('All')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const PAGE = 25

  const load = async () => {
    setLoading(true)
    try {
      const r = await getFullLog({
        page, 
        page_size: PAGE,
        ...(search && { search }),
        ...(from   && { date_from: from }),
        ...(to     && { date_to: to }),
        ...(subject !== 'All' && { subject }),
      })
      setData(r.data)
    } catch (err) {
      console.error('Failed to load attendance logs:', err)
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { 
    load() 
  }, [page, search, from, to, subject])

  const handleExportCSV = async () => {
    try {
      setExporting(true)
      const res = await api.get('/attendance/export/csv', {
        params: {
          ...(from && { fromDate: from }),
          ...(to && { toDate: to }),
          ...(subject !== 'All' && { subjectId: subject })
        },
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `attendance_log_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      toast.error('Failed to export CSV report')
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(data.total / PAGE)

  const Pg = ({ n }) => (
    <button onClick={() => setPage(n)}
      style={{ minWidth: 30, height: 28, borderRadius: 6, border: `1px solid ${page === n ? 'var(--accent)' : 'var(--border)'}`, background: page === n ? 'rgba(59,130,246,0.15)' : 'transparent', color: page === n ? 'var(--accent2)' : 'var(--muted2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 150ms' }}>
      {n}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Attendance Log</h1>
          <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>{data.total} records total</p>
        </div>
        <button 
          className="btn btn-secondary" 
          style={{ fontSize: 12 }} 
          onClick={handleExportCSV}
          disabled={exporting || data.total === 0}
        >
          <Download size={13} /> {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input 
            className="input" 
            style={{ paddingLeft: 32, fontSize: 13 }} 
            placeholder="Search name or roll number..."
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(1) }} 
          />
        </div>
        <select 
          className="select" 
          style={{ width: 'auto', minWidth: '280px', fontSize: 13 }} 
          value={subject} 
          onChange={e => { setSubject(e.target.value); setPage(1) }}
        >
          <option value="All">All Subjects & Divisions</option>
          {subjects.map(s => {
            const classInfo = s.classes && s.classes.length > 0
              ? s.classes.map(c => `Div ${c.name}`).join(', ')
              : (s.class?.name ? `Div ${s.class.name}` : '');
            const semInfo = s.academicSem?.number ? `Sem ${s.academicSem.number}` : '';
            const details = [classInfo, semInfo, s.code].filter(Boolean).join(' • ');
            return (
              <option key={s.id} value={s.id}>
                {s.name} {details ? `(${details})` : ''}
              </option>
            );
          })}
        </select>
        <input 
          type="date" 
          className="input" 
          style={{ width: 'auto', fontSize: 12 }} 
          value={from} 
          onChange={e => { setFrom(e.target.value); setPage(1) }} 
        />
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>to</span>
        <input 
          type="date" 
          className="input" 
          style={{ width: 'auto', fontSize: 12 }} 
          value={to} 
          onChange={e => { setTo(e.target.value); setPage(1) }} 
        />
        {(search || from || to || subject !== 'All') && (
          <button 
            className="btn btn-ghost" 
            style={{ fontSize: 12 }} 
            onClick={() => { setSearch(''); setFrom(''); setTo(''); setSubject('All'); setPage(1) }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Roll No</th>
                <th>Date</th>
                <th>Time</th>
                <th>Confidence</th>
                <th>Subject</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 50 }}>
                    <div style={{ width: 24, height: 24, border: '3px solid rgba(59,130,246,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  </td>
                </tr>
              ) : data.data.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: 13 }}>
                    No records found
                  </td>
                </tr>
              ) : data.data.map((r, i) => (
                <tr key={i} className="table-row">
                  <td>{(page - 1) * PAGE + i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#60a5fa', flexShrink: 0 }}>
                        {r.name?.[0] || 'S'}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-blue">{r.roll_no}</span></td>
                  <td>{r.date}</td>
                  <td>{r.time}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div className="progress-bar" style={{ width: 50, height: 5 }}>
                        <div className={`progress-fill ${pctColor(r.confidence)}`} style={{ width: `${r.confidence}%` }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--muted2)', minWidth: 30 }}>{r.confidence?.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td><span className="badge badge-cyan" style={{ fontSize: 11 }}>{r.subject}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {page} of {totalPages} • {data.total} records</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button className="btn-icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={13} /></button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const pg = Math.max(1, Math.min(page - 3, totalPages - 6)) + i
                if (pg < 1 || pg > totalPages) return null
                return <Pg key={pg} n={pg} />
              })}
              <button className="btn-icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={13} /></button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
