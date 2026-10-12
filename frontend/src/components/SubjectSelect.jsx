import { useSubject } from '../context/SubjectContext'

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
        disabled={subjects.length === 0}
      >
        {subjects.length === 0 ? (
          <option value="">No Courses Allocated</option>
        ) : (
          subjects.map(s => {
            const semInfo = s.academicSem?.number ? `Sem ${s.academicSem.number}` : '';
            const classInfo = s.classes && s.classes.length > 0 ? s.classes.map(c => c.name).join(', ') : '';
            const details = [classInfo, semInfo].filter(Boolean).join(' • ');
            return (
              <option key={s.id} value={s.id}>
                {s.name} {details ? `(${details})` : ''}
              </option>
            );
          })
        )}
      </select>
    </div>
  )
}
