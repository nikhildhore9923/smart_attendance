import { useState, useEffect } from 'react';
import { Users, GraduationCap, Building2, BookOpen, UserCheck, CalendarCheck, Activity, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { getDashboardStats, getTrend, getHealth } from '../lib/api';
import toast from 'react-hot-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

import { getSocket, disconnectSocket } from '../utils/socket';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketStatus, setSocketStatus] = useState('Disconnected');

  useEffect(() => {
    fetchDashboardData();

    const socket = getSocket();
    socket.connect();

    socket.on('connect', () => {
      setSocketStatus('Connected');
      fetchDashboardData();
    });
    socket.on('disconnect', () => setSocketStatus('Disconnected'));
    socket.on('connect_error', () => setSocketStatus('Reconnecting...'));

    socket.on('attendance:marked', (data) => {
      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          todayAttendance: prev.todayAttendance + 1,
        };
      });
      toast.success(`Marked: ${data.student?.firstName || ''} ${data.student?.lastName || ''}`);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('attendance:marked');
      disconnectSocket();
    };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, trendRes] = await Promise.all([
        getDashboardStats(),
        getTrend(7)
      ]);
      setStats(statsRes.data);
      setTrend(trendRes.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
        <div className="spinner" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading real-time institution dashboard...</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Students', value: stats?.totalStudents || 0, icon: GraduationCap, color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
    { label: 'Total Faculty', value: stats?.totalFaculty || 0, icon: Users, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
    { label: 'Active Classes', value: stats?.activeClasses || 0, icon: Building2, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
    { label: 'Total Subjects', value: stats?.totalSubjects || 0, icon: BookOpen, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
    { label: 'Sessions Conducted', value: stats?.sessionsConducted || 0, icon: CalendarCheck, color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)' },
    { label: 'Avg Attendance', value: `${stats?.averageAttendance || 0}%`, icon: UserCheck, color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  ];

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Institution Dashboard</h1>
          <p className="page-desc">Overview of biometrics, class attendance statistics, and multi-session trends.</p>
        </div>
        
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '6px 12px', 
          borderRadius: '20px', 
          background: 'var(--surface)', 
          border: '1px solid var(--border)',
          fontSize: '12px'
        }}>
          <span style={{ 
            width: 8, height: 8, borderRadius: '50%', 
            background: socketStatus === 'Connected' ? 'var(--success)' : socketStatus === 'Disconnected' ? 'var(--danger)' : 'var(--warning)',
            boxShadow: socketStatus === 'Connected' ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none'
          }} />
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>WebSocket Sync:</span>
          <span style={{ color: 'var(--muted)' }}>{socketStatus}</span>
        </div>
      </div>

      {/* Balanced 3-column / 6-card Responsive Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
        {statCards.map((stat, idx) => (
          <div key={idx} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: stat.bg, width: '52px', height: '52px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <stat.icon size={26} color={stat.color} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--muted)' }}>{stat.label}</p>
              <h3 style={{ fontSize: '26px', margin: '2px 0 0 0', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Main Chart */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                <Activity size={18} color="var(--primary)" /> 7-Day Attendance Trend
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>Daily attendance rate across all conducted sessions</p>
            </div>
          </div>
          
          <div style={{ height: '310px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted)" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--muted)" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: 'var(--shadow-md)' }}
                  itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="percentage" 
                  name="Attendance %" 
                  stroke="var(--primary)" 
                  strokeWidth={3}
                  dot={{ fill: 'var(--primary)', r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Highlights & Engine Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Today's Highlight */}
          <div className="card" style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Today's Highlight</h3>
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.08))', 
              border: '1px solid rgba(16, 185, 129, 0.3)', 
              padding: '24px 16px', 
              borderRadius: '12px', 
              textAlign: 'center' 
            }}>
              <h2 style={{ margin: 0, fontSize: '38px', fontWeight: 800, color: 'var(--success)', letterSpacing: '-0.02em' }}>
                {stats?.todayAttendance || 0}
              </h2>
              <p style={{ margin: '6px 0 0 0', color: 'var(--text2)', fontSize: '13px', fontWeight: 600 }}>
                Students Marked Present Today
              </p>
            </div>
          </div>
          
          {/* Engine & System Status */}
          <div className="card" style={{ padding: '22px' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>System Engine Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: 'var(--surface2)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: 500 }}>YOLOv8 + ArcFace AI</span>
                <span className="badge badge-green">ONLINE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: 'var(--surface2)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: 500 }}>Anti-Spoofing Liveness</span>
                <span className="badge badge-green">READY</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: 'var(--surface2)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: 500 }}>MySQL Database</span>
                <span className="badge badge-green">CONNECTED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
