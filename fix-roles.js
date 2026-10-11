const fs = require('fs');

let code = fs.readFileSync('frontend/src/components/Layout.jsx', 'utf8');

// Add roles to NAV array
const navRegex = /const NAV = \[\s*\{ section: 'Main' \},[\s\S]*?\{ to: '\/settings',  icon: Settings,        label: 'Settings' \},\s*\]/m;

const newNav = `const NAV = [
  { section: 'Main', roles: ['ADMIN', 'FACULTY', 'STUDENT'] },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'FACULTY', 'STUDENT'] },
  
  { section: 'Attendance', roles: ['FACULTY', 'ADMIN'] },
  { to: '/live',      icon: Video,           label: 'Live Recognition', dot: 'green', roles: ['FACULTY', 'ADMIN'] },
  { to: '/log',       icon: ClipboardList,   label: 'Attendance Log', roles: ['FACULTY', 'ADMIN'] },
  
  { section: 'Students', roles: ['ADMIN'] },
  { to: '/students',  icon: Users,           label: 'All Students', roles: ['ADMIN'] },
  { to: '/enroll',    icon: UserPlus,        label: 'Enroll Student', roles: ['ADMIN'] },
  
  { section: 'Academics', roles: ['ADMIN'] },
  { to: '/classes',   icon: BookOpen,        label: 'Academic Setup', roles: ['ADMIN'] },
  
  { section: 'Analytics', roles: ['ADMIN', 'FACULTY'] },
  { to: '/reports',   icon: BarChart3,       label: 'Reports', roles: ['ADMIN', 'FACULTY'] },
  
  { section: 'System', roles: ['ADMIN'] },
  { to: '/settings',  icon: Settings,        label: 'Settings', roles: ['ADMIN'] },
]`;

code = code.replace(navRegex, newNav);

// Update nav rendering logic
const mapRegex = /\{NAV\.map\(\(item, i\) => \{\s*if \(item\.section\).*?return.*?<\/NavLink>\s*\)\s*\}\)\}/s;

const newMap = `{NAV.map((item, i) => {
            // Role-based filtering
            if (item.roles && user && !item.roles.includes(user.role)) return null;

            if (item.section) {
              return <div key={'sec'+i} className="sidebar-section">{item.section}</div>
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({isActive}) => clsx('sidebar-link', isActive && 'active')}
                onClick={() => setMobileOpen(false)}
              >
                <item.icon size={18} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.dot === 'green' && <span className="pulse-dot" style={{ width: 6, height: 6 }} />}
              </NavLink>
            )
          })}`;

code = code.replace(mapRegex, newMap);

fs.writeFileSync('frontend/src/components/Layout.jsx', code);
console.log('Role-based navigation applied to Layout.jsx');
