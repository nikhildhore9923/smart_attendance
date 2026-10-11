const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/EnrollPage.jsx', 'utf8');

content = content.replace(
  "import api, { getStudents, getEnrollmentStatus, startEnrollment, addEnrollmentSample } from '../lib/api'",
  "import api, { getStudents, getEnrollmentStatus, startEnrollment, addEnrollmentSample, createStudent } from '../lib/api'"
);

if (!content.includes('useLocation')) {
  content = content.replace("import { useState, useEffect, useRef } from 'react'", "import { useState, useEffect, useRef } from 'react'\nimport { useLocation, useNavigate } from 'react-router-dom'");
}

content = content.replace(
  "const [mode, setMode] = useState('SELECT') // SELECT, ENROLLING, DONE",
  "const location = useLocation()\n  const navigate = useNavigate()\n  const [mode, setMode] = useState(new URLSearchParams(location.search).get('mode') === 'create' ? 'CREATE' : 'SELECT')\n  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', email: '', rollNumber: '', password: 'Password123!' })"
);

const createHandler = `
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await createStudent(newStudent);
      toast.success('Student created successfully!');
      setNewStudent({ firstName: '', lastName: '', email: '', rollNumber: '', password: 'Password123!' });
      const updatedList = await getStudents();
      setStudents(updatedList.data);
      setFilteredStudents(updatedList.data);
      const found = updatedList.data.find(s => s.roll_no === res.data.rollNumber || s.rollNumber === res.data.rollNumber);
      if (found) {
        selectStudent(found);
      } else {
        setMode('SELECT');
        navigate('/enroll');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create student');
    } finally {
      setLoading(false);
    }
  }
`;

content = content.replace(
  "const fetchStudents = async () => {",
  createHandler + "\n  const fetchStudents = async () => {"
);

const createUI = `
          {mode === 'CREATE' && (
            <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '20px' }}>Create New Student</h2>
              <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input required className="input" placeholder="First Name" value={newStudent.firstName} onChange={e => setNewStudent({...newStudent, firstName: e.target.value})} />
                <input required className="input" placeholder="Last Name" value={newStudent.lastName} onChange={e => setNewStudent({...newStudent, lastName: e.target.value})} />
                <input required type="email" className="input" placeholder="Email" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} />
                <input required className="input" placeholder="Roll Number" value={newStudent.rollNumber} onChange={e => setNewStudent({...newStudent, rollNumber: e.target.value})} />
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create & Proceed to Enrollment'}</button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setMode('SELECT'); navigate('/enroll'); }} disabled={loading}>Cancel</button>
                </div>
              </form>
            </div>
          )}
`;

content = content.replace(
  "{!selectedStudent && (",
  createUI + "\n          {!selectedStudent && mode !== 'CREATE' && ("
);

const sidebarButton = `
          {loading && students.length === 0 ? (
`;
const newSidebarButton = `
          <button className="btn btn-primary" style={{ marginBottom: '16px', width: '100%', display: 'flex', justifyContent: 'center' }} onClick={() => { setSelectedStudent(null); setMode('CREATE'); navigate('/enroll?mode=create'); }}>
             Create New Student
          </button>
          {loading && students.length === 0 ? (
`;
content = content.replace(sidebarButton, newSidebarButton);

content = content.replace(
  "setMode('SELECT')",
  "setMode('SELECT'); navigate('/enroll');"
);

fs.writeFileSync('frontend/src/pages/EnrollPage.jsx', content);
console.log("Successfully rewrote EnrollPage.jsx");
