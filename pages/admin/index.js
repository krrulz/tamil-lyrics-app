// pages/admin/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAdminAuth } from '../../lib/useAdmin.js';

export default function AdminDashboard() {
  const { auth, loading, apiFetch } = useAdminAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [showPwForm, setShowPwForm] = useState(false);
  const [pw, setPw] = useState({ newPw: '', confirmPw: '' });
  const [pwMsg, setPwMsg] = useState('');

  useEffect(() => {
    if (!loading && !auth) router.replace('/admin/login');
  }, [auth, loading]);

  useEffect(() => {
    if (!auth) return;
    apiFetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => setStats(d.summary))
      .catch(() => {});
  }, [auth]);

  if (loading || !auth) return null;

  const cards = [
    { href: '/admin/suggestions', icon: '💡', label: 'Suggestions', desc: 'Review song suggestions from users', color: '#6C8EFF' },
    { href: '/admin/songs', icon: '🎵', label: 'Songs', desc: 'Browse, edit lyrics and delete songs', color: '#F472B6' },
    { href: '/admin/playlists', icon: '🎶', label: 'Playlists', desc: 'Manage song playlists', color: '#34D399' },
    { href: '/admin/polls', icon: '🗳️', label: 'Polls', desc: 'Create and manage voting polls', color: '#F59E0B' },
    { href: '/admin/topics', icon: '📚', label: 'Topics', desc: 'Build and publish topic collections', color: '#F87171' },
    { href: '/admin/analytics', icon: '📊', label: 'Analytics', desc: 'Vote stats and insights', color: '#A78BFA' },
    { href: '/admin/access', icon: '🔑', label: 'Access', desc: 'Approve admin access requests', color: '#FB923C' },
    ...(process.env.NEXT_PUBLIC_TENANT_ID === 'group2' ? [
      { href: '/admin/game', icon: '🎵', label: 'Guess the Song', desc: 'Manage game interludes and spin wheel', color: '#22c55e' },
    ] : []),
  ];

  return (
    <>
      <Head><title>Admin Dashboard — Tamil Lyrics</title></Head>
      <style>{`
        body { background: var(--admin-bg); }
        .wrap { display: flex; min-height: 100vh; }
        .main { flex: 1; padding: 2rem; max-width: 960px; }
        .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .topbar h1 { color: var(--admin-text); font-size: 1.5rem; font-weight: 600; }
        .topbar-right { display: flex; align-items: center; gap: 1rem; }
        .email { color: var(--admin-muted); font-size: 0.82rem; }
        .logout-btn { font-size: 0.82rem; color: var(--admin-muted); background: none; border: 1px solid var(--admin-border); padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; }
        .logout-btn:hover { color: var(--admin-text); }
        .home-link { font-size: 0.82rem; color: var(--admin-accent); text-decoration: none; }
        .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 2rem; }
        .stat { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 10px; padding: 1rem; }
        .stat-num { font-size: 2rem; font-weight: 700; color: var(--admin-text); }
        .stat-lbl { font-size: 0.72rem; color: var(--admin-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
        .card { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 12px; padding: 1.5rem; text-decoration: none; display: block; transition: border-color 0.15s; }
        .card:hover { border-color: var(--admin-accent); }
        .card-icon { font-size: 1.8rem; margin-bottom: 0.75rem; }
        .card-title { color: var(--admin-text); font-size: 1rem; font-weight: 600; margin-bottom: 0.3rem; }
        .card-desc { color: var(--admin-muted); font-size: 0.82rem; line-height: 1.5; }
        .card-arrow { color: var(--admin-accent); font-size: 0.8rem; margin-top: 0.75rem; display: block; }
        .pw-section { margin-top: 2rem; background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 10px; padding: 1.25rem; }
        .pw-title { color: var(--admin-text); font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; }
        .pw-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .pw-input { flex: 1; min-width: 160px; padding: 0.45rem 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid var(--admin-border); border-radius: 6px; color: var(--admin-text); font-size: 0.85rem; outline: none; }
        .pw-input:focus { border-color: var(--admin-accent); }
        .pw-btn { padding: 0.45rem 1rem; background: var(--admin-accent); color: #fff; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
        .pw-btn-sec { padding: 0.45rem 1rem; background: none; color: var(--admin-muted); border: 1px solid var(--admin-border); border-radius: 6px; font-size: 0.85rem; cursor: pointer; }
        .pw-msg { font-size: 0.82rem; margin-top: 8px; }
        .pw-msg.ok { color: var(--success); } .pw-msg.err { color: var(--error); }
        .change-pw-link { font-size: 0.82rem; color: var(--admin-muted); background: none; border: 1px solid var(--admin-border); padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; }
        .change-pw-link:hover { color: var(--admin-text); }
        @media (max-width: 768px) {
          .main { padding: 1.25rem; }
          .topbar { flex-wrap: wrap; gap: 8px; margin-bottom: 1.25rem; }
          .topbar h1 { font-size: 1.2rem; width: 100%; }
          .topbar-right { flex-wrap: wrap; gap: 6px; }
          .email { display: none; }
          .grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
          .card { padding: 1.1rem; }
          .stats-row { gap: 8px; }
          .stat { padding: 0.75rem; }
          .stat-num { font-size: 1.6rem; }
          .pw-row { flex-direction: column; }
          .pw-input { min-width: unset; }
        }
        @media (max-width: 480px) {
          .main { padding: 1rem; }
          .grid { grid-template-columns: 1fr 1fr; }
          .stats-row { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
      <div className="wrap">
        <div className="main">
          <div className="topbar">
            <h1>Admin Dashboard</h1>
            <div className="topbar-right">
              <Link href="/" className="home-link">← Public site</Link>
              <span className="email">{auth.user.email}</span>
              <button className="change-pw-link" onClick={() => { setShowPwForm(p => !p); setPwMsg(''); }}>🔑 Change password</button>
              <button className="logout-btn" onClick={async () => { const { getAuth } = await import('firebase/auth'); await getAuth().signOut(); router.replace('/admin/login'); }}>Sign out</button>
            </div>
          </div>

          {stats && (
            <div className="stats-row">
              {[
                { num: stats.totalVotes, lbl: 'Total votes' },
                { num: stats.uniqueVoters, lbl: 'Unique voters' },
                { num: stats.activePolls, lbl: 'Active polls' },
                { num: stats.totalTopics, lbl: 'Topics' },
              ].map((s, i) => (
                <div key={i} className="stat">
                  <div className="stat-num">{s.num ?? '—'}</div>
                  <div className="stat-lbl">{s.lbl}</div>
                </div>
              ))}
            </div>
          )}

          {showPwForm && (
            <div className="pw-section">
              <div className="pw-title">Change Password</div>
              <div className="pw-row">
                <input className="pw-input" type="password" placeholder="New password (min 8 chars)" value={pw.newPw} onChange={e => setPw(p => ({ ...p, newPw: e.target.value }))} />
                <input className="pw-input" type="password" placeholder="Confirm new password" value={pw.confirmPw} onChange={e => setPw(p => ({ ...p, confirmPw: e.target.value }))} />
                <button className="pw-btn" onClick={async () => {
                  if (pw.newPw.length < 8) return setPwMsg('err:Password must be at least 8 characters');
                  if (pw.newPw !== pw.confirmPw) return setPwMsg('err:Passwords do not match');
                  setPwMsg('');
                  const { getAuth } = await import('firebase/auth');
                  const idToken = await getAuth().currentUser?.getIdToken();
                  const res = await apiFetch('/api/admin/change-password', { method: 'POST', body: JSON.stringify({ idToken, newPassword: pw.newPw }) });
                  const data = await res.json();
                  if (res.ok) { setPwMsg('ok:Password changed successfully'); setPw({ newPw: '', confirmPw: '' }); setTimeout(() => setShowPwForm(false), 2000); }
                  else setPwMsg('err:' + (data.error || 'Failed'));
                }}>Save</button>
                <button className="pw-btn-sec" onClick={() => { setShowPwForm(false); setPwMsg(''); setPw({ newPw: '', confirmPw: '' }); }}>Cancel</button>
              </div>
              {pwMsg && <div className={`pw-msg ${pwMsg.startsWith('ok') ? 'ok' : 'err'}`}>{pwMsg.replace(/^(ok|err):/, '')}</div>}
            </div>
          )}

          <div className="grid">
            {cards.map(c => (
              <Link key={c.href} href={c.href} className="card">
                <div className="card-icon">{c.icon}</div>
                <div className="card-title">{c.label}</div>
                <div className="card-desc">{c.desc}</div>
                <span className="card-arrow">Open →</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
