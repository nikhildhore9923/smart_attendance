const fs = require('fs');

let code = fs.readFileSync('frontend/src/pages/ClassesPage.jsx', 'utf8');

// Add stats state
code = code.replace(/const \[hierarchy, setHierarchy\] = useState\(\[\]\)/, "const [hierarchy, setHierarchy] = useState([])\n  const [stats, setStats] = useState({})");

// Fetch stats
const fetchStats = `
      const statsRes = await api.get('/academic/hierarchy/stats')
      setStats(statsRes.data)
`;
code = code.replace(/const progRes = await api\.get\('\/academic\/programs'\)/, "const progRes = await api.get('/academic/programs')\n" + fetchStats);

// Update Division Header to show Overall Stats
const divisionHeaderRegex = /<span style=\{\{ fontWeight: 600, color: 'var\(--text\)' \}\}>Div \{cls\.name\}<\/span>\s*<\/div>/;
const divisionHeaderNew = `<span style={{ fontWeight: 600, color: 'var(--text)' }}>Div {cls.name}</span>
                                    {stats[cls.id] && stats[cls.id].overall.total > 0 && (
                                      <span className="badge badge-blue" style={{ marginLeft: 8 }}>
                                        {Math.round((stats[cls.id].overall.present / stats[cls.id].overall.total) * 100)}% Avg Attendance
                                      </span>
                                    )}
                                  </div>`;
code = code.replace(divisionHeaderRegex, divisionHeaderNew);

// Update Subject Row to show Subject Stats
const subjectRowRegex = /<p style=\{\{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var\(--text\)' \}\}>\{sub\.name\}<\/p>\s*<p style=\{\{ margin: 0, fontSize: 11, color: 'var\(--muted\)' \}\}>\{sub\.code\}<\/p>\s*<\/div>/;
const subjectRowNew = `<p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{sub.name}</p>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                              <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>{sub.code}</p>
                                              {stats[cls.id] && stats[cls.id][sub.id] && stats[cls.id][sub.id].total > 0 && (
                                                <span style={{ fontSize: 11, fontWeight: 600, color: (stats[cls.id][sub.id].present / stats[cls.id][sub.id].total) > 0.75 ? 'var(--success)' : 'var(--danger)' }}>
                                                  • {Math.round((stats[cls.id][sub.id].present / stats[cls.id][sub.id].total) * 100)}% Attendance
                                                </span>
                                              )}
                                            </div>
                                          </div>`;
code = code.replace(subjectRowRegex, subjectRowNew);

fs.writeFileSync('frontend/src/pages/ClassesPage.jsx', code);
console.log('Added stats visualization to ClassesPage.');
