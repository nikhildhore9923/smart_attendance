import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:5000/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password })
export const getMe = () => api.get('/auth/me')
export const changePassword = (b) => api.post('/auth/change-password', b)

// Students
export const getStudents = () => api.get('/students')
export const createStudent = (data) => api.post('/students', data)
export const getStudent = (id) => api.get(`/students/${id}`)
export const deleteStudent = (r, dr=false) => api.delete(`/students/${r}`, { params: { hard: dr, delete_records: dr } })
export const deleteStudentRecords = (r) => api.delete(`/students/${r}/records`)
export const activateStudent = (r) => api.patch(`/students/${r}/activate`)

// Enrollment
export const startEnrollment = (studentId, action = 'ENROLL') => api.post(`/enrollment/${studentId}/start`, { action })
export const addEnrollmentSample = (studentId, base64Image) => api.post(`/enrollment/${studentId}/samples`, { image: base64Image })
export const getEnrollmentStatus = (studentId) => api.get(`/enrollment/${studentId}`)

// Recognition
export const recognizeFace = (base64Image) => api.post('/recognition/recognize', { image: base64Image })

// Attendance Sessions
export const getSessions = (params) => api.get('/attendance/sessions', { params })
export const startSession = (subjectId) => api.post('/attendance/sessions', { subjectId })
export const getActiveSession = (subjectId) => api.get('/attendance/sessions/active', { params: { subjectId } })
export const endSession = (sessionId) => api.post(`/attendance/sessions/${sessionId}/end`)
export const deleteSession = (sessionId) => api.delete(`/attendance/sessions/${sessionId}`)
export const recognizeAttendance = (sessionId, base64Image) => api.post(`/attendance/sessions/${sessionId}/recognize`, { image: base64Image, multiFace: true })

// Academic
export const getSubjects = () => api.get('/academic/subjects')
export const getClasses = () => api.get('/academic/classes')

// Reports & Analytics
export const getHistory = (params) => api.get('/attendance/history', { params })
export const getSummary = (params) => api.get('/attendance/summary', { params })
export const getDivisionMatrix = (params) => api.get('/attendance/division-matrix', { params })
export const getStudentReport = (studentId) => api.get(`/attendance/student/${studentId}`)
export const getDashboardStats = () => api.get('/attendance/dashboard')
export const getTrend = (days) => api.get('/attendance/trend', { params: { days } })

export const exportCSV = (params) => api.get('/attendance/export/csv', { params, responseType: 'blob' })
export const exportPDF = (params) => api.get('/attendance/export/pdf', { params, responseType: 'blob' })

// Map legacy log endpoint to new history endpoint
export const getFullLog = async (params) => {
  const query = {};
  if (params.date_from) query.fromDate = params.date_from;
  if (params.date_to) query.toDate = params.date_to;
  if (params.subject && params.subject !== 'All') query.subjectId = params.subject;
  
  const res = await api.get('/attendance/history', { params: query });
  
  // Client-side filtering
  let filtered = Array.isArray(res.data) ? res.data : [];
  if (params.subject && params.subject !== 'All') {
    filtered = filtered.filter(r => r.subjectId === params.subject || r.subjectName === params.subject);
  }
  if (params.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(r => r.studentName?.toLowerCase().includes(s) || r.rollNumber?.toLowerCase().includes(s));
  }
  
  // Pagination
  const page = params.page || 1;
  const size = params.page_size || 25;
  const paginated = filtered.slice((page - 1) * size, page * size);
  
  return {
    data: {
      total: filtered.length,
      data: paginated.map(r => ({
        name: r.studentName,
        roll_no: r.rollNumber,
        date: r.date,
        time: r.time,
        confidence: r.similarityScore ? r.similarityScore * 100 : 0,
        subject: r.subjectName,
        class: r.className,
        status: r.status
      }))
    }
  };
};

export const exportCSVUrl = () => '';

export const getStats = async () => {
  try {
    const res = await api.get('/attendance/dashboard');
    return {
      data: {
        total_students: res.data.totalStudents,
        present_today: res.data.todayAttendance,
        absent_today: res.data.totalStudents - res.data.todayAttendance
      }
    };
  } catch {
    return { data: {} };
  }
}

export const getHealth = () => api.get('/health');

// Faculty & Course Allocation
export const getFacultyList = () => api.get('/faculty');
export const createFacultyMember = (data) => api.post('/faculty', data);
export const updateFacultyMember = (id, data) => api.put(`/faculty/${id}`, data);
export const deleteFacultyMember = (id) => api.delete(`/faculty/${id}`);
export const allocateFacultyCourses = (id, subjectIds) => api.post(`/faculty/${id}/allocate`, { subjectIds });
export const getMyAssignedSubjects = () => api.get('/faculty/my-subjects');



