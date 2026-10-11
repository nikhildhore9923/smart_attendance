const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/LoginPage.jsx', 'utf8');

const regex = /const handleDemo = async \(role\) => \{[\s\S]*?\}\s*\}\s*return \(/;

const newCode = `const handleDemo = async (role) => {
    const dEmail = role === 'admin' ? 'admin@college.edu' : 'faculty@college.edu';
    const dPass = 'admin123';
    setEmail(dEmail);
    setPassword(dPass);
    try {
      setLoading(true);
      await login(dEmail, dPass);
      toast.success('Demonstration access granted');
    } catch (err) {
      toast.error('Demo login failed');
    } finally {
      if (window.location.pathname === '/login') {
        setLoading(false);
      }
    }
  }

  return (`;

code = code.replace(regex, newCode);
fs.writeFileSync('frontend/src/pages/LoginPage.jsx', code);
