const fs = require('fs');

let code = fs.readFileSync('frontend/src/pages/ClassesPage.jsx', 'utf8');

// Insert new states
const states = `
  const [yearModal, setYearModal] = useState({ show: false })
  const [programModal, setProgramModal] = useState({ show: false })
  const [semModal, setSemModal] = useState({ show: false, yearId: '' })
  const [programs, setPrograms] = useState([])
`;

code = code.replace(/const \[expandedSems, setExpandedSems\] = useState\(\{\}\)/, "const [expandedSems, setExpandedSems] = useState({})" + states);

// Insert fetch programs
const fetchProgs = `
      const progRes = await api.get('/academic/programs')
      setPrograms(progRes.data)
`;
code = code.replace(/setHierarchy\(res\.data\)/, "setHierarchy(res.data)\n" + fetchProgs);

// Insert handlers
const handlers = `
  const saveYear = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    try {
      await api.post('/academic/years', { name: fd.get('name'), startDate: fd.get('startDate'), endDate: fd.get('endDate') })
      toast.success('Academic Year Created')
      setYearModal({ show: false })
      load()
    } catch(err) { toast.error('Failed to create year') }
  }

  const saveProgram = async (e) => {
    e.preventDefault()
    try {
      await api.post('/academic/programs', { name: new FormData(e.target).get('name') })
      toast.success('Program Created')
      setProgramModal({ show: false })
      load()
    } catch(err) { toast.error('Failed to create program') }
  }

  const saveSem = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    try {
      await api.post('/academic/semesters', { number: fd.get('number'), academicYearId: semModal.yearId, programId: fd.get('programId') })
      toast.success('Semester Created')
      setSemModal({ show: false })
      load()
    } catch(err) { toast.error('Failed to create semester') }
  }
`;

code = code.replace(/\/\/ Class Actions/, handlers + "\n\n  // Class Actions");

// Update Header to include Add Buttons
const header = `
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Academic Organization</h1>
          <p className="page-desc" style={{ marginBottom: 0 }}>Manage your institution's hierarchy: Years, Programs, Divisions, and Subjects.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setProgramModal({show:true})}><Plus size={16} /> Program</button>
          <button className="btn btn-primary" onClick={() => setYearModal({show:true})}><Plus size={16} /> Academic Year</button>
        </div>
      </div>
`;
code = code.replace(/<div className="page-header">[\s\S]*?<\/div>/, header);

// Update Year header to include Add Semester button
const yearHeader = `
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text)', flex: 1 }}>Academic Year {year.name}</h2>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={(e) => { e.stopPropagation(); setSemModal({ show: true, yearId: year.id }) }}>
                  <Plus size={14} /> Add Semester
                </button>
`;
code = code.replace(/<h2 style=\{\{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var\(--text\)' \}\}>Academic Year \{year.name\}<\/h2>/, yearHeader);

// Add Modals
const modals = `
      {yearModal.show && (
        <div className="modal-overlay" onClick={() => setYearModal({show: false})}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Add Academic Year</h2></div>
            <form onSubmit={saveYear} className="form-stack p-6">
              <div><label className="field-label">Year Name</label><input name="name" className="input" required placeholder="e.g. 2026-2027" /></div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
                <div><label className="field-label">Start Date</label><input type="date" name="startDate" className="input" required /></div>
                <div><label className="field-label">End Date</label><input type="date" name="endDate" className="input" required /></div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}><button type="submit" className="btn btn-primary">Save Year</button><button type="button" className="btn btn-secondary" onClick={() => setYearModal({show: false})}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {programModal.show && (
        <div className="modal-overlay" onClick={() => setProgramModal({show: false})}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Add Program</h2></div>
            <form onSubmit={saveProgram} className="form-stack p-6">
              <div><label className="field-label">Program Name</label><input name="name" className="input" required placeholder="e.g. B.Tech Computer Science" /></div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}><button type="submit" className="btn btn-primary">Save Program</button><button type="button" className="btn btn-secondary" onClick={() => setProgramModal({show: false})}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {semModal.show && (
        <div className="modal-overlay" onClick={() => setSemModal({show: false})}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Add Semester to Year</h2></div>
            <form onSubmit={saveSem} className="form-stack p-6">
              <div>
                <label className="field-label">Program</label>
                <select name="programId" className="input" required>
                  <option value="">Select a program...</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className="field-label">Semester Number</label><input type="number" name="number" className="input" required placeholder="e.g. 1" min="1" max="10" /></div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}><button type="submit" className="btn btn-primary">Save Semester</button><button type="button" className="btn btn-secondary" onClick={() => setSemModal({show: false})}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}
`;

code = code.replace(/<\/div>\s*<\/div>\s*\)\s*\}\s*$/m, modals + "\n    </div>\n  )\n}\n");

fs.writeFileSync('frontend/src/pages/ClassesPage.jsx', code);
console.log('Added root structure management to ClassesPage.');
