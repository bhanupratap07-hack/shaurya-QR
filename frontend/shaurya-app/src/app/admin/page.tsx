"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}

export default function AdminDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, assignedUsers: 0, unassignedUsers: 0, totalQR: 0, availableQR: 0, assignedQR: 0 });
  const [logs, setLogs] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'team'>('overview');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const volName = getCookie('vol_name');
      if (!volName) { router.replace('/volunteer/login'); return; }
      const { data } = await supabase.from('volunteers').select('role').eq('name', volName).eq('role', 'ADMIN').eq('active', true).maybeSingle();
      if (!data) { router.replace('/volunteer/dashboard'); return; }
      setAuthorized(true); setChecking(false); loadAll();
    };
    verify();
  }, []);

  const loadAll = async () => { setIsLoading(true); await Promise.all([loadStats(), loadLogs(), loadVolunteers()]); setIsLoading(false); };
  const loadStats = async () => {
    const [u, q] = await Promise.all([supabase.from('users').select('status'), supabase.from('qr_codes').select('status')]);
    const users = u.data || [], qrs = q.data || [];
    setStats({ totalUsers: users.length, assignedUsers: users.filter(x => x.status === 'ASSIGNED').length, unassignedUsers: users.filter(x => x.status === 'UNASSIGNED').length, totalQR: qrs.length, availableQR: qrs.filter(x => x.status === 'AVAILABLE').length, assignedQR: qrs.filter(x => x.status === 'ASSIGNED').length });
  };
  const loadLogs = async () => { const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100); setLogs(data || []); };
  const loadVolunteers = async () => { const { data } = await supabase.from('volunteers').select('*').order('created_at', { ascending: true }); setVolunteers(data || []); };
  const toggleVol = async (id: string, active: boolean) => { await supabase.from('volunteers').update({ active: !active }).eq('id', id); loadVolunteers(); };

  const handleLogout = () => {
    document.cookie = "vol_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "vol_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "vol_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/volunteer/login');
  };

  const fmtTime = (ts: string) => {
    const d = new Date(ts), now = new Date(), m = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (m < 1) return 'Just now'; if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const pct = stats.totalUsers > 0 ? Math.round((stats.assignedUsers / stats.totalUsers) * 100) : 0;

  if (checking) return (
    <div className="admin-loading">
      <img src="/shaurya-logo.png" alt="Shaurya" className="admin-loading-logo" />
      <p>Verifying admin access...</p>
    </div>
  );
  if (!authorized) return null;

  return (
    <>
      <style>{`
        .admin-loading { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; background:linear-gradient(160deg,#fdf6f0,#faf5ff); font-family:Inter,sans-serif; }
        .admin-loading-logo { width:48px; margin-bottom:16px; animation:pulse 1.5s infinite; }
        .admin-loading p { color:#9ca3af; font-size:14px; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.95)} }

        .admin-wrap { min-height:100vh; background:linear-gradient(160deg,#fdf6f0 0%,#fef5f0 50%,#faf5ff 100%); font-family:Inter,sans-serif; }

        /* Header */
        .admin-header { background:rgba(255,255,255,.88); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border-bottom:1px solid rgba(249,115,22,.08); padding:12px 16px; position:sticky; top:0; z-index:50; }
        .admin-header-inner { max-width:960px; margin:0 auto; display:flex; justify-content:space-between; align-items:center; }
        .admin-brand { display:flex; align-items:center; gap:10px; }
        .admin-brand-icon { width:36px; height:36px; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(249,115,22,.12); flex-shrink:0; }
        .admin-brand-icon img { width:22px; height:22px; object-fit:contain; }
        .admin-brand h1 { margin:0; font-size:15px; font-weight:800; color:#1f2937; font-family:Outfit,sans-serif; letter-spacing:.3px; }
        .admin-brand p { margin:0; font-size:10px; color:#9ca3af; font-weight:500; letter-spacing:1px; text-transform:uppercase; }
        .admin-header-btns { display:flex; align-items:center; gap:6px; }
        .btn-dash { background:linear-gradient(135deg,#f97316,#d946ef); color:#fff; border:none; padding:7px 14px; border-radius:20px; font-size:11px; font-weight:700; cursor:pointer; white-space:nowrap; }
        .btn-logout { background:#fef2f2; color:#ef4444; border:none; padding:7px 14px; border-radius:20px; font-size:11px; font-weight:700; cursor:pointer; }

        /* Tabs */
        .admin-tabs { background:rgba(255,255,255,.6); backdrop-filter:blur(8px); border-bottom:1px solid rgba(0,0,0,.04); overflow-x:auto; -webkit-overflow-scrolling:touch; }
        .admin-tabs-inner { max-width:960px; margin:0 auto; display:flex; padding:0 8px; }
        .tab-btn { padding:13px 20px; border:none; background:transparent; cursor:pointer; font-size:13px; font-weight:500; color:#9ca3af; border-bottom:2.5px solid transparent; transition:all .2s; white-space:nowrap; font-family:Inter,sans-serif; }
        .tab-btn.active { font-weight:700; color:#f97316; border-bottom-color:#f97316; }

        /* Content */
        .admin-content { max-width:960px; margin:0 auto; padding:20px 16px; }

        /* Stat Cards */
        .stat-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
        .stat-card { border-radius:14px; padding:16px 14px; box-shadow:0 4px 12px rgba(0,0,0,.08); overflow:hidden; }
        .stat-card .label { margin:0 0 2px; font-size:10px; color:rgba(255,255,255,.75); font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
        .stat-card .value { margin:0; font-size:28px; font-weight:800; color:#fff; font-family:Outfit,sans-serif; }

        /* Progress */
        .progress-card { background:#fff; border-radius:16px; padding:18px 16px; margin-bottom:16px; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .progress-top { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px; }
        .progress-top .title { font-size:14px; font-weight:700; color:#1f2937; }
        .progress-top .pct { font-size:22px; font-weight:800; font-family:Outfit,sans-serif; background:linear-gradient(135deg,#f97316,#d946ef); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .progress-bar { width:100%; height:8px; background:#f3f4f6; border-radius:4px; overflow:hidden; }
        .progress-fill { height:100%; background:linear-gradient(90deg,#f97316,#d946ef); border-radius:4px; transition:width .6s ease; }
        .progress-labels { display:flex; justify-content:space-between; margin-top:8px; font-size:11px; color:#9ca3af; }

        /* Two columns on desktop */
        .two-col { display:grid; grid-template-columns:1fr; gap:12px; }

        /* White cards */
        .white-card { background:#fff; border-radius:16px; padding:18px 16px; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .white-card h3 { margin:0 0 14px; font-size:14px; font-weight:700; color:#1f2937; }

        /* Inventory row */
        .inv-row { margin-bottom:14px; }
        .inv-row:last-child { margin-bottom:0; }
        .inv-row-top { display:flex; justify-content:space-between; margin-bottom:4px; }
        .inv-row-top .lbl { font-size:12px; color:#6b7280; }
        .inv-row-top .val { font-size:13px; font-weight:700; color:#1f2937; }
        .inv-bar { width:100%; height:5px; background:#f3f4f6; border-radius:3px; overflow:hidden; }
        .inv-fill { height:100%; border-radius:3px; transition:width .5s ease; }

        /* Activity item */
        .activity-item { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f9fafb; }
        .activity-item:last-child { border-bottom:none; }
        .activity-item .name { margin:0; font-size:13px; color:#1f2937; font-weight:600; }
        .activity-item .meta { margin:1px 0 0; font-size:11px; color:#9ca3af; }
        .activity-item .meta .token { font-family:monospace; color:#f97316; }
        .activity-item .time { font-size:11px; color:#d1d5db; white-space:nowrap; flex-shrink:0; margin-left:8px; }

        /* Log card */
        .log-card { background:#fff; padding:14px 16px; border-radius:12px; box-shadow:0 1px 2px rgba(0,0,0,.03); display:flex; justify-content:space-between; align-items:center; gap:10px; }
        .log-card .info { flex:1; min-width:0; }
        .log-card .info .name { margin:0 0 3px; font-size:13px; color:#1f2937; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .log-card .info .detail { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .log-card .info .detail .by { font-size:11px; color:#9ca3af; }
        .log-card .info .detail .token-badge { font-size:10px; font-family:monospace; color:#f97316; background:#fff7ed; padding:2px 6px; border-radius:4px; font-weight:600; }
        .log-card .time { font-size:11px; color:#d1d5db; white-space:nowrap; flex-shrink:0; }

        /* Vol card */
        .vol-card { background:#fff; padding:14px 16px; border-radius:14px; box-shadow:0 1px 3px rgba(0,0,0,.04); display:flex; justify-content:space-between; align-items:center; gap:10px; }
        .vol-card .vol-info .row1 { display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap; }
        .vol-card .vol-info .vol-name { font-weight:700; color:#1f2937; font-size:14px; }
        .vol-card .vol-info .role-badge { padding:2px 8px; border-radius:10px; font-size:10px; font-weight:700; }
        .role-admin { background:linear-gradient(135deg,#f97316,#d946ef); color:#fff; }
        .role-vol { background:#eff6ff; color:#3b82f6; }
        .vol-card .vol-info .vol-id { margin:0; font-size:12px; color:#9ca3af; }
        .vol-card .vol-info .vol-id code { color:#6b7280; background:#f9fafb; padding:1px 6px; border-radius:4px; font-size:11px; }
        .btn-toggle { padding:7px 16px; border-radius:20px; border:none; font-weight:700; font-size:12px; cursor:pointer; transition:all .2s; }
        .btn-active { background:#ecfdf5; color:#16a34a; }
        .btn-disabled { background:#fef2f2; color:#dc2626; }

        /* Refresh btn */
        .btn-refresh { background:#fff; border:1px solid #f3f4f6; color:#6b7280; padding:8px 24px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,.04); }
        .section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
        .section-header h2 { margin:0; font-size:16px; font-weight:800; color:#1f2937; }
        .section-header h2 span { color:#d1d5db; font-weight:400; font-size:13px; }
        .link-btn { background:transparent; border:none; color:#f97316; font-size:12px; font-weight:600; cursor:pointer; }
        .empty-state { background:#fff; border-radius:16px; padding:48px 16px; text-align:center; box-shadow:0 1px 4px rgba(0,0,0,.04); color:#d1d5db; font-size:14px; }

        /* ─── DESKTOP ─── */
        @media (min-width:768px) {
          .stat-grid { grid-template-columns:repeat(4, 1fr); gap:14px; }
          .stat-card .value { font-size:34px; }
          .stat-card .label { font-size:11px; }
          .two-col { grid-template-columns:1fr 1fr; }
          .admin-content { padding:28px 24px; }
          .progress-card { padding:22px 24px; }
          .white-card { padding:22px 24px; }
          .tab-btn { padding:14px 24px; font-size:14px; }
        }
      `}</style>

      <div className="admin-wrap">
        {/* Header */}
        <header className="admin-header">
          <div className="admin-header-inner">
            <div className="admin-brand">
              <div className="admin-brand-icon"><img src="/shaurya-logo.png" alt="Shaurya" /></div>
              <div>
                <h1>SHAURYA</h1>
                <p>Admin Panel</p>
              </div>
            </div>
            <div className="admin-header-btns">
              <button className="btn-dash" onClick={() => router.push('/volunteer/dashboard')}>Dashboard</button>
              <button className="btn-logout" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <nav className="admin-tabs">
          <div className="admin-tabs-inner">
            <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); loadAll(); }}>Overview</button>
            <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => { setActiveTab('logs'); loadLogs(); }}>Activity Logs</button>
            <button className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`} onClick={() => { setActiveTab('team'); loadVolunteers(); }}>Volunteers</button>
          </div>
        </nav>

        {/* Content */}
        <div className="admin-content">

          {/* === OVERVIEW === */}
          {activeTab === 'overview' && (
            <>
              <div className="stat-grid">
                <div className="stat-card" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                  <p className="label">Registered</p>
                  <p className="value">{stats.totalUsers}</p>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg,#22c55e,#10b981)' }}>
                  <p className="label">Assigned</p>
                  <p className="value">{stats.assignedUsers}</p>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg,#f97316,#f59e0b)' }}>
                  <p className="label">Pending</p>
                  <p className="value">{stats.unassignedUsers}</p>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg,#d946ef,#a855f7)' }}>
                  <p className="label">QR Left</p>
                  <p className="value">{stats.availableQR}</p>
                </div>
              </div>

              <div className="progress-card">
                <div className="progress-top">
                  <span className="title">Distribution Progress</span>
                  <span className="pct">{pct}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="progress-labels">
                  <span>{stats.assignedUsers} distributed</span>
                  <span>{stats.unassignedUsers} remaining</span>
                </div>
              </div>

              <div className="two-col">
                <div className="white-card">
                  <h3>QR Inventory</h3>
                  <div className="inv-row">
                    <div className="inv-row-top"><span className="lbl">Total</span><span className="val">{stats.totalQR}</span></div>
                    <div className="inv-bar"><div className="inv-fill" style={{ width: '100%', background: '#8b5cf6' }} /></div>
                  </div>
                  <div className="inv-row">
                    <div className="inv-row-top"><span className="lbl">Available</span><span className="val">{stats.availableQR}</span></div>
                    <div className="inv-bar"><div className="inv-fill" style={{ width: `${stats.totalQR > 0 ? (stats.availableQR / stats.totalQR) * 100 : 0}%`, background: '#06b6d4' }} /></div>
                  </div>
                  <div className="inv-row">
                    <div className="inv-row-top"><span className="lbl">Distributed</span><span className="val">{stats.assignedQR}</span></div>
                    <div className="inv-bar"><div className="inv-fill" style={{ width: `${stats.totalQR > 0 ? (stats.assignedQR / stats.totalQR) * 100 : 0}%`, background: '#ec4899' }} /></div>
                  </div>
                </div>

                <div className="white-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0 }}>Recent Activity</h3>
                    <button className="link-btn" onClick={() => { setActiveTab('logs'); loadLogs(); }}>View all →</button>
                  </div>
                  {logs.length === 0 ? (
                    <p style={{ color: '#d1d5db', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>No assignments yet</p>
                  ) : (
                    logs.slice(0, 5).map(log => (
                      <div className="activity-item" key={log.id}>
                        <div>
                          <p className="name">{log.user_name}</p>
                          <p className="meta">by {log.volunteer_name} · <span className="token">{log.qr_token}</span></p>
                        </div>
                        <span className="time">{fmtTime(log.created_at)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button className="btn-refresh" onClick={loadAll}>{isLoading ? 'Refreshing...' : '↻ Refresh'}</button>
              </div>
            </>
          )}

          {/* === LOGS === */}
          {activeTab === 'logs' && (
            <>
              <div className="section-header">
                <h2>Activity Log <span>({logs.length})</span></h2>
                <button className="btn-refresh" onClick={loadLogs}>↻ Refresh</button>
              </div>
              {logs.length === 0 ? (
                <div className="empty-state">No assignments recorded yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {logs.map(log => (
                    <div className="log-card" key={log.id}>
                      <div className="info">
                        <p className="name">{log.user_name}</p>
                        <div className="detail">
                          <span className="by">by {log.volunteer_name}</span>
                          <span className="token-badge">{log.qr_token}</span>
                        </div>
                      </div>
                      <span className="time">{fmtTime(log.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* === TEAM === */}
          {activeTab === 'team' && (
            <>
              <div className="section-header">
                <h2>Volunteers</h2>
                <button className="btn-refresh" onClick={loadVolunteers}>↻ Refresh</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {volunteers.map(vol => (
                  <div className="vol-card" key={vol.id}>
                    <div className="vol-info">
                      <div className="row1">
                        <span className="vol-name">{vol.name}</span>
                        <span className={`role-badge ${vol.role === 'ADMIN' ? 'role-admin' : 'role-vol'}`}>{vol.role}</span>
                      </div>
                      <p className="vol-id">ID: <code>{vol.username}</code></p>
                    </div>
                    <button className={`btn-toggle ${vol.active ? 'btn-active' : 'btn-disabled'}`} onClick={() => toggleVol(vol.id, vol.active)}>
                      {vol.active ? '● Active' : '○ Disabled'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
