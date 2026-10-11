const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/StudentsPage.jsx', 'utf8');

// Add classes to state
content = content.replace("const [search, setSearch] = useState('')", "const [search, setSearch] = useState('')\n  const [classes, setClasses] = useState([])\n  const [editing, setEditing] = useState(null)");

// Load classes
const oldEffect = `useEffect(() => { load() }, [])`;
const newEffect = `useEffect(() => { load(); api.get('/academic/classes').then(res => setClasses(res.data)).catch(console.error); }, [])`;
content = content.replace(oldEffect, newEffect);

// Add handleEditSubmit
const editBlock = `
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.put(\`/students/\${editing.roll_no}\`, editing)
      toast.success('Updated student')
      setEditing(null)
      load()
    } catch(err) {
      toast.error('Failed to update student')
    }
  }
`;
content = content.replace("const handleDelete =", editBlock + "\n  const handleDelete =");

// Add Edit button to table actions
const oldActions = `<button className="btn-icon has-tooltip" title="Clear attendance records" onClick={() => handleClearRecords(s.roll_no, s.name)} style={{ color:'var(--muted)' }}>`;
const newActions = `<button className="btn-icon has-tooltip" title="Edit student" onClick={() => setEditing({ roll_no: s.roll_no, firstName: s.firstName || s.name.split(' ')[0], lastName: s.lastName || s.name.split(' ')[1] || '', classId: s.classId || '' })} style={{ color:'var(--muted)' }}>
                                  <Edit size={14} /><span className="tooltip">Edit</span>
                                </button>
                                ` + oldActions;
content = content.replace(oldActions, newActions);

// Import Edit icon
content = content.replace("Trash2 }", "Trash2, Edit }");

// Add Modal
const modalJSX = `
      {editing && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 100 }}>
          <div className="card" style={{ width: '400px', padding: '24px' }}>
            <h2>Edit Student</h2>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <input required className="input" placeholder="First Name" value={editing.firstName} onChange={e=>setEditing({...editing, firstName: e.target.value})} />
              <input required className="input" placeholder="Last Name" value={editing.lastName} onChange={e=>setEditing({...editing, lastName: e.target.value})} />
              <input required className="input" placeholder="Roll Number" value={editing.roll_no} onChange={e=>setEditing({...editing, roll_no: e.target.value})} />
              <select className="input" value={editing.classId || ''} onChange={e=>setEditing({...editing, classId: e.target.value})}>
                <option value="">No Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                <button type="button" className="btn btn-secondary" onClick={()=>setEditing(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
`;

content = content.replace("</div>\n  )\n}", modalJSX + "    </div>\n  )\n}");

fs.writeFileSync('frontend/src/pages/StudentsPage.jsx', content);
console.log('StudentsPage enhanced with Edit');
