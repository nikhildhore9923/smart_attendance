import { useState, useEffect } from 'react';
import { 
  getHistory, getSubjects, getClasses, getDivisionMatrix,
  getSessions, deleteSession, exportCSV, exportPDF 
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  Download, Filter, Search, FileText, CheckCircle, XCircle, 
  Trash2, Calendar, User, Clock, Building2, BookOpen, AlertTriangle, 
  Users, BarChart2, CheckCircle2, ShieldAlert
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isFaculty = user?.role === 'FACULTY';

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({ classId: '', subjectId: '', fromDate: '', toDate: '' });
  
  const [matrixData, setMatrixData] = useState(null);
  const [history, setHistory] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'sessions' | 'logs'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    if (filters.classId || filters.subjectId) {
      fetchReportData();
    }
  }, [filters]);

  const loadMetadata = async () => {
    try {
      const [clsRes, subjRes] = await Promise.all([
        getClasses(),
        getSubjects()
      ]);

      const classList = clsRes.data || [];
      const subjList = subjRes.data || [];

      setClasses(classList);
      setSubjects(subjList);

      // Default division: pick B.Tech AIML-B (where active students are) or first available
      let defaultClassId = '';
      if (classList.length > 0) {
        const preferred = classList.find(c => c.name.includes('AIML-B') && c.name.includes('B.Tech')) || classList[0];
        defaultClassId = preferred.id;
      }

      setFilters(prev => ({
        ...prev,
        classId: prev.classId || defaultClassId
      }));

    } catch (err) {
      console.error('Metadata load error:', err);
      toast.error('Failed to load academic setup metadata');
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const query = {};
      if (filters.classId) query.classId = filters.classId;
      if (filters.subjectId) query.subjectId = filters.subjectId;
      if (filters.fromDate) query.fromDate = filters.fromDate;
      if (filters.toDate) query.toDate = filters.toDate;

      const [matRes, sessRes, histRes] = await Promise.all([
        getDivisionMatrix(query),
        getSessions(query),
        getHistory(query)
      ]);

      setMatrixData(matRes.data);
      setSessions(sessRes.data || []);
      setHistory(histRes.data || []);
    } catch (err) {
      console.error('Report fetch error:', err);
      toast.error('Failed to load attendance report data');
    } finally {
      setLoading(false);
    }
  };

  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, title: '', message: '', confirmText: 'Confirm', type: 'danger', onConfirm: null, loading: false 
  });

  const handleDeleteSession = async (sessionId, courseName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Attendance Session?',
      message: `Are you sure you want to delete this session for "${courseName}"? All attendance records associated with this session will be permanently deleted and attendance percentages will be recalculated.`,
      confirmText: 'Delete Session',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteSession(sessionId);
          toast.success('Attendance session deleted successfully');
          fetchReportData();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to delete attendance session');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleExport = async (type) => {
    try {
      const query = {};
      if (filters.classId) query.classId = filters.classId;
      if (filters.subjectId) query.subjectId = filters.subjectId;
      if (filters.fromDate) query.fromDate = filters.fromDate;
      if (filters.toDate) query.toDate = filters.toDate;

      const res = type === 'CSV' ? await exportCSV(query) : await exportPDF(query);
      
      const mimeType = type === 'CSV' ? 'text/csv;charset=utf-8;' : 'application/pdf';
      const blob = new Blob([res.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `smartattend_report_${dateStr}.${type.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      toast.success(`${type} downloaded successfully`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error(`Failed to export ${type}`);
    }
  };

  // Filter students by search term
  const filteredStudents = (matrixData?.students || []).filter(st => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return st.name.toLowerCase().includes(term) || st.rollNumber.toLowerCase().includes(term);
  });

  // Current division subjects
  const divisionSubjects = matrixData?.subjects || [];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Attendance Reports & Analytics</h1>
          <p className="page-desc">
            {isFaculty 
              ? 'Subject-wise attendance percentage and defaulter analysis for your allocated courses.'
              : 'Division-level and subject-wise student attendance matrix with aggregate percentages.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => handleExport('CSV')}>
            <Download size={16} style={{ marginRight: '8px' }} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => handleExport('PDF')}>
            <FileText size={16} style={{ marginRight: '8px' }} /> Export PDF
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ 
        background: 'var(--surface)', 
        padding: '20px', 
        borderRadius: '12px', 
        border: '1px solid var(--border)', 
        marginBottom: '24px', 
        display: 'flex', 
        gap: '16px', 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontWeight: 'bold' }}>
          <Filter size={18} /> FILTERS:
        </div>

        {/* Division Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 220px' }}>
          <Building2 size={16} color="var(--muted)" />
          <select 
            className="input" 
            value={filters.classId} 
            onChange={(e) => setFilters({ ...filters, classId: e.target.value, subjectId: '' })}
            style={{ width: '100%' }}
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                Div {c.name} {c.academicSem?.number ? `(Sem ${c.academicSem.number})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Subject Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 260px' }}>
          <BookOpen size={16} color="var(--muted)" />
          <select 
            className="input" 
            value={filters.subjectId} 
            onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
            style={{ width: '100%' }}
          >
            {isAdmin && <option value="">All Subjects (Division Overview Matrix)</option>}
            {subjects
              .filter(s => {
                if (!filters.classId) return true;
                return s.classes?.some(c => c.id === filters.classId) || s.classId === filters.classId;
              })
              .map(s => {
                const semInfo = s.academicSem?.number ? `Sem ${s.academicSem.number}` : '';
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) {semInfo ? `• ${semInfo}` : ''}
                  </option>
                );
              })}
          </select>
        </div>

        {/* Date Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            type="date" 
            className="input" 
            value={filters.fromDate}
            onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
            title="From Date"
          />
          <span style={{ color: 'var(--muted)' }}>to</span>
          <input 
            type="date" 
            className="input" 
            value={filters.toDate}
            onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
            title="To Date"
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
          Loading attendance analytics...
        </div>
      ) : (
        <>
          {/* Top KPI Cards for Selected Division & Subject */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="table-card" style={{ padding: "20px" }}>
              <p className="field-label">Division Average Attendance</p>
              <h3 style={{ fontSize: "28px", fontWeight: 700, marginTop: 8, color: (matrixData?.summary?.divisionAverage ?? 0) < 75 ? 'var(--danger)' : 'var(--primary)' }}>
                {matrixData?.summary?.divisionAverage ?? 0}%
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                Average across conducted sessions
              </p>
            </div>

            <div className="table-card" style={{ padding: "20px" }}>
              <p className="field-label">Sessions Conducted</p>
              <h3 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text)", marginTop: 8 }}>
                {matrixData?.summary?.totalSessions ?? 0}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                {filters.subjectId ? 'For selected course' : 'Across all division subjects'}
              </p>
            </div>

            <div className="table-card" style={{ padding: "20px" }}>
              <p className="field-label">Enrolled Students</p>
              <h3 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text)", marginTop: 8 }}>
                {matrixData?.summary?.totalEnrolled ?? 0}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                Division {matrixData?.division?.name || ''}
              </p>
            </div>

            <div className="table-card" style={{ padding: "20px" }}>
              <p className="field-label" style={{ color: (matrixData?.summary?.defaulterCount || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                Defaulters (&lt; 75%)
              </p>
              <h3 style={{ fontSize: "28px", fontWeight: 700, marginTop: 8, color: (matrixData?.summary?.defaulterCount || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {matrixData?.summary?.defaulterCount ?? 0}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                Students requiring warning notice
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
            <button
              onClick={() => setActiveTab('matrix')}
              style={{
                padding: '10px 18px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'matrix' ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === 'matrix' ? 'var(--primary)' : 'var(--muted)',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Users size={16} />
              Student Attendance Percentages ({filteredStudents.length})
            </button>

            <button
              onClick={() => setActiveTab('sessions')}
              style={{
                padding: '10px 18px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'sessions' ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === 'sessions' ? 'var(--primary)' : 'var(--muted)',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Calendar size={16} />
              Conducted Sessions ({sessions.length})
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              style={{
                padding: '10px 18px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'logs' ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === 'logs' ? 'var(--primary)' : 'var(--muted)',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Clock size={16} />
              Attendance Scan Logs ({history.length})
            </button>
          </div>

          {/* TAB 1: Student Attendance Matrix */}
          {activeTab === 'matrix' && (
            <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>
                    {filters.subjectId 
                      ? `Subject-wise Attendance: ${subjects.find(s => s.id === filters.subjectId)?.name || 'Course'}`
                      : `Division Attendance Matrix: ${matrixData?.division?.name || 'Division'}`}
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                    {filters.subjectId 
                      ? 'Detailed student attendance percentage for this specific subject.' 
                      : 'Overall average attendance and individual subject-wise attendance percentages for each student.'}
                  </p>
                </div>
                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
                  <input
                    type="text"
                    className="input"
                    placeholder="Search roll or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '32px', width: '100%', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead style={{ background: 'var(--surface2)' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px', width: '100px' }}>ROLL NO</th>
                      <th style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px', minWidth: '180px' }}>STUDENT NAME</th>
                      
                      {/* Overall Average Column */}
                      <th style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px', textAlign: 'center', minWidth: '160px' }}>
                        OVERALL ATTENDANCE
                      </th>

                      {/* Subject Columns if viewing all subjects */}
                      {!filters.subjectId && divisionSubjects.map(sub => (
                        <th key={sub.id} style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px', textAlign: 'center', minWidth: '150px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{sub.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{sub.code} • {sub.totalSessions} sess</div>
                        </th>
                      ))}

                      {/* Single Subject specific sessions count column */}
                      {filters.subjectId && (
                        <th style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px', textAlign: 'center' }}>
                          SESSIONS ATTENDED
                        </th>
                      )}

                      <th style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px', textAlign: 'right' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={filters.subjectId ? 5 : (4 + divisionSubjects.length)} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
                          No students enrolled in this division.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map(st => {
                        return (
                          <tr key={st.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold' }}>
                              {st.rollNumber}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                              <div style={{ fontWeight: 600 }}>{st.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{st.email}</div>
                            </td>

                            {/* Overall Attendance */}
                            <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  fontWeight: 700,
                                  fontSize: '15px',
                                  color: st.isDefaulter ? 'var(--danger)' : 'var(--success)'
                                }}>
                                  {st.overallPercentage.toFixed(1)}%
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                                  ({st.overallPresent}/{st.overallSessions})
                                </span>
                              </div>
                              <div style={{
                                width: '100%',
                                height: '4px',
                                background: 'rgba(255,255,255,0.08)',
                                borderRadius: '2px',
                                marginTop: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${Math.min(st.overallPercentage, 100)}%`,
                                  height: '100%',
                                  background: st.isDefaulter ? 'var(--danger)' : 'var(--success)',
                                  borderRadius: '2px'
                                }} />
                              </div>
                            </td>

                            {/* Subject-wise breakdown columns when All Subjects is selected */}
                            {!filters.subjectId && divisionSubjects.map(sub => {
                              const stat = st.subjects[sub.id];
                              if (!stat || stat.totalSessions === 0) {
                                return (
                                  <td key={sub.id} style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'center', color: 'var(--muted)' }}>
                                    - <span style={{ fontSize: '11px' }}>(0 sess)</span>
                                  </td>
                                );
                              }
                              return (
                                <td key={sub.id} style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'center' }}>
                                  <div style={{
                                    fontWeight: 600,
                                    color: stat.isDefaulter ? 'var(--danger)' : 'var(--text)'
                                  }}>
                                    {stat.percentage.toFixed(1)}%
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                    {stat.present}/{stat.totalSessions} present
                                  </div>
                                </td>
                              );
                            })}

                            {/* When a single subject is selected, show attended sessions */}
                            {filters.subjectId && (
                              <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'center' }}>
                                {st.overallPresent} of {st.overallSessions} sessions
                              </td>
                            )}

                            {/* Status */}
                            <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>
                              {st.isDefaulter ? (
                                <span style={{
                                  background: 'var(--surface-error)',
                                  color: 'var(--danger)',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <AlertTriangle size={13} /> &lt;75% Low
                                </span>
                              ) : (
                                <span style={{
                                  background: 'var(--surface-success)',
                                  color: 'var(--success)',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <CheckCircle2 size={13} /> Safe
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: '12px 20px', background: 'var(--surface2)', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted)' }}>
                * Minimum required attendance percentage is <strong>75.0%</strong>. Students falling below 75% are marked with a low-attendance alert.
              </div>
            </div>
          )}

          {/* TAB 2: Conducted Sessions Management */}
          {activeTab === 'sessions' && (
            <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Conducted Attendance Sessions</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                    Manage and delete accidental or test sessions. Deleting an accidental session immediately recalculates attendance percentages.
                  </p>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 'bold', background: 'var(--surface)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  {sessions.length} {sessions.length === 1 ? 'Session' : 'Sessions'}
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead style={{ background: 'var(--surface2)' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>SESSION DATE & TIME</th>
                      <th style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>COURSE & DIVISION</th>
                      <th style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>FACULTY</th>
                      <th style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>STATUS</th>
                      <th style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>PRESENT COUNT</th>
                      <th style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px', textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
                          No attendance sessions found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      sessions.map((sess) => {
                        const dateObj = new Date(sess.startTime || sess.date);
                        const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                        const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                        const divName = sess.subject?.classes?.length > 0 ? sess.subject.classes.map(c => `Div ${c.name}`).join(', ') : 'Div A';
                        const semNum = sess.subject?.academicSem?.number ? `Sem ${sess.subject.academicSem.number}` : '';
                        const facultyName = sess.faculty?.user ? `${sess.faculty.user.firstName} ${sess.faculty.user.lastName}` : 'N/A';
                        const count = sess._count?.records || 0;

                        return (
                          <tr key={sess.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                              <div style={{ fontWeight: 600 }}>{dateStr}</div>
                              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{timeStr}</div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                              <div style={{ fontWeight: 600 }}>{sess.subject?.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                                {[divName, semNum, sess.subject?.code].filter(Boolean).join(' • ')}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                              {facultyName}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: sess.status === 'ACTIVE' ? 'var(--surface-success)' : 'var(--surface2)',
                                color: sess.status === 'ACTIVE' ? 'var(--success)' : 'var(--muted)',
                                border: '1px solid var(--border)'
                              }}>
                                {sess.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                              <span style={{ fontWeight: 700, color: count > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {count} students
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteSession(sess.id, sess.subject?.name || 'Session')}
                                title="Delete Session"
                                style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Raw Attendance Scan Logs */}
          {activeTab === 'logs' && (
            <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Detailed Attendance Recognition Logs</h3>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
                <table className="table">
                  <thead style={{ background: 'var(--surface2)', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>DATE / TIME</th>
                      <th style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>STUDENT</th>
                      <th style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>SUBJECT</th>
                      <th style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>STATUS</th>
                      <th style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '12px' }}>AI SCORE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>No records found.</td></tr>
                    ) : (
                      history.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                            <div>{r.date}</div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{r.time}</div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold' }}>
                            {r.studentName}
                            <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 'normal' }}>{r.rollNumber}</div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '14px' }}>{r.subjectName}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                            {r.status === 'PRESENT' ? (
                              <span style={{ background: 'var(--surface-success)', color: 'var(--success)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>PRESENT</span>
                            ) : (
                              <span style={{ background: 'var(--surface-error)', color: 'var(--danger)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{r.status}</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--muted)' }}>
                            {r.similarityScore ? `${(r.similarityScore * 100).toFixed(1)}%` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        loading={confirmModal.loading}
      />
    </div>
  );
}
