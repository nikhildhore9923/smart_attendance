const fs = require('fs');

const code = `
export default function StatCard({ label, value, icon: Icon, color = 'blue', sub, trend }) {
  // Map legacy color prop to semantic vars
  const palette = {
    blue:   { bg:'var(--surface-info)',    icon:'var(--primary)' },
    green:  { bg:'var(--surface-success)', icon:'var(--success)' },
    red:    { bg:'var(--surface-error)',   icon:'var(--danger)' },
    yellow: { bg:'var(--surface-warning)', icon:'var(--warning)' },
    purple: { bg:'var(--surface-info)',    icon:'var(--info)' },
    cyan:   { bg:'var(--surface-info)',    icon:'var(--muted2)' },
  }
  const p = palette[color] || palette.blue

  return (
    <div className="table-card" style={{ padding: '20px' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div style={{ flex:1 }}>
          <p className="field-label" style={{ margin: 0 }}>{label}</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', marginTop: 8 }}>{value ?? '?"'}</p>
          {sub && <p style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{sub}</p>}
          {trend != null && (
            <p style={{ fontSize:12, marginTop:6, fontWeight: 500, color: trend >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {trend >= 0 ? '+`' : '+"'} {Math.abs(trend)}% vs yesterday
            </p>
          )}
        </div>
        {Icon && (
          <div style={{ width:48, height:48, borderRadius:12, background:p.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon size={24} color={p.icon} />
          </div>
        )}
      </div>
    </div>
  )
}
`;

fs.writeFileSync('frontend/src/components/StatCard.jsx', code);
console.log('Updated StatCard.jsx');
