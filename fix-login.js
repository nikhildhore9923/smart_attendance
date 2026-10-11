const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/LoginPage.jsx', 'utf8');

// Add Theme Toggle import
content = content.replace("import { useAuth } from '../context/AuthContext'", "import { useAuth } from '../context/AuthContext'\nimport { useTheme } from '../context/ThemeContext'");
content = content.replace("import { Eye, EyeOff, Scan, Shield, BarChart3, Zap } from 'lucide-react'", "import { Eye, EyeOff, Scan, Shield, BarChart3, Zap, Sun, Moon } from 'lucide-react'");

// Remove exaggerations
content = content.replace("'Deep learning face matching with 99%+ accuracy on enrolled students'", "'Deep learning face matching for enrolled students'");
content = content.replace("'Blink & head-pose verification prevents photo/video spoofing attacks'", "'Liveness verification using EfficientNet to detect physical presence'");
content = content.replace("'Enterprise-grade face recognition with liveness detection, real-time analytics,\n            and comprehensive reporting ?\" built for modern educational institutions.'", "'Face recognition with liveness detection, analytics,\n            and reporting — designed for academic attendance management.'");

// Inject toggle and hook
content = content.replace("const { login } = useAuth()", "const { login } = useAuth()\n  const { dark, toggle } = useTheme()");

const themeToggleBtn = `
      {/* Theme Toggle */}
      <button className="btn-icon" onClick={toggle} style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
        {dark ? <Sun size={18} color="var(--text)" /> : <Moon size={18} color="var(--text)" />}
      </button>

      {/* Right login panel */}
`;

content = content.replace("{/* Right login panel */}", themeToggleBtn);

fs.writeFileSync('frontend/src/pages/LoginPage.jsx', content);
console.log('LoginPage.jsx refactored');
