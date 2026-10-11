const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/EnrollPage.jsx', 'utf8');

// 1. Add classes state
content = content.replace("const [errorMsg, setErrorMsg] = useState(null)", "const [errorMsg, setErrorMsg] = useState(null)\n  const [classes, setClasses] = useState([])");

// 2. Load classes in useEffect
const oldEffect = `  useEffect(() => {
    loadStudents()
  }, [])`;
const newEffect = `  useEffect(() => {
    loadStudents()
    api.get('/academic/classes').then(res => setClasses(res.data)).catch(console.error)
  }, [])`;
content = content.replace(oldEffect, newEffect);

// 3. Add classId to CREATE_FORM
content = content.replace("rollNumber: '',", "rollNumber: '',\n    classId: '',");

// 4. Add select to JSX
const oldRollNumberInput = `<input
                    className="input"
                    placeholder="e.g. CS2024-001"
                    value={createForm.rollNumber}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, rollNumber: e.target.value }))}
                    disabled={isCreating}
                  />`;
const newClassSelect = `<input
                    className="input"
                    placeholder="e.g. CS2024-001"
                    value={createForm.rollNumber}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, rollNumber: e.target.value }))}
                    disabled={isCreating}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Class</label>
                  <select
                    className="input"
                    value={createForm.classId}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, classId: e.target.value }))}
                    disabled={isCreating}
                  >
                    <option value="">Select a class...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} (Sem {c.semester})</option>)}
                  </select>`;

content = content.replace(oldRollNumberInput, newClassSelect);

fs.writeFileSync('frontend/src/pages/EnrollPage.jsx', content);
console.log('EnrollPage enhanced');
