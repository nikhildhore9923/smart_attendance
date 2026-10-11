const fs = require('fs');
const code = `import { useSubject } from '../context/SubjectContext'

export default function SubjectSelect({ className = '', compact = false }) {
  const { subject, setSubject, subjects } = useSubject()

  return (
    <div className={className}>
      {!compact && (
        <label className="field-label">Subject Context</label>
      )}
      <select
        className="select"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        aria-label="Select subject"
      >
        {subjects.map(s => (
          <option key={s.id} value={s.id}>
            {s.name} {s.classes && s.classes.length > 0 ? \`(\${s.classes.map(c=>c.name).join(', ')})\` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
`
fs.writeFileSync('frontend/src/components/SubjectSelect.jsx', code);
console.log('Fixed SubjectSelect to render objects.');
