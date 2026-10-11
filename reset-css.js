const fs = require('fs');

const css = `
@import "tailwindcss";

:root, [data-theme="light"], [data-theme="dark"] {
  /* Brand */
  --primary:     #245747;
  --primary-hover: #193F34;
  --accent:      #245747;
  --accent2:     #193F34;
  
  /* Backgrounds */
  --bg:          #F7F6F0;
  --surface:     #FFFFFF;
  --surface2:    #F0F1EA;
  --surface-success: #EAF4EE;
  --surface-error:   #FDEAEA;
  --surface-warning: #FEF4E6;
  --surface-info:    #E9EDEC;
  
  /* Text */
  --text:        #252A27;
  --text2:       #4A514D;
  --muted:       #737970;
  --muted2:      #A3A66A;
  
  /* Borders */
  --border:      #E4E5DC;
  --border2:     #D4D5CA;
  
  /* Semantic */
  --success:     #1A7D54;
  --warning:     #C58A37;
  --danger:      #D93B3B;
  --info:        #4A6B62;

  /* Legacy mappings */
  --purple:      #245747;
  --cyan:        #A3A66A;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

/* Layout Shell */
.app-shell { display: flex; height: 100vh; overflow: hidden; background: var(--bg); }
.main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.main-content { flex: 1; overflow-y: auto; padding: 24px 32px; background: var(--bg); }

/* Topbar */
.topbar {
  height: 64px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 32px;
  gap: 16px;
  z-index: 10;
}
.topbar-breadcrumb { display: flex; alignItems: center; gap: 8px; font-weight: 500; font-size: 15px; }
.breadcrumb-root { color: var(--primary); }
.breadcrumb-current { color: var(--muted); }
.text-muted-icon { color: var(--muted2); }

/* Sidebar */
.sidebar {
  width: 260px;
  background: var(--primary);
  color: #fff;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
  z-index: 40;
}
.sidebar-open { transform: translateX(0); }
.sidebar-closed { transform: translateX(-100%); width: 0; }
.sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 30; }

.sidebar-brand { padding: 24px; display: flex; align-items: center; gap: 12px; }
.sidebar-logo { background: rgba(255,255,255,0.15); width: 40px; height: 40px; border-radius: 8px; display: flex; justify-content: center; align-items: center; }
.sidebar-brand-text { flex: 1; }
.sidebar-brand-name { font-weight: 700; font-size: 18px; color: #fff; letter-spacing: -0.5px; }
.sidebar-brand-tag { font-size: 12px; color: rgba(255,255,255,0.7); }

.sidebar-scroll { flex: 1; overflow-y: auto; padding: 16px 12px; }
.sidebar-section { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; color: rgba(255,255,255,0.5); margin: 24px 0 8px 12px; }
.sidebar-link {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  border-radius: 6px; color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 500;
  text-decoration: none; transition: 0.2s;
}
.sidebar-link:hover { background: rgba(255,255,255,0.1); color: #fff; }
.sidebar-link.active { background: #fff; color: var(--primary); box-shadow: 0 2px 5px rgba(0,0,0,0.1); }

.sidebar-footer { padding: 16px; border-top: 1px solid rgba(255,255,255,0.1); }
.sidebar-user { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.sidebar-user-avatar { width: 36px; height: 36px; border-radius: 18px; background: rgba(255,255,255,0.2); display: flex; justify-content: center; align-items: center; font-weight: bold; }
.sidebar-user-name { font-size: 14px; font-weight: 600; color: #fff; }
.sidebar-user-role { font-size: 12px; color: rgba(255,255,255,0.7); }

.sidebar-logout { width: 100%; justify-content: flex-start; color: rgba(255,255,255,0.7); background: transparent; border: none; cursor: pointer; }
.sidebar-logout:hover { color: #fff; background: rgba(255,255,255,0.1); }

/* Typography */
h1, h2, h3, h4, h5 { color: var(--text); font-weight: 600; letter-spacing: -0.5px; }

/* Cards & Containers */
.page-container { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
.table-card { background: var(--surface); border-radius: 8px; border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-radius: 6px; font-size: 14px; font-weight: 500;
  cursor: pointer; transition: 0.2s; border: 1px solid transparent; text-decoration: none;
}
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--primary-hover); }
.btn-secondary { background: var(--surface); color: var(--text); border-color: var(--border); }
.btn-secondary:hover:not(:disabled) { background: var(--surface2); }
.btn-success { background: var(--success); color: #fff; }
.btn-danger { background: var(--danger); color: #fff; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-icon { background: none; border: none; cursor: pointer; color: var(--muted); padding: 4px; border-radius: 4px; display: inline-flex; justify-content: center; align-items: center; }
.btn-icon:hover { color: var(--text); background: var(--surface2); }

/* Forms */
.form-stack { display: flex; flex-direction: column; gap: 16px; }
.field-label { display: block; font-size: 13px; font-weight: 600; color: var(--text2); margin-bottom: 6px; }
.input {
  width: 100%; padding: 10px 12px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--surface);
  color: var(--text); font-size: 14px; transition: 0.2s;
}
.input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(36,87,71,0.1); }
.input::placeholder { color: var(--muted); }

/* Tables */
.table { width: 100%; border-collapse: collapse; text-align: left; }
.table th { padding: 12px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--muted); background: var(--surface2); border-bottom: 1px solid var(--border); letter-spacing: 0.5px; }
.table td { padding: 16px; border-bottom: 1px solid var(--border); font-size: 14px; color: var(--text2); vertical-align: middle; }
.table tr:last-child td { border-bottom: none; }
.table tr:hover td { background: var(--surface-info); }

/* Badges */
.badge { display: inline-flex; padding: 4px 8px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.badge-green { background: var(--surface-success); color: var(--success); }
.badge-red { background: var(--surface-error); color: var(--danger); }
.badge-blue, .badge-amber { background: var(--surface-warning); color: var(--warning); } /* fallback mapping */

/* Modals */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 50; padding: 16px; }
.modal-content { background: var(--surface); width: 100%; max-width: 500px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); overflow: hidden; }
.modal-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
.modal-header h2 { font-size: 18px; margin: 0; }

/* Utilities */
.text-muted { color: var(--muted); }
.font-medium { font-weight: 500; color: var(--text); }
.font-bold { font-weight: 600; color: var(--text); }
.mb-4 { margin-bottom: 16px; }
.p-6 { padding: 24px; }

/* Spinners & Animations */
.spinner { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.pulse-dot { animation: pulse 2s infinite; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

/* Login overrides */
.login-shell { display: flex; height: 100vh; background: var(--surface); }
.login-showcase { flex: 1; background: var(--primary); color: #fff; padding: 64px; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden; }
.login-showcase-bg { position: absolute; inset: 0; background: linear-gradient(135deg, var(--primary), var(--primary-hover)); opacity: 0.9; z-index: 0; }
.login-showcase-content { position: relative; z-index: 1; max-width: 500px; }
.login-showcase-title { font-size: 42px; font-weight: 700; line-height: 1.2; margin-bottom: 24px; }
.login-showcase-desc { font-size: 18px; color: rgba(255,255,255,0.8); line-height: 1.5; margin-bottom: 48px; }
.login-features { display: flex; flex-direction: column; gap: 24px; }
.login-feature { display: flex; gap: 16px; align-items: flex-start; }
.login-feature-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); }
.login-feature-title { font-weight: 600; font-size: 16px; margin-bottom: 4px; }
.login-feature-desc { font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.4; }

.login-panel { width: 500px; padding: 48px; display: flex; align-items: center; justify-content: center; position: relative; }
.login-form-wrap { width: 100%; max-width: 400px; position: relative; z-index: 10; }
.login-logo-block { text-align: center; margin-bottom: 32px; }
.login-logo { width: 56px; height: 56px; background: var(--primary); border-radius: 12px; display: inline-flex; justify-content: center; align-items: center; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(36,87,71,0.2); }
.login-brand { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
.login-tagline { color: var(--muted); font-size: 15px; }
`;

fs.writeFileSync('frontend/src/index.css', css);
console.log('Complete index.css reset');
