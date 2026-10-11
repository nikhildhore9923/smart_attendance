import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Camera, RefreshCw, CheckCircle, XCircle, AlertTriangle, Users, Play, Square, BookOpen, Trash2, ShieldAlert } from 'lucide-react'
import { getSubjects, startSession, getActiveSession, endSession, deleteSession, recognizeAttendance } from '../lib/api'
import { getSocket, disconnectSocket } from '../utils/socket'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/ConfirmModal'

export default function LivePage() {
  const { user } = useAuth()

  if (user && user.role !== 'FACULTY') {
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
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>Faculty-Only Feature</h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6', marginBottom: '24px' }}>
            Live face recognition attendance is restricted to <strong>Faculty members</strong>. Faculty conduct sessions for their allocated subjects and divisions.
            <br /><br />
            As an <strong>Administrator</strong>, you can view division-wise & subject-wise student attendance, track defaulters, and manage sessions in Reports.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/reports" className="btn btn-primary">
              View Attendance Reports
            </Link>
            <Link to="/log" className="btn btn-secondary">
              Attendance Logs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [session, setSession] = useState(null)
  const [markedStudents, setMarkedStudents] = useState([])
  
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const [autoScan, setAutoScan] = useState(false)
  const autoScanRef = useRef(null)
  
  const [socketStatus, setSocketStatus] = useState('Disconnected')

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    socket.on('connect', () => setSocketStatus('Connected'));
    socket.on('disconnect', () => setSocketStatus('Disconnected'));
    socket.on('connect_error', () => setSocketStatus('Reconnecting...'));

    socket.on('attendance:marked', (data) => {
      setMarkedStudents((prev) => {
        if (prev.some((r) => r.student?.id === data.student.id || r.studentId === data.student.id)) return prev;
        
        toast.success(`${data.student.firstName} ${data.student.lastName} marked present!`, {
          style: { background: 'var(--success)', color: '#fff' }
        });
        
        return [{ student: data.student, confidenceScore: 1.0 }, ...prev];
      });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('attendance:marked');
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    fetchSubjects()
    startCamera()
    return () => {
      stopCamera()
      if (autoScanRef.current) clearInterval(autoScanRef.current)
    }
  }, [])

  useEffect(() => {
    // When session becomes active, the video element is mounted. Attach the stream.
    if (session && videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.log("Video play error:", e));
    }
  }, [session])

  useEffect(() => {
    if (selectedSubject) {
      checkActiveSession(selectedSubject)
    } else {
      setSession(null)
      setMarkedStudents([])
      setAutoScan(false)
    }
  }, [selectedSubject])

  // Auto-scan loop
  useEffect(() => {
    if (autoScan && session) {
      autoScanRef.current = setInterval(() => {
        // We use the button click function. To avoid stale state, 
        // we capture the current video frame directly.
        if (!processing) {
          captureAndRecognize()
        }
      }, 2500) // Capture every 2.5 seconds
    } else {
      if (autoScanRef.current) clearInterval(autoScanRef.current)
    }
    return () => {
      if (autoScanRef.current) clearInterval(autoScanRef.current)
    }
  }, [autoScan, session, processing])

  const fetchSubjects = async () => {
    try {
      const res = await getSubjects()
      setSubjects(res.data)
      if (res.data.length > 0) setSelectedSubject(res.data[0].id)
    } catch (err) {
      toast.error('Failed to fetch subjects')
    }
  }

  const checkActiveSession = async (subjId) => {
    try {
      const res = await getActiveSession(subjId)
      if (res.data) {
        setSession(res.data)
        setMarkedStudents(res.data.records || [])
      } else {
        setSession(null)
        setMarkedStudents([])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleStartSession = async () => {
    if (!selectedSubject) return toast.error('Select a subject first')
    try {
      const res = await startSession(selectedSubject)
      setSession(res.data)
      setMarkedStudents([])
      toast.success('Session started')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start session')
    }
  }

  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, title: '', message: '', confirmText: 'Confirm', type: 'danger', onConfirm: null, loading: false 
  })

  const handleEndSession = async () => {
    if (!session) return
    setConfirmModal({
      isOpen: true,
      title: 'End Attendance Session?',
      message: `Finalize attendance for this session? All marked student records (${markedStudents.length}) will be saved permanently to attendance reports.`,
      confirmText: 'Yes, End Session',
      type: 'warning',
      onConfirm: async () => {
        try {
          await endSession(session.id)
          setSession(null)
          setMarkedStudents([])
          setAutoScan(false)
          toast.success('Session finalized and ended')
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to end session')
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  const handleDiscardSession = async () => {
    if (!session) return
    setConfirmModal({
      isOpen: true,
      title: 'Discard & Delete Session?',
      message: 'Are you sure you want to discard this session? All attendance records marked during this active session will be permanently wiped out.',
      confirmText: 'Discard Session',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteSession(session.id)
          setSession(null)
          setMarkedStudents([])
          setAutoScan(false)
          toast.success('Session discarded and deleted')
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to discard session')
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      setErrorMsg("Camera access denied or unavailable.")
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const captureAndRecognize = async () => {
    if (!videoRef.current || !session) return
    // Prevent overlapping requests
    setProcessing(true)
    setErrorMsg(null)
    
    try {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(videoRef.current, 0, 0)
      const base64Image = canvas.toDataURL('image/jpeg')

      const res = await recognizeAttendance(session.id, base64Image)
      setResult(res.data)
      
      if (res.data.status === 'MARKED_PRESENT') {
        toast.success(`Marked ${res.data.student.firstName} present`)
        // Refresh active session to get updated records list
        checkActiveSession(selectedSubject)
      }

    } catch (err) {
      // Don't flood errors if auto-scanning
      setErrorMsg(err.response?.data?.error || 'Failed to process image.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes customPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(255, 255, 255, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }
        .pulsing-dot { animation: customPulse 1.5s infinite; }
      `}</style>
      <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Live Attendance Session</h1>
          <p className="page-desc">Start a session to mark attendance using Face Recognition.</p>
          <div style={{ fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ 
              width: 8, height: 8, borderRadius: '50%', 
              background: socketStatus === 'Connected' ? 'var(--success)' : socketStatus === 'Disconnected' ? 'var(--danger)' : 'var(--warning)'
            }} />
            <span style={{ color: 'var(--muted)' }}>Live Sync: {socketStatus}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <select 
            className="input-field" 
            value={selectedSubject} 
            onChange={e => setSelectedSubject(e.target.value)}
            disabled={session !== null || subjects.length === 0}
            style={{ minWidth: '280px' }}
          >
            {subjects.length === 0 ? (
              <option value="">No courses allocated to your account</option>
            ) : (
              <>
                <option value="">-- Select Allocated Course --</option>
                {subjects.map(s => {
                  const classInfo = s.classes && s.classes.length > 0
                    ? s.classes.map(c => `Div ${c.name}`).join(', ')
                    : (s.class?.name || '');
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) {classInfo ? `• ${classInfo}` : ''}
                    </option>
                  );
                })}
              </>
            )}
          </select>

          {!session ? (
            <button className="btn btn-primary" onClick={handleStartSession} disabled={!selectedSubject || subjects.length === 0}>
              <Play size={18} /> Start Session
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleDiscardSession} 
                style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'transparent' }}
                title="Discard this session without saving"
              >
                <Trash2 size={18} /> Discard Session
              </button>
              <button className="btn btn-danger" onClick={handleEndSession}>
                <Square size={18} /> End Session
              </button>
            </div>
          )}
        </div>
      </div>

      {!session ? (
        <div style={{ padding: '60px', textAlign: 'center', background: 'var(--surface2)', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--muted)' }}>
          {subjects.length === 0 && user?.role === 'FACULTY' ? (
            <>
              <AlertTriangle size={48} color="var(--warning)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ color: 'var(--text)' }}>No Courses Allocated</h3>
              <p style={{ maxWidth: '500px', margin: '0 auto', fontSize: '14px' }}>
                You do not have any courses allocated to your faculty account yet. Please contact the College Administrator to assign your subjects before taking live attendance.
              </p>
            </>
          ) : (
            <>
              <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3 style={{ color: 'var(--text)' }}>Ready for Live Attendance</h3>
              <p>Select your allocated subject from the dropdown above and click <strong>Start Session</strong> to begin face recognition.</p>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
          
          {/* Left Column: Camera and AI Feedback */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              
              {processing && !autoScan && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>
                  <RefreshCw className="spinner" size={24} style={{ marginRight: '8px' }} />
                  Processing...
                </div>
              )}
              
              {autoScan && (
                 <div style={{ position: 'absolute', top: 16, right: 16, background: 'var(--success)', padding: '6px 12px', borderRadius: '20px', color: '#fff', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 10 }}>
                   <div className="pulsing-dot" style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%' }} />
                   Auto-Scanning Active
                 </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-primary" 
                onClick={captureAndRecognize} 
                disabled={processing || errorMsg === "Camera access denied or unavailable."}
                style={{ padding: '16px', fontSize: '16px', flex: 1, display: 'flex', justifyContent: 'center', gap: '8px' }}
              >
                <Camera size={20} /> Capture Manually
              </button>
              
              <button 
                className={`btn ${autoScan ? 'btn-danger' : 'btn-success'}`}
                onClick={() => setAutoScan(!autoScan)} 
                disabled={errorMsg === "Camera access denied or unavailable."}
                style={{ padding: '16px', fontSize: '16px', flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', background: autoScan ? 'var(--danger)' : 'var(--success)', color: '#fff', border: 'none' }}
              >
                <RefreshCw size={20} className={autoScan ? "spinner" : ""} /> 
                {autoScan ? 'Stop Auto-Scan' : 'Start Auto-Scan'}
              </button>
            </div>

            {/* AI Result Box */}
            <div style={{ width: '100%', minHeight: '100px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {errorMsg && (!result || !result.faces) && (
                <div style={{ background: 'var(--surface-error)', border: '1px solid var(--danger)', padding: '16px', borderRadius: '8px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AlertTriangle size={24} />
                  <div>
                    <p style={{ fontWeight: 'bold' }}>Error</p>
                    <p style={{ fontSize: '14px' }}>{errorMsg}</p>
                  </div>
                </div>
              )}

              {result && result.faces && result.faces.map((f, i) => (
                <div key={i} style={{ background: f.status === 'NEWLY_MARKED' ? 'var(--surface-success)' : f.status === 'ALREADY_MARKED' ? 'var(--surface-warning)' : !f.recognized ? 'var(--surface-error)' : 'var(--surface-info)', border: `1px solid ${f.status === 'NEWLY_MARKED' ? 'var(--success)' : f.status === 'ALREADY_MARKED' ? 'var(--warning)' : !f.recognized ? 'var(--danger)' : 'var(--primary)'}`, padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {f.status === 'NEWLY_MARKED' ? <CheckCircle size={24} color="var(--success)"/> : 
                   f.status === 'ALREADY_MARKED' ? <CheckCircle size={24} color="var(--warning)"/> : 
                   !f.recognized ? <XCircle size={24} color="var(--danger)"/> : 
                   <RefreshCw className="spinner" size={24} color="var(--primary)"/>}
                  <div>
                    <p style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--text)' }}>
                      {f.student ? `${f.student.firstName} ${f.student.lastName}` : 'Unknown Face'}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                      {f.status === 'NEWLY_MARKED' ? 'Marked Present!' : 
                       f.status === 'ALREADY_MARKED' ? 'Already recorded' : 
                       !f.recognized ? 'Not recognized or Liveness failed' : 
                       'Confirming...'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Attendance List */}
          <div style={{ background: 'var(--surface2)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', justifyContent: 'space-between' }}>
              Present Students 
              <span style={{ background: 'var(--success)', color: '#fff', padding: '2px 8px', borderRadius: '999px', fontSize: '12px' }}>
                {markedStudents.length}
              </span>
            </h3>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {markedStudents.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>No students marked present yet.</p>
              ) : (
                markedStudents.map((record, idx) => (
                  <div key={idx} style={{ padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>
                      {record.student?.user?.firstName} {record.student?.user?.lastName}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                      Score: {(record.confidenceScore * 100).toFixed(1)}%
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>

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
    </>
  )
}


